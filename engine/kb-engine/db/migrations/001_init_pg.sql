-- kb-engine P0-3：Trilium 引擎 PG 化建表（001）
--
-- 设计决策（与 P0-2 的 pg-provider 对齐）：
-- 1. 列名全小写（PG 无引号标识符折叠为小写）；查询侧由 pg-provider 的
--    trilium-column-names.json 把结果键还原为引擎期望的 camelCase。
-- 2. 每张业务表加 user_id 租户列（TEXT，空串 = 系统级行，如 options 的
--    initialized/dbVersion）；隔离由 002_rls.sql 的 RLS 策略完成。
-- 3. 主键保留单列（Trilium 业务主键为全局唯一 UUID，跨用户不冲突）；
--    options 例外：name 是配置键，跨用户会撞 → 复合主键 (user_id, name)。
-- 4. 不建 etapi_tokens / sessions（平台壳认证功能，Supabase Auth 替代）。
-- 5. sqlite_master 兼容视图：引擎 isDbInitialized() 查询它判断 schema 存在。

-- ── entity_changes（变更日志，entity_changes.replace 依赖自增 id） ──────────
CREATE TABLE IF NOT EXISTS entity_changes (
    id               BIGSERIAL PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    entityName       TEXT NOT NULL,
    entityId         TEXT NOT NULL,
    hash             TEXT NOT NULL,
    isErased         INTEGER NOT NULL,
    changeId         TEXT NOT NULL,
    componentId      TEXT NOT NULL,
    instanceId       TEXT NOT NULL,
    isSynced         INTEGER NOT NULL,
    utcDateChanged   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS IDX_entityChanges_entityName_entityId
    ON entity_changes (entityName, entityId);
CREATE INDEX IF NOT EXISTS IDX_entity_changes_changeId ON entity_changes (changeId);
CREATE INDEX IF NOT EXISTS IDX_entity_changes_isSynced_id ON entity_changes (isSynced, id);
CREATE INDEX IF NOT EXISTS IDX_entity_changes_isErased_entityName
    ON entity_changes (isErased, entityName);

-- ── branches（树形结构：多父克隆的核心） ────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
    branchId         TEXT NOT NULL PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    noteId           TEXT NOT NULL,
    parentNoteId     TEXT NOT NULL,
    notePosition     INTEGER NOT NULL,
    prefix           TEXT,
    isExpanded       INTEGER NOT NULL DEFAULT 0,
    isDeleted        INTEGER NOT NULL DEFAULT 0,
    deleteId         TEXT DEFAULT NULL,
    utcDateModified  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_branches_noteId_parentNoteId ON branches (noteId, parentNoteId);
CREATE INDEX IF NOT EXISTS IDX_branches_parentNoteId_isDeleted_notePosition
    ON branches (parentNoteId, isDeleted, notePosition);
CREATE INDEX IF NOT EXISTS IDX_branches_isDeleted_utcDateModified
    ON branches (isDeleted, utcDateModified);

-- ── notes（笔记主表） ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    noteId           TEXT NOT NULL PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    title            TEXT NOT NULL DEFAULT 'note',
    isProtected      INTEGER NOT NULL DEFAULT 0,
    type             TEXT NOT NULL DEFAULT 'text',
    mime             TEXT NOT NULL DEFAULT 'text/html',
    blobId           TEXT DEFAULT NULL,
    isDeleted        INTEGER NOT NULL DEFAULT 0,
    deleteId         TEXT DEFAULT NULL,
    dateCreated      TEXT NOT NULL,
    dateModified     TEXT NOT NULL,
    utcDateCreated   TEXT NOT NULL,
    utcDateModified  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_notes_title ON notes (title);
CREATE INDEX IF NOT EXISTS IDX_notes_type ON notes (type);
CREATE INDEX IF NOT EXISTS IDX_notes_dateCreated ON notes (dateCreated);
CREATE INDEX IF NOT EXISTS IDX_notes_dateModified ON notes (dateModified);
CREATE INDEX IF NOT EXISTS IDX_notes_utcDateModified ON notes (utcDateModified);
CREATE INDEX IF NOT EXISTS IDX_notes_utcDateCreated ON notes (utcDateCreated);
CREATE INDEX IF NOT EXISTS IDX_notes_blobId ON notes (blobId);
CREATE INDEX IF NOT EXISTS IDX_notes_isDeleted_utcDateModified
    ON notes (isDeleted, utcDateModified);

-- ── revisions（版本历史） ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revisions (
    revisionId        TEXT NOT NULL PRIMARY KEY,
    user_id           TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    noteId            TEXT NOT NULL,
    type              TEXT DEFAULT '' NOT NULL,
    mime              TEXT DEFAULT '' NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT DEFAULT '' NOT NULL,
    source            TEXT DEFAULT 'auto' NOT NULL,
    isProtected       INTEGER NOT NULL DEFAULT 0,
    blobId            TEXT DEFAULT NULL,
    utcDateLastEdited TEXT NOT NULL,
    utcDateCreated    TEXT NOT NULL,
    utcDateModified   TEXT NOT NULL,
    dateLastEdited    TEXT NOT NULL,
    dateCreated       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_revisions_noteId ON revisions (noteId);
CREATE INDEX IF NOT EXISTS IDX_revisions_utcDateCreated ON revisions (utcDateCreated);
CREATE INDEX IF NOT EXISTS IDX_revisions_utcDateLastEdited ON revisions (utcDateLastEdited);
CREATE INDEX IF NOT EXISTS IDX_revisions_dateCreated ON revisions (dateCreated);
CREATE INDEX IF NOT EXISTS IDX_revisions_dateLastEdited ON revisions (dateLastEdited);
CREATE INDEX IF NOT EXISTS IDX_revisions_blobId ON revisions (blobId);

-- ── options（配置键值；复合主键 (user_id, name)——配置键跨用户隔离） ─────────
CREATE TABLE IF NOT EXISTS options (
    name             TEXT NOT NULL,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    value            TEXT NOT NULL,
    isSynced         INTEGER DEFAULT 0 NOT NULL,
    utcDateModified  TEXT NOT NULL,
    PRIMARY KEY (user_id, name)
);

-- ── attributes（属性/label/relation 系统） ───────────────────────────────────
CREATE TABLE IF NOT EXISTS attributes (
    attributeId        TEXT NOT NULL PRIMARY KEY,
    user_id            TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    noteId             TEXT NOT NULL,
    type               TEXT NOT NULL,
    name               TEXT NOT NULL,
    value              TEXT DEFAULT '' NOT NULL,
    position           INTEGER DEFAULT 0 NOT NULL,
    utcDateModified    TEXT NOT NULL,
    isDeleted          INTEGER NOT NULL,
    deleteId           TEXT DEFAULT NULL,
    isInheritable      INTEGER DEFAULT 0 NULL
);
CREATE INDEX IF NOT EXISTS IDX_attributes_name_value ON attributes (name, value);
CREATE INDEX IF NOT EXISTS IDX_attributes_noteId_index ON attributes (noteId);
CREATE INDEX IF NOT EXISTS IDX_attributes_value_index ON attributes (value);
CREATE INDEX IF NOT EXISTS IDX_attributes_isDeleted_utcDateModified
    ON attributes (isDeleted, utcDateModified);

-- ── recent_notes（最近访问） ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recent_notes (
    noteId           TEXT NOT NULL PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    notePath         TEXT NOT NULL,
    utcDateCreated   TEXT NOT NULL
);

-- ── blobs（内容存储，content 为压缩 HTML 的文本表示） ───────────────────────
CREATE TABLE IF NOT EXISTS blobs (
    blobId           TEXT NOT NULL PRIMARY KEY,
    user_id          TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    content          TEXT DEFAULT NULL,
    textRepresentation TEXT DEFAULT NULL,
    dateModified     TEXT NOT NULL,
    utcDateModified  TEXT NOT NULL
);

-- ── attachments（附件） ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
    attachmentId                    TEXT NOT NULL PRIMARY KEY,
    user_id                         TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    ownerId                         TEXT NOT NULL,
    role                            TEXT NOT NULL,
    mime                            TEXT NOT NULL,
    title                           TEXT NOT NULL,
    isProtected                     INTEGER NOT NULL DEFAULT 0,
    position                        INTEGER DEFAULT 0 NOT NULL,
    blobId                          TEXT DEFAULT NULL,
    dateModified                    TEXT NOT NULL,
    utcDateModified                 TEXT NOT NULL,
    utcDateScheduledForErasureSince TEXT DEFAULT NULL,
    isDeleted                       INTEGER NOT NULL,
    deleteId                        TEXT DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS IDX_attachments_ownerId_role ON attachments (ownerId, role);
CREATE INDEX IF NOT EXISTS IDX_attachments_blobId ON attachments (blobId);
CREATE INDEX IF NOT EXISTS IDX_attachments_isDeleted_utcDateModified
    ON attachments (isDeleted, utcDateModified);
CREATE INDEX IF NOT EXISTS IDX_attachments_utcDateScheduledForErasureSince
    ON attachments (utcDateScheduledForErasureSince);

-- ── etapi_tokens（Becca loader 无条件查询此表——功能裁剪（不做 ETAPI 路由）≠表裁剪） ──
CREATE TABLE IF NOT EXISTS etapi_tokens (
    etapiTokenId    TEXT NOT NULL PRIMARY KEY,
    user_id         TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    name            TEXT NOT NULL,
    tokenHash       TEXT NOT NULL,
    utcDateCreated  TEXT NOT NULL,
    utcDateModified TEXT NOT NULL,
    isDeleted       INTEGER NOT NULL DEFAULT 0
);

-- ── user_data（兼容：引擎 initDbConnection 会 CREATE IF NOT EXISTS；Supabase Auth 替代后无查询） ──
CREATE TABLE IF NOT EXISTS user_data (
    tmpID                    INTEGER PRIMARY KEY,
    user_id                  TEXT NOT NULL DEFAULT COALESCE(current_setting('app.user_id', true), ''),
    username                 TEXT,
    email                    TEXT,
    userIDEncryptedDataKey   TEXT,
    userIDVerificationHash   TEXT,
    salt                     TEXT,
    derivedKey               TEXT,
    isSetup                  TEXT DEFAULT 'false'
);

-- ── root 笔记（空库初始化：引擎新建库路径会建 root，种子库跳过——部署必须补） ──
INSERT INTO notes (noteId, user_id, title, type, mime, isProtected, isDeleted, dateCreated, dateModified, utcDateCreated, utcDateModified)
VALUES ('root', '', 'root', 'text', 'text/html', 0, 0, now()::text, now()::text, now()::text, now()::text)
ON CONFLICT (noteId) DO NOTHING;
INSERT INTO branches (branchId, user_id, noteId, parentNoteId, notePosition, isExpanded, isDeleted, utcDateModified)
VALUES ('root-branch', '', 'root', 'none', 10, 1, 0, now()::text)
ON CONFLICT (branchId) DO NOTHING;

-- ── sqlite_master 兼容视图（引擎 isDbInitialized 查询） ─────────────────────
-- 用 information_schema.tables 而非 pg_catalog.pg_tables（pg-mem 与真 PG 双端兼容）
CREATE OR REPLACE VIEW sqlite_master AS
SELECT table_name AS name, 'table' AS type
FROM information_schema.tables
WHERE table_schema = 'public';
