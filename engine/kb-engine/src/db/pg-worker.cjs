/**
 * PG worker —— kb-engine P0-2 同步桥的异步执行端。
 *
 * 主线程（PgSyncBridge）用 SharedArrayBuffer + Atomics.wait 同步等待结果，
 * 本 worker 独立线程持有 PG 连接，串行执行查询并把结果写回 SAB。
 *
 * 本文件刻意保持纯 CJS（Node 原生 Worker 加载 CJS 无模块格式问题；
 * TS 的 new Worker 需要 esbuild 预编译，徒增复杂度）。
 *
 * 协议（与 pg-sync-bridge.ts 对齐）：
 *   control = Int32Array(4)：[0] 状态 0=idle 1=busy 2=done 3=error；[1] payload 字节长
 *   payload = Uint8Array：响应 JSON（Buffer → { __pg_buf: base64 }）
 */
const { parentPort, workerData } = require('worker_threads');

const SQLITE_TO_PG_REWRITES = [
  // transactionalAsync 用手动 BEGIN IMMEDIATE（SQLite 语法），PG 不支持 IMMEDIATE
  [/^BEGIN\s+IMMEDIATE/i, 'BEGIN'],
];

/**
 * 引擎 initDbConnection 每次启动会重建 user_data（SQLite 原样 DDL：
 * DEFAULT "false" 双引号字符串在 PG 是标识符引用——非法；且业务连接角色
 * 无 schema CREATE 权限，即使表已存在也 permission denied）。
 * user_data 已由 001 迁移建好（PG 版）——该 DDL no-op 吞掉，表存在性由 001 保证。
 */
function noopUserDataDdl(sql) {
  if (/^\s*CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?"?user_data"?/i.test(sql)) {
    return 'SELECT 1';
  }
  return sql;
}

function rewriteKnownDialect(sql) {
  let out = noopUserDataDdl(sql);
  // options 表复合主键 (user_id, name)：引擎 SqlService.upsert 生成
  // ON CONFLICT (name)（假设单列 PK）在 PG 不匹配唯一约束 → 补全为完整目标。
  // 插入行 user_id 走动态默认（current_setting）→ 命中当前用户的配置行，语义正确。
  if (/^\s*INSERT\s+INTO\s+options\b/i.test(out)) {
    out = out.replace(/ON\s+CONFLICT\s*\(\s*name\s*\)/gi, 'ON CONFLICT (user_id, name)');
  }
  for (const [re, rep] of SQLITE_TO_PG_REWRITES) {
    out = out.replace(re, rep);
  }
  return out;
}

/** SQLite → PG：`?` → `$n`、`:paramN` → `$N`、INSERT OR REPLACE 标记（upsert 重写见下） */
function convertQuery(sql, params) {
  const upsertMatch = /^INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)/i.exec(sql);
  const upsertTable = upsertMatch ? upsertMatch[1] : null;
  const upsertColumns = upsertTable ? extractInsertColumns(sql) : null;

  if (Array.isArray(params)) {
    if (/:param\d+/.test(sql)) {
      throw new Error(`[pg-dialect] named placeholder in positional query: ${sql.slice(0, 120)}`);
    }
    let counter = 0;
    return { sql: rewrite(sql, () => '$' + ++counter), params, upsertTable, upsertColumns };
  }

  // named 参数对象：:paramN（SqlService 的 ??? 展开）与 @identifier（upsert）都支持
  const keys = Object.keys(params || {});
  const entries =
    keys.filter((k) => /^param\d+$/.test(k))
        .sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10));
  const entriesList = entries.length > 0 ? entries : keys;
  const idxByFinal = new Map(entriesList.map((k, i) => [k, i + 1]));
  const sqlOut = rewrite(sql, (tok) => {
    const m = /^:param(\d+)$/.exec(tok);
    if (m) return '$' + parseInt(m[1], 10);
    const at = /^@(\w+)$/.exec(tok);
    if (at) {
      const i = idxByFinal.get(at[1]);
      if (!i) throw new Error(`[pg-dialect] unknown named param @${at[1]}: ${sql.slice(0, 120)}`);
      return '$' + i;
    }
    if (tok === '?') throw new Error(`[pg-dialect] positional placeholder in named query: ${sql.slice(0, 120)}`);
    return tok;
  });
  return { sql: sqlOut, params: entriesList.map((k) => params[k]), upsertTable, upsertColumns };
}

function extractInsertColumns(sql) {
  const m = /^INSERT\s+OR\s+REPLACE\s+INTO\s+\w+\s*\(([^)]*)\)/i.exec(sql);
  if (!m) return null;
  return m[1].split(',').map((c) => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

/** 占位符 token 重写（跳过字符串/标识符/注释）——与 sql-dialect.ts 逻辑一致 */
function rewrite(sql, replacer) {
  const out = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else break; }
        else j += 1;
      }
      out.push(sql.slice(i, j + 1));
      i = j + 1;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < n && sql[j] !== '"') j += 1;
      out.push(sql.slice(i, j + 1));
      i = j + 1;
    } else if (ch === '`') {
      // SQLite 反引号标识符（引擎 DDL 用 `paramId` 等）→ 无引号（PG 折叠小写）。
      // 不能转双引号：引号=大小写敏感标识符，与引擎查询的无引号小写折叠断裂
      // （建表 "paramId" 后查询 paramid 报 column not exist）。
      let j = i + 1;
      while (j < n && sql[j] !== '`') j += 1;
      out.push(sql.slice(i + 1, j));
      i = j + 1;
    } else if (ch === '-' && sql[i + 1] === '-') {
      let j = i + 2;
      while (j < n && sql[j] !== '\n') j += 1;
      out.push(sql.slice(i, j));
      i = j;
    } else if (ch === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(sql[j] === '*' && sql[j + 1] === '/')) j += 1;
      out.push(sql.slice(i, j + 2));
      i = j + 2;
    } else if (ch === '?') {
      out.push(replacer('?'));
      i += 1;
    } else if (ch === ':' && /^:param\d+/.test(sql.slice(i))) {
      const m = /^:param\d+/.exec(sql.slice(i));
      out.push(replacer(m[0]));
      i += m[0].length;
    } else if (ch === '@' && /^@\w+/.test(sql.slice(i))) {
      // SqlService.upsert 的 @identifier 命名参数（如 @noteId）→ replacer（$n）
      const m = /^@\w+/.exec(sql.slice(i));
      out.push(replacer(m[0]));
      i += m[0].length;
    } else {
      let j = i;
      // 特殊字符集合必须包含反引号（否则反引号被当普通文本吞掉，转换分支永不触发）
      // 同样包含 @（否则 @identifier 参数被当普通文本吞掉）
      while (j < n && !'?@"\'`:/-'.includes(sql[j])) j += 1;
      out.push(sql.slice(i, j));
      i = j;
    }
  }
  return out.join('');
}

// ── 连接初始化 ──────────────────────────────────────────────────────────────
// 用单个 Client 而非 Pool：DatabaseProvider 是同步语义，桥串行执行；
// 单连接保证 BEGIN/COMMIT/ROLLBACK 必然落在同一连接（Pool 的多连接会把
// 事务内语句分散到不同连接，导致事务失效——pg-mem 的 Pool 尤其不可靠）。
//
// 三种后端：
//   - 生产：node-postgres Client（真实 Supabase PG）
//   - pg-mem：内存模拟（接口兼容 node-postgres，但递归 CTE/RLS/ROLLBACK 数据级
//     等真 PG 语义不支持——用于快速单测）
//   - pglite：WASM 真 PostgreSQL（PostgreSQL 编译到 WASM）——真 PG 语义，
//     用于验证 pg-mem 覆盖不到的能力（RLS/递归 CTE/回滚/TEMP）。连接角色是
//     超级用户（bypass RLS），初始化链会 SET ROLE lemma_kb（非超级用户）使
//     RLS 生效——与 Supabase 部署用 authenticated 连接语义一致。
let client;
let usePglite = false;
if (workerData.usePglite) {
  usePglite = true; // 真正实例化在初始化链（需 await import ESM）
} else if (workerData.usePgMem) {
  // 测试模式：pg-mem 内存模拟（接口兼容 node-postgres）
  const { newDb, DataType } = require('pg-mem');
  const db = newDb();
  // pg-mem 不实现 current_setting（001 的 user_id 动态默认值依赖）——注册：
  // 测试语义下无会话变量 → 返回空串（COALESCE 兜底为系统行）
  try {
    db.public.registerFunction({
      name: 'current_setting',
      args: [DataType.text, DataType.bool],
      returns: DataType.text,
      implementation: () => '',
    });
  } catch {}
  const adapter = db.adapters.createPg();
  client = new adapter.Client({});
} else {
  const pg = require('pg');
  // Trilium 用毫秒时间戳存日期（BIGINT）；node-pg 对 int8 默认返回 string，
  // 引擎期望 number（算术/比较）——统一解析为 Number（JS 安全整数上限 2^53 远大于毫秒时间戳）。
  pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
  client = new pg.Client({ connectionString: workerData.connectionString });
}

const control = new Int32Array(workerData.control, 0, 4);
const payload = new Uint8Array(workerData.control, 16, workerData.payloadCapacity);

// 事务状态跟踪（BEGIN/COMMIT/ROLLBACK 由 SQL 或 begin/commit/rollback 命令触发）
let inTransaction = false;

// ── 列名还原 ────────────────────────────────────────────────────────────────
// Trilium 列名是 camelCase（SQLite 保留定义大小写），而 PG 无引号列名一律折叠小写
// （noteId → noteid），node-pg 返回小写键 → 引擎 `row.noteId` 访问全部失效。
// 解决：静态列名映射（从 Trilium schema.sql 提取，小写 → 原样），结果行键按映射还原。
// 映射文件为 kb-engine 内置资产；测试可注入覆盖（pg-mem 场景列名自定）。
let columnNameMap = { ...(workerData.columnNames || {}) };
if (Object.keys(columnNameMap).length === 0) {
  try {
    // eslint-disable-next-line n/no-missing-require
    columnNameMap = require('./trilium-column-names.json');
  } catch {
    columnNameMap = {}; // 无映射时保持 pg 返回键（调用方自行适配）
  }
}
function restoreRowKeys(row) {
  if (Object.keys(columnNameMap).length === 0) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[columnNameMap[k] ?? k] = v;
  }
  return out;
}

/** 表主键缓存：INSERT OR REPLACE → ON CONFLICT(pk) DO UPDATE、INSERT → RETURNING pk 需要 */
const pkCache = new Map();
// 显式注入的主键配置（真 PG 自动探测；pg-mem 等模拟环境不支持系统表查询时必须显式指定）
if (workerData.primaryKeys) {
  for (const [table, pk] of Object.entries(workerData.primaryKeys)) {
    pkCache.set(table, pk);
  }
}
async function getPrimaryKey(table) {
  if (pkCache.has(table)) return pkCache.get(table);
  // 真 PG：pg_index 系统表（快）；pg-mem 等模拟环境不支持时回退 information_schema
  const queries = [
    `SELECT a.attname FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`,
    `SELECT kcu.column_name FROM information_schema.key_column_usage kcu
     WHERE kcu.table_name = $1 AND kcu.constraint_name LIKE '%pkey'
     ORDER BY kcu.ordinal_position LIMIT 1`,
  ];
  for (const q of queries) {
    try {
      const res = await client.query(q, [table]);
      if (res.rows.length) {
        const pk = res.rows[0].attname || res.rows[0].column_name;
        pkCache.set(table, pk);
        return pk;
      }
    } catch {
      // 继续尝试下一个查询
    }
  }
  pkCache.set(table, null);
  return null;
}

/** 冲突目标缓存：INSERT OR REPLACE → ON CONFLICT（主键或唯一索引） */
const conflictTargetCache = new Map(); // table -> string[] | null
if (workerData.conflictTargets) {
  for (const [t, cols] of Object.entries(workerData.conflictTargets)) {
    conflictTargetCache.set(t, cols);
  }
}
async function getConflictTarget(table) {
  if (conflictTargetCache.has(table)) return conflictTargetCache.get(table);
  // 真 PG：唯一索引优先于主键（SQLite OR REPLACE 对任一唯一约束冲突都触发）
  try {
    const res = await client.query(
      `SELECT a.attname FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisunique
       ORDER BY i.indisprimary DESC, a.attnum`,
      [table],
    );
    const cols = res.rows.map((r) => r.attname);
    conflictTargetCache.set(table, cols.length ? cols : null);
    return cols.length ? cols : null;
  } catch {
    conflictTargetCache.set(table, null);
    return null;
  }
}

/**
 * INSERT OR REPLACE → ON CONFLICT (target) DO UPDATE SET ... RETURNING pk。
 * 冲突目标 = 唯一索引（entity_changes 的 UNIQUE(entityName, entityId) 触发，
 * 而非主键 id）；RETURNING 用自增主键（lastInsertRowid 语义）。
 */
async function rewriteUpsert(converted) {
  const { sql, params, upsertTable, upsertColumns } = converted;
  const target = await getConflictTarget(upsertTable);
  if (!target || target.length === 0 || !upsertColumns ||
      !upsertColumns.some((c) => target.includes(c))) {
    // 冲突目标不可得/不在插入列：SQLite OR REPLACE 在此情形本就是纯插入
    // （无冲突可触发）→ 退化为普通 INSERT。
    return { sql: sql.replace(/^INSERT\s+OR\s+REPLACE/i, 'INSERT'), params };
  }
  const conflictCols = target.join(', ');
  const setClause = upsertColumns
    .filter((c) => !target.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');
  const pk = await getPrimaryKey(upsertTable);
  const returning = pk || target[0];
  const newSql = `${sql
    .replace(/^INSERT\s+OR\s+REPLACE/i, 'INSERT')
    .replace(/\s*;?\s*$/, '')} ON CONFLICT (${conflictCols}) DO UPDATE SET ${setClause} RETURNING ${returning}`;
  return { sql: newSql, params };
}

// ── 响应序列化 ──────────────────────────────────────────────────────────────
function writeResult(state, value) {
  const json = JSON.stringify(value, (k, v) => {
    if (Buffer.isBuffer(v)) return { __pg_buf: v.toString('base64') };
    if (typeof v === 'bigint') return Number(v);
    return v;
  });
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > payload.length) {
    const err = JSON.stringify({ message: `[pg-worker] result too large (${bytes.length} > ${payload.length} bytes)` });
    const errBytes = new TextEncoder().encode(err);
    payload.set(errBytes);
    Atomics.store(control, 1, errBytes.length);
    Atomics.store(control, 0, 3);
    return;
  }
  payload.set(bytes);
  Atomics.store(control, 1, bytes.length);
  Atomics.store(control, 0, state);
}

// ── 消息循环 ────────────────────────────────────────────────────────────────
// 初始化完成（连接 + bootstrapSql）后才注册消息处理器：保证 pg-mem 测试场景下
// 建表先于任何查询；主线程的 postMessage 在 ready 前会自然排队。
async function handleMessage(msg) {
  Atomics.store(control, 0, 1); // busy
  try {
    let result;
    switch (msg.kind) {
      case 'begin': {
        await client.query('BEGIN');
        inTransaction = true;
        result = { ok: true };
        break;
      }
      case 'commit': {
        await client.query('COMMIT');
        inTransaction = false;
        result = { ok: true };
        break;
      }
      case 'rollback': {
        await client.query('ROLLBACK');
        inTransaction = false;
        result = { ok: true };
        break;
      }
      case 'inTransaction': {
        result = { inTransaction };
        break;
      }
      case 'set_user_id': {
        // RLS 租户隔离：会话级 app.user_id（同步桥串行 → 请求级设置/重置安全）
        await client.query(`SELECT set_config('app.user_id', $1, false)`, [msg.userId ?? '']);
        result = { ok: true, userId: msg.userId ?? '' };
        break;
      }
      case 'ping': {
        result = { ok: true, inTransaction };
        break;
      }
      default: {
        // query kinds: run / get / all / exec
        const converted = convertQuery(rewriteKnownDialect(msg.sql), msg.params);
        let sql = converted.sql;
        let params = converted.params;
        let returningPk = null;
        if (converted.upsertTable) {
          const r = await rewriteUpsert(converted);
          sql = r.sql;
          params = r.params;
        } else if (msg.kind === 'run' || msg.kind === 'exec') {
          // 普通 INSERT：附加 RETURNING pk 以提供 lastInsertRowid（better-sqlite3 语义）
          returningPk = await tryAttachReturning(sql, converted);
          if (returningPk) sql = `${sql.replace(/\s*;?\s*$/, '')} RETURNING ${returningPk}`;
        }
        const res = await client.query(sql, params);

        if (/^\s*BEGIN\b/i.test(msg.sql)) inTransaction = true;
        else if (/^\s*(COMMIT|ROLLBACK|END)\b/i.test(msg.sql)) inTransaction = false;

        if (msg.kind === 'run' || msg.kind === 'exec') {
          let lastInsertRowid = 0;
          if (res.rows && res.rows.length) {
            const last = restoreRowKeys(res.rows[res.rows.length - 1]);
            const keys = Object.keys(last);
            if (keys.length) lastInsertRowid = Number(last[keys[0]]) || 0;
          }
          // pglite 返回 affectedRows 而非 rowCount（node-postgres 语义差异）
          result = { changes: res.rowCount ?? res.affectedRows ?? 0, lastInsertRowid };
        } else if (msg.kind === 'get') {
          result = res.rows[0] ? restoreRowKeys(res.rows[0]) : null;
        } else {
          result = res.rows.map(restoreRowKeys);
        }
      }
    }
    writeResult(2, result);
  } catch (e) {
    writeResult(3, { message: String((e && e.message) || e) });
  }
  Atomics.notify(control, 0);
}

// 初始化链：连接（+bootstrapSql）→ 注册消息处理。
// bootstrapSql = 测试引导，把 pg-mem/pglite 库初始化为迁移产物（与 db/migrations/001 一致）；
// 真实部署的建表走 db/migrate.ts（独立连接），不经由 provider。
if (parentPort) {
(async () => {
  try {
    if (usePglite) {
      // WASM 真 PostgreSQL：动态 import（ESM 包，CJS worker 需 await）
      const { PGlite } = await import('@electric-sql/pglite');
      const db = new PGlite();
      client = {
        query: (sql, params) => db.query(sql, params ?? []),
        exec: (sql) => db.exec(sql),
        close: () => db.close(),
      };
    }
    await client.connect?.();
    if (workerData.bootstrapSql) {
      // 多语句引导（001 是整文件多语句；pg-mem query 容忍，pglite 需 exec）
      if (usePglite) await client.exec(workerData.bootstrapSql);
      else await client.query(workerData.bootstrapSql);
    }
    if (usePglite) {
      // 租户验证角色：pglite 连接是超级用户（bypass RLS）——SET ROLE 非超级用户
      // 使 RLS 生效（与 Supabase 部署用 authenticated 连接语义一致）。
      await client.exec('CREATE ROLE lemma_kb NOLOGIN');
      await client.exec('GRANT USAGE ON SCHEMA public TO lemma_kb');
      await client.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lemma_kb');
      await client.exec('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lemma_kb');
      await client.exec('SET ROLE lemma_kb');
    }
  } catch (e) {
    console.error('[pg-worker] init failed:', e.message);
  }
  parentPort.on('message', handleMessage);
})();
}

/**
 * 普通 INSERT 附加 RETURNING pk（提供 lastInsertRowid）。
 * 主键不可得（无主键表/查询失败）→ 返回 null（lastInsertRowid 保持 0）。
 */
async function tryAttachReturning(sql, converted) {
  if (!/^\s*INSERT\s+(?!OR\s+REPLACE)/i.test(sql)) return null;
  const pk = await getPrimaryKey(converted.upsertTable || extractInsertTable(sql));
  return pk;
}

function extractInsertTable(sql) {
  const m = /^\s*INSERT\s+INTO\s+(\w+)/i.exec(sql);
  return m ? m[1] : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { noopUserDataDdl, rewriteKnownDialect, convertQuery };
}
