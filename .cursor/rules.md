# Lemma AI 开发准则

## 一、总体原则

- 以"清晰边界、单一职责、最小必要复杂度"为第一原则
- 优先选择与当前技术栈和目录架构一致的实现方式，禁止随意引入新框架或平行体系
- 不为未来不确定需求提前做复杂抽象；只有在重复明显、收益明确时才抽象
- 目录结构是长期骨架，新增目录或分层前先判断是否真的必要
- 可以简单解决的问题，不要为了"看起来专业"过度设计
- 一个领域只能有一个"真相源"：数据库结构的真相在 `models/`，API 契约的真相在 `schemas/`，前端类型的真相在 `types/`

## 二、技术栈边界

**前端**
- React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Router + TanStack Query + Zustand

**后端**
- Python + FastAPI + Pydantic + SQLAlchemy 2.0 (async) + Alembic + Celery + Redis + SSE

**存储**
- Supabase：PostgreSQL 托管 + Auth + pgvector + 对象存储

**部署**
- 前端 Vercel，后端 Render

**监控**
- Sentry

未经明确决策，不引入新的状态管理库、前端框架、后端框架、ORM、任务队列或数据库迁移体系。

## 三、前端目录与分层

- `features/`：前端业务逻辑的主要归属地。有明确业务语义的组件、hooks、API 请求逻辑，优先放回所属 feature。feature 内的代码禁止被其他 feature 直接引用，如需共享则提升到 `components/` 或 `hooks/`
- `components/`：只放无业务语义的通用 UI 组件（shadcn/ui 基础组件、跨功能复用的展示组件）。禁止在 `components/` 内发起 API 请求或绑定业务状态
- `layouts/`：页面布局骨架（Landing / App / Admin 三套），不放业务逻辑
- `pages/`：路由页面，只负责从 `features/` 和 `components/` 拼装，禁止在 pages 里写复杂业务逻辑
- `hooks/`：仅放跨功能复用的全局 Hooks；feature 私有 hooks 放回对应 `features/`
- `stores/`：仅放 Zustand 客户端状态
- `lib/`：axios 实例配置、工具函数、常量。具体业务请求逻辑跟随对应 `features/`，不要全堆在 `lib/` 里
- `mock/`：开发阶段的模拟数据，不得成为真实业务逻辑的依赖
- `types/`：全局共享的 TypeScript 类型定义；局部类型优先就近放置
- `assets/`：需要构建处理的图片、SVG、字体

## 四、前端状态管理

- 来自后端的数据（课程列表、用户信息、学习进度等）：TanStack Query 管理，负责缓存、失效、重试、同步
- 纯前端 UI 状态（侧边栏开关、主题、播放进度等）：Zustand 管理
- 组件内部临时状态（表单输入、弹窗开关等）：React useState
- 禁止把服务端数据塞进 Zustand，禁止在 Zustand 里发 API 请求
- 能用局部 useState 解决的状态，不要上升为全局 Zustand 状态
- 不得同时用多套机制管理同一份状态

## 五、前端组件与第三方引入

- shadcn/ui 作为基础组件来源，但不是强制唯一来源
- 引入基于 shadcn 的第三方组件时，优先采用复制源码的方式放入项目，以便用 Tailwind 深度定制
- 不允许直接修改 `node_modules`
- 外部组件接入后必须适配当前项目的样式体系和目录边界
- 新依赖必须有明确用途；若只是为了一处小需求，优先考虑现有工具是否已足够

## 六、后端分层规则

- `api/`：只负责路由、参数校验、权限检查和调用 service，禁止在路由层写核心业务逻辑或直接操作数据库
- `services/`：业务逻辑层，被 `api/` 调用，可以调用 `models/`、`ai/`、`tasks/`
- `models/`：SQLAlchemy ORM 模型，数据库表结构的唯一真相源
- `schemas/`：Pydantic 请求/响应模型，API 输入输出的契约层
- `ai/`：AI 编排层，独立于业务逻辑。Prompt 管理、模型调用封装、RAG 检索、成本控制
- `core/`：配置读取、数据库连接、认证、中间件、通用工具函数
- `tasks/`：Celery 异步任务定义
- 未经明确需要，不额外引入新的分层如 `repositories/`、`managers/`、`controllers/`
- 数据校验优先在 `schemas/` 完成，业务规则优先在 `services/` 完成
- 业务错误应明确、可追踪、可被前端识别

## 七、数据库与迁移

- 表结构变更只通过 SQLAlchemy 模型定义 + Alembic 迁移执行，禁止手动执行 DDL SQL
- 修改 `models/` 后执行 `alembic revision --autogenerate`，再执行 `alembic upgrade head`
- Supabase MCP 可用于查看表数据、测试 SQL 查询，但禁止通过 MCP 直接修改表结构
- 每次迁移必须向前兼容：新增列设默认值，删除列先停用再删除
- 迁移文件必须纳入 Git 版本控制
- 大文件（视频、图片、PDF）统一使用 Supabase Storage 对象存储，数据库中只保存文件 URL

## 八、AI 调用规范

- 所有 LLM API 调用必须通过 `ai/` 模块封装，禁止在 `services/` 或 `api/` 中直接调用模型 SDK
- Prompt 模板集中存放在 `ai/` 目录下，禁止在业务代码中硬编码 Prompt 字符串
- AI 是不稳定的外部能力，不得被当作可信的同步函数。调用必须考虑失败、超时、降级和重试
- 每次 AI 调用必须记录 token 消耗

## 九、异步任务

- 任何预期执行时间超过 2 秒的操作（视频转录、课程编排等），禁止在 API 请求主线程中阻塞等待
- 必须返回 task_id 并将任务推入 Celery 异步处理
- 异步任务应可重试、可观测、可记录失败原因

## 十、前后端通信

- 前端通过 `lib/` 中封装的 axios 实例调用后端 REST API
- 后端 API 统一前缀 `/api/v1/`
- Copilot 流式响应使用 SSE（FastAPI StreamingResponse），不使用 WebSocket
- 所有 API 请求和响应都必须有对应的 Pydantic Schema 定义
- 前端所有 API 调用通过 TanStack Query 管理，禁止在组件中直接使用裸 axios/fetch
- 前端不得绕过后端直接操作 Supabase 业务表

## 十一、环境变量与安全

- 所有密钥、API Key、数据库连接字符串只通过环境变量传入，禁止硬编码
- `.env` 文件禁止提交到 Git
- 每个层级提供 `.env.example` 模板，列出所需变量名但不含真实值
- 前端环境变量以 `VITE_` 开头
- 配置读取应集中到后端 `core/` 和前端 `lib/`，不到处散读环境变量

## 十二、代码风格

- 前端 TypeScript 严格模式，禁止使用 `any`（必要时使用 `unknown`）
- 后端所有 FastAPI 路由函数使用 async def
- 后端 SQLAlchemy 使用 2.0 风格的异步模式
- 后端 Python 强制使用类型注解 (Type Hints)
- 前端组件文件 PascalCase（`CourseCard.tsx`），工具函数 camelCase
- 后端 Python 文件 snake_case

## 十三、Git 工作流

- 主分支为 `main`，日常开发在 feature 分支进行
- 分支命名：`feat/功能名`、`fix/问题名`、`refactor/模块名`
- 每个功能完成后合并到 `main`，保持 `main` 始终可部署
- 不要主动使用 Git，我来决定是否 commit 和合并等。

## 十四、部署

- 前端推送到 GitHub 后 Vercel 自动部署
- 后端推送到 GitHub 后 Render 自动部署
- 生产环境和开发环境使用不同的环境变量配置，禁止共用

## 十五、Cursor AI 协作准则

- 修改现有功能前，必须先阅读对应的 `features/` 或 `services/` 目录下的相关文件
- 生成新文件时，必须严格遵守目录结构，不在根目录或错误层级创建文件
- 当实现方案与本规则冲突时，优先遵守规则，并向用户发出警告
- 若某条规则明显妨碍开发，应先提议更新规则，再改变实现，而不是绕过规则

## 十六、默认禁止事项

- 禁止前端直接操作 Supabase 业务表
- 禁止使用 MCP 直接改线上 Schema
- 禁止在 `api/` 写核心业务逻辑
- 禁止把服务端状态塞进 Zustand
- 禁止把有明确业务语义的代码丢进通用 `components/`
- 禁止在多个位置维护同类真相源
- 禁止随意引入未拍板的新框架或存储方案
- 禁止为了短期方便破坏目录边界