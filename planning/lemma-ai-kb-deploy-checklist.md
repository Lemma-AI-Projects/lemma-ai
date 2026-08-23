# kb-engine Supabase 部署检查清单

> 状态：2026-08-15 · 用途：真 Supabase 环境部署前的必检项 + 执行步骤
> **本机真 Supabase 验证已完成（本地 supabase start + lemma-kb 角色）**：verify 全绿、
> 侧车全量启动（Becca 加载真库）、写路径闭环（建/改/存/搜）、网关 JWT 全链路、
> RLS 租户隔离（A 树含自己笔记，B 仅 root）。真验证新增部署要点见下。

## 一、Supabase 环境准备

- [ ] Supabase 项目就绪（云端或本地 `supabase start`）
- [ ] 获取 PG 连接串（Dashboard → Settings → Database → Connection string）
- [ ] **业务连接角色**：新建/使用**无 BYPASSRLS** 的角色（authenticated 或自定义 `lemma_kb`）
  - ⚠️ 不能用 postgres / service_role（绕过 RLS → 租户隔离失效）
  - 建角色参考：
    ```sql
    create role lemma_kb login password '...';
    grant usage on schema public to lemma_kb;
    grant select, insert, update, delete on all tables in schema public to lemma_kb;
    grant usage, select on all sequences in schema public to lemma_kb;
    ```
- [ ] `KB_PG_CONNECTION_STRING` = `postgresql://lemma_kb:...@host:5432/postgres`

## 二、迁移 + 验证（一次跑通）

```bash
# 1. 连接 + 迁移 + 角色/RLS/种子检查（自动退出码：非 0 = 有缺失）
KB_PG_CONNECTION_STRING="$KB_PG_CONNECTION_STRING" \
  node --experimental-strip-types scripts/verify-supabase.ts

# 2. 侧车（本机起，验证启动序列）——生产用 docker-compose
#    注：本机无 PG 时用 e2e-local（pglite 全链路）验证部署形态：
#       npx vitest run scripts/e2e-local.test.ts
#    真 PG 环境：KB_PG_CONNECTION_STRING=... KB_FULL_API_ENABLED=true docker compose up -d
```

## 三、端到端闭环（网关 → 侧车 → Supabase PG）

前置：侧车监听 3210；后端网关 `KB_ENGINE_URL=http://localhost:3210`；前端已登录（拿 Supabase JWT）。

| # | 步骤 | 预期 |
|---|---|---|
| 1 | `curl -H "Authorization: Bearer $JWT" http://localhost:8000/api/v1/kb/health` | 200 `{ok:true}` |
| 2 | `curl .../api/v1/kb/notes/tree` | 200 树（种子笔记可见） |
| 3 | `curl .../api/v1/kb/api/tree` | 200 引擎树 {branches,notes,attributes} |
| 4 | `curl -X POST .../api/v1/kb/api/notes/root/children?target=into -d '{"title":"部署验证","type":"text","content":""}'` | 200 {note:{noteId}} |
| 5 | `curl .../api/v1/kb/api/quick-search/部署验证` | 200 命中 |
| 6 | `curl .../api/v1/kb/api/notes/<id>/blob` | 200 content |
| 7 | `curl -X PUT .../api/v1/kb/api/notes/<id>/data -d '{"content":"<p>编辑后</p>"}'` | 204 |
| 8 | `curl -X DELETE ".../api/v1/kb/api/notes/<id>?taskId=test"` | 200（软删除） |
| 9 | 前端 `/knowledge`：树可见 → 新建 → 改名 → 搜索 → 编辑器保存 → 删除 | 全链路可用 |

## 四、RLS 租户隔离抽查（Supabase 控制台 SQL 或 psql）

```sql
-- 以 lemma_kb 登录 + 设置 app.user_id
set role lemma_kb;
select set_config('app.user_id', 'user-a', false);
insert into notes (noteId, title, type, mime, dateCreated, dateModified, utcDateCreated, utcDateModified)
values ('n-a', 'A 的笔记', 'text', 'text/html', now()::text, now()::text, now()::text, now()::text);
-- 换 user-b
select set_config('app.user_id', 'user-b', false);
select count(*) from notes where noteId = 'n-a';  -- 期望 0（A 的行不可见）
-- user-a 自己的行
select set_config('app.user_id', 'user-a', false);
select count(*) from notes where noteId = 'n-a';  -- 期望 1
```

## 四·补、真 PG 验证新增部署要点（2026-08-15 实测）

- [ ] **迁移用管理连接**：`KB_PG_ADMIN_URL`（DDL 权限）跑迁移；业务连接只跑查询——GRANT 在迁移**后**执行（GRANT ON ALL TABLES 只覆盖已存在表）
- [ ] **root 骨架种子已进 001**（`noteId='root'` + root-branch，ON CONFLICT 幂等）——空库必须初始化，否则引擎 getNoteOrThrow('root') 失败
- [ ] **RLS root 放行已进 002**（notes/branches 用户上下文可见系统 root）——否则用户树断裂
- [ ] backend 迁移链 depends_on 已修 2 处（9e2c4f6a8b1d / 7f3c9a1b5d2e）——兄弟支乱序 ALTER 先于 CREATE 必崩
- [ ] `KB_PG_CONNECTION_STRING` 用业务角色（无 BYPASSRLS）；本地验证建角色参考：
      `create role lemma_kb login password '...'; grant usage on schema public to lemma_kb;`

## 五、生产注意事项

- [ ] `KB_FULL_API_ENABLED=true`（写路径/搜索/编辑器）；false = 只读降级
- [ ] 前端 `VITE_API_BASE_URL` → 网关公网地址
- [ ] 网关只暴露公网；侧车仅内网（docker-compose `expose` 不映射宿主机端口）
- [ ] AGPL 义务：对外服务前完成开源准备（LICENSE/NOTICE/源码可获取）——见 `planning/lemma-ai-kb-license-decision.md`
- [ ] 首次启动后 `verify-supabase.ts` 全绿 + 端到端 9 步全过

## 已知限制（代码侧已记录）

- e2e-local 用 pglite（WASM 真 PG）替代真连接——RLS 语义/递归 CTE/回滚/TEMP 已真语义验证（提交 7ca176f）
- Windows 全量 vitest 串行偶发 pglite worker 可见性延迟——已加解析重试（pg-sync-bridge）；CI 建议分片或单文件跑
