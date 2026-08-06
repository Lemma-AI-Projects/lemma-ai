import { BoardCanvas } from './BoardCanvas'

/**
 * [board-demo] Board 调试入口（E0 验证页，保留供开发联调）
 * - 直接复用正式 BoardCanvas（UI 已魔改为 Lemma zinc 风格）
 * - learnSpaceId='demo'：与 learn space 数据隔离的独立画布
 * E1 完成后可随路由移除，或保留作空白画布调试。
 */
export function BoardDemoPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <BoardCanvas learnSpaceId="demo" />
      </div>
    </div>
  )
}
