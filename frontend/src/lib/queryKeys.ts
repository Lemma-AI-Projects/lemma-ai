// 跨 feature 共享的 TanStack Query key 根；域内派生 key 在各 feature 的
// api 模块定义。目前仅会话列表需要跨域（项目删除后会话回落主列表，
// project 域需失效 conversation 域的列表缓存）。
export const conversationsQueryRootKey = ['conversations'] as const
