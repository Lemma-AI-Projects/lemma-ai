import type en from './locales/en.json'

// main 的 t() 收裸字符串，拼错 key 只会在运行时把 key 显示给用户；
// 这里从 en.json 推导出所有合法 key，拼错直接编译不过。
type Join<K, P> = K extends string
  ? P extends string
    ? `${K}${'' extends P ? '' : '.'}${P}`
    : never
  : never

type Leaves<T> = T extends string
  ? ''
  : { [K in keyof T]-?: Join<K, Leaves<T[K]>> }[keyof T]

export type TranslationKey = Leaves<typeof en>
