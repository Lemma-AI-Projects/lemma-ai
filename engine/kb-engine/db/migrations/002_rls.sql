-- kb-engine P0-3：RLS 租户隔离（002）
--
-- 前置：001_init_pg.sql（表 + user_id 列）。本文件启用 Row Level Security。
-- 注意：pg-mem 等模拟环境不支持 RLS/current_setting —— 本文件在真 PG（Supabase）
-- 上验证；迁移运行器提供 --skip-rls 测试模式。
--
-- 隔离语义：
--   - 业务表：policy 动态引用 current_setting('app.user_id')（连接级会话变量，
--     Express 每请求设置；同步桥串行保证不交叉污染）。未设置时 COALESCE 为 ''，
--     只可见系统行。
--   - options：额外放行系统行（user_id = ''，如 initialized/dbVersion 种子）。
--   - 连接角色必须无 BYPASSRLS（postgres/service_role 会绕过 RLS，不可用；
--     部署用 authenticated 或自定义 lemma_kb 角色）。

ALTER TABLE entity_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY entity_changes_isolation ON entity_changes
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY branches_isolation ON branches
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY notes_isolation ON notes
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY revisions_isolation ON revisions
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY attributes_isolation ON attributes
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY recent_notes_isolation ON recent_notes
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY blobs_isolation ON blobs
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY attachments_isolation ON attachments
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
CREATE POLICY user_data_isolation ON user_data
    USING (user_id = COALESCE(current_setting('app.user_id', true), ''));
-- options：系统行（user_id = ''）对所有人可见（initialized/dbVersion 种子）
CREATE POLICY options_isolation ON options
    USING (user_id = COALESCE(current_setting('app.user_id', true), '') OR user_id = '');
