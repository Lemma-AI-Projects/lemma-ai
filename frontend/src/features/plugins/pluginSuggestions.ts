import {
  Atom,
  BarChart3,
  Bone,
  BookMarked,
  BookOpenText,
  Brain,
  BrainCircuit,
  Calculator,
  Code2,
  Dna,
  Feather,
  FlaskConical,
  Gem,
  GitFork,
  HeartPulse,
  Landmark,
  Languages,
  Lock,
  Music,
  Palette,
  Scroll,
  Star,
  Target,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

/**
 * P5-A：已安装学科插件 → 首页建议映射（显式配置表）。
 *
 * 语义（P1-D2）：安装「数学」插件 → 首页出现数学建议入口；卸载 → 消失。
 * 这是插件安装语义的第一次真实消费；映射表保持显式配置（不进数据库），
 * 未来框架决策引擎可接管「建议生成」而只替换这张表的生产者。
 */
export interface PluginSuggestion {
  label: string
  icon: LucideIcon
  iconColor: string
}

export const SUBJECT_SUGGESTIONS: Record<string, PluginSuggestion> = {
  math: { label: 'Explain a math concept', icon: Calculator, iconColor: '#4A90D9' },
  physics: { label: 'Explore a physics concept', icon: Atom, iconColor: '#EA8444' },
  chemistry: { label: 'Understand a chemistry reaction', icon: FlaskConical, iconColor: '#9C5EC7' },
  biology: { label: 'Learn a biology topic', icon: Dna, iconColor: '#4CAF50' },
  programming: { label: 'Get help with code', icon: Code2, iconColor: '#2D9CDB' },
  languages: { label: 'Practice a language', icon: Languages, iconColor: '#F2994A' },
  history: { label: 'Explore a history topic', icon: Scroll, iconColor: '#B47B4A' },
  philosophy: { label: 'Discuss a philosophy question', icon: Feather, iconColor: '#8B5CF6' },
  astronomy: { label: 'Look into an astronomy question', icon: Star, iconColor: '#6366F1' },
  economics: { label: 'Understand an economics idea', icon: TrendingUp, iconColor: '#10B981' },
  psychology: { label: 'Explore a psychology concept', icon: Brain, iconColor: '#EC4899' },
  music: { label: 'Learn music theory', icon: Music, iconColor: '#F59E0B' },
  art: { label: 'Study an art movement', icon: Palette, iconColor: '#EF4444' },
  law: { label: 'Ask about a legal concept', icon: Landmark, iconColor: '#64748B' },
  medicine: { label: 'Ask a health-science question', icon: HeartPulse, iconColor: '#F43F5E' },
  statistics: { label: 'Work through a statistics problem', icon: BarChart3, iconColor: '#06B6D4' },
  chess: { label: 'Analyze a chess position', icon: Target, iconColor: '#78716C' },
  logic: { label: 'Practice a logic puzzle', icon: BrainCircuit, iconColor: '#A78BFA' },
  linguistics: { label: 'Explore a linguistics topic', icon: BookOpenText, iconColor: '#34D399' },
  cryptography: { label: 'Understand a cryptography concept', icon: Lock, iconColor: '#FBBF24' },
  classics: { label: 'Study a classical text', icon: BookMarked, iconColor: '#CA8A04' },
  paleontology: { label: 'Ask about a fossil or species', icon: Bone, iconColor: '#A16207' },
  mythology: { label: 'Explore a myth', icon: Gem, iconColor: '#C084FC' },
  archaeology: { label: 'Ask about an archaeological find', icon: GitFork, iconColor: '#92400E' },
}

/**
 * 已安装插件 → 增补建议（按学科去重；general 工具不给建议）。
 * 输入：usePlugins 的 installed 插件列表（真实安装态）。
 */
export function installedPluginSuggestions(
  installedSubjects: string[],
): PluginSuggestion[] {
  const seen = new Set<string>()
  const out: PluginSuggestion[] = []
  for (const subject of installedSubjects) {
    if (subject === 'general' || seen.has(subject)) continue
    const suggestion = SUBJECT_SUGGESTIONS[subject]
    if (suggestion) {
      seen.add(subject)
      out.push(suggestion)
    }
  }
  return out
}
