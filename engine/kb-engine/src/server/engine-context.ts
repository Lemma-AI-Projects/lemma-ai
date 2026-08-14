/**
 * kb-engine K1：引擎完整上下文初始化。
 *
 * 等价 initializeCore 的最小集（跳过裁剪项：同步/ETAPI/演示库/消息/翻译）。
 * 序列（顺序敏感）：
 *   1. initContext —— SqlService/事件依赖 execution context（必须最先）
 *   2. initPlatform(桩) —— migrateIfNecessary 的 crash 兜底
 *   3. initLog(LogService) —— 引擎日志
 *   4. initBackup(桩) —— 启动调度钩子（备份裁剪，桩化）
 *   5. initSql(SqlService) —— 触发 sql_init.initializeDb → initDbConnection
 *      （sqlite_master 视图 + options.initialized 种子 → isDbInitialized=true →
 *       migrate 跳过（dbVersion=240）→ param_list TEMP + user_data DDL → dbReady）
 *   6. await dbReady —— initDbConnection 完成
 *   7. becca_loader.load() —— Becca 从 PG 全量加载（笔记/分支/属性/选项）
 *
 * 验证目标（K1 验收）：Becca 加载后 notes/branches/attributes 有数据；
 * 写后 Becca 缓存一致（BNote.save 同步更新内存缓存）；现有 31 测试不回归。
 */
import type { PgProvider } from '../db/pg-provider.ts'
import { initContext } from '../../packages/core/src/services/context.ts'
import { initPlatform, type PlatformProvider } from '../../packages/core/src/services/platform.ts'
import LogService, { initLog } from '../../packages/core/src/services/log.ts'
import BackupService, { initBackup, type BackupOptionsService } from '../../packages/core/src/services/backup.ts'
import {
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomFillSync,
  scrypt as scryptCb,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import { initSql } from '../../packages/core/src/services/sql/index.ts'
import { SqlService } from '../../packages/core/src/services/sql/sql.ts'
import { initTranslations } from '../../packages/core/src/services/i18n.ts'
import { initCrypto, type CryptoProvider } from '../../packages/core/src/services/encryption/crypto.ts'
import { dbReady } from '../../packages/core/src/services/sql_init.ts'
import { beccaLoaded } from '../../packages/core/src/becca/becca_loader.ts'
import becca from '../../packages/core/src/becca/becca.ts'

/** Platform 桩：迁移版本异常时 crash（console + exit）；其余按环境直通 */
const platformStub: PlatformProvider = {
  crash(message: string): void {
    console.error(`[kb-engine] fatal: ${message}`)
    process.exit(1)
  },
  getEnv(): string | undefined {
    return undefined
  },
  isElectron: false,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
}

/** Backup 桩：备份/恢复已裁剪（P0 裁剪清单），方法 no-op 保持接口兼容 */
class BackupStub extends BackupService {
  constructor() {
    const optionsStub: BackupOptionsService = {
      getOption(): string {
        return ''
      },
      getOptionOrNull(): string | null {
        return null
      },
      getOptionBool(): boolean {
        return false
      },
      setOption(): void {},
    }
    super(optionsStub)
  }

  async backupNow(): Promise<string> {
    return ''
  }

  scheduleBackups(): void {}

  async getExistingBackups() {
    return []
  }

  async getBackupContent(): Promise<Uint8Array | null> {
    return null
  }
}

/** Crypto 桩：Node 标准库实现（引擎 entity_changes hash 等依赖） */
const scrypt = promisify(scryptCb) as (
    password: string | Uint8Array,
    salt: string | Uint8Array,
    keyLength: number,
    options?: object,
  ) => Promise<Uint8Array>
const cryptoStub: CryptoProvider = {
  createHash: (algorithm, content) =>
    createHash(algorithm).update(content as never).digest() as Uint8Array,
  randomBytes: (size) => randomBytes(size) as Uint8Array,
  randomString: (length) =>
    randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length),
  createCipheriv: (algorithm, key, iv) =>
    createCipheriv(algorithm, key as never, iv as never),
  createDecipheriv: (algorithm, key, iv) =>
    createDecipheriv(algorithm, key as never, iv as never),
  hmac: (secret, value) =>
    createHmac('sha256', secret as never).update(value as never).digest('hex'),
  scrypt: (password, salt, keyLength, options) =>
    scrypt(password as never, salt as never, keyLength, options as never) as Promise<Uint8Array>,
  constantTimeCompare: (a, b) => timingSafeEqual(a as never, b as never),
  base64Encode: (bytes) => Buffer.from(bytes as never).toString('base64'),
  base64Decode: (base64) => Buffer.from(base64, 'base64') as Uint8Array,
}

export interface EngineContext {
  sql: SqlService
  becca: typeof becca
}

export async function initEngineContext(opts: {
  provider: PgProvider
}): Promise<EngineContext> {
  // 1-4. 基础单例（顺序敏感）
  initContext({ init: (f) => f(), get: () => undefined, set: () => {}, reset: () => {} })
  initPlatform(platformStub)
  const log = new LogService()
  initLog(log)
  initBackup(new BackupStub())
  initCrypto(cryptoStub)

  // 5. 翻译初始化（引擎 keyboard_actions/options_init 依赖 t()；裁剪翻译资源 → 空资源桩，
  //    i18next 无资源时 t() 返回 key 本身（非空），check 通过）
  await initTranslations(async (i18nextInstance: { init: (opts: object) => Promise<unknown> }) => {
    await i18nextInstance.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: {} },
      returnNull: false,
    })
  })

  // 6. SQL 初始化（触发引擎的库就绪流程）
  const sql = new SqlService(
    {
      provider: opts.provider,
      isReadOnly: false,
      onTransactionCommit: () => {},
      onTransactionRollback: () => {},
    },
    log,
  )
  await initSql(sql)

  // 7. 等待引擎库就绪（param_list / user_data DDL 完成）
  await dbReady

  // 8. Becca 全量加载（becca_loader 模块顶层 promise：load + initStartupOptions）
  await beccaLoaded

  return { sql, becca }
}
