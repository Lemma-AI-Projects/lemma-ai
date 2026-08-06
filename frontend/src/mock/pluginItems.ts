import {
  AppWindow,
  Atom,
  BarChart3,
  BookMarked,
  BookOpenText,
  Bone,
  Bot,
  Brain,
  BrainCircuit,
  Calculator,
  Code2,
  Dna,
  Feather,
  FileText,
  FlaskConical,
  Gavel,
  Gem,
  GitFork,
  Github,
  HeartPulse,
  Landmark,
  Languages,
  Lock,
  Moon,
  Music,
  Palette,
  PenTool,
  Presentation,
  Scroll,
  Slack,
  Star,
  Table,
  Target,
  TrendingUp,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type PluginSubject =
  | 'general'
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'programming'
  | 'languages'
  | 'history'
  | 'philosophy'
  | 'astronomy'
  | 'music'
  | 'art'
  | 'economics'
  | 'law'
  | 'medicine'
  | 'psychology'
  | 'archaeology'
  | 'linguistics'
  | 'logic'
  | 'classics'
  | 'statistics'
  | 'cryptography'
  | 'paleontology'
  | 'mythology'
  | 'chess'

export interface PluginItem {
  id: string
  title: string
  description: string
  subject: PluginSubject
  installed: boolean
  Icon: LucideIcon
}

export const pluginItems: PluginItem[] = [
  // ── 通用 ────────────────────────────────────────────────
  {
    id: 'computer-use',
    title: 'Computer Use',
    description: 'Control Mac apps from Lemma',
    subject: 'general',
    installed: true,
    Icon: AppWindow,
  },
  {
    id: 'spreadsheets',
    title: 'Spreadsheets',
    description: 'Create and edit spreadsheet files',
    subject: 'general',
    installed: true,
    Icon: Table,
  },
  {
    id: 'presentations',
    title: 'Presentations',
    description: 'Create and edit presentations',
    subject: 'general',
    installed: true,
    Icon: Presentation,
  },
  {
    id: 'slack',
    title: 'Slack',
    description: 'Read and manage study team channels',
    subject: 'general',
    installed: false,
    Icon: Slack,
  },
  {
    id: 'linear',
    title: 'Linear',
    description: 'Track learning projects and tasks',
    subject: 'general',
    installed: false,
    Icon: Workflow,
  },
  {
    id: 'paper-reader',
    title: 'Paper Reader',
    description: 'Extract claims, methods, and citations',
    subject: 'general',
    installed: false,
    Icon: FileText,
  },
  {
    id: 'writing-coach',
    title: 'Writing Coach',
    description: 'Rewrite essays with clearer structure',
    subject: 'general',
    installed: false,
    Icon: PenTool,
  },
  {
    id: 'course-builder',
    title: 'Course Builder',
    description: 'Turn materials into guided courses',
    subject: 'general',
    installed: false,
    Icon: BookOpenText,
  },
  {
    id: 'study-agent',
    title: 'Study Agent',
    description: 'Plan reviews and follow-up sessions',
    subject: 'general',
    installed: false,
    Icon: Bot,
  },

  // ── 数学 ────────────────────────────────────────────────
  {
    id: 'math-solver',
    title: 'Math Solver',
    description: 'Solve equations step by step',
    subject: 'math',
    installed: true,
    Icon: Calculator,
  },
  {
    id: 'concept-tutor',
    title: 'Concept Tutor',
    description: 'Break down hard concepts into lessons',
    subject: 'math',
    installed: false,
    Icon: BrainCircuit,
  },

  // ── 物理 ────────────────────────────────────────────────
  {
    id: 'physics-lab',
    title: 'Physics Lab',
    description: 'Simulate experiments and derive laws',
    subject: 'physics',
    installed: false,
    Icon: Atom,
  },

  // ── 化学 ────────────────────────────────────────────────
  {
    id: 'molecule-builder',
    title: 'Molecule Builder',
    description: 'Build and visualize molecular structures',
    subject: 'chemistry',
    installed: false,
    Icon: FlaskConical,
  },

  // ── 生物 ────────────────────────────────────────────────
  {
    id: 'bio-explorer',
    title: 'Bio Explorer',
    description: 'Map ecosystems and body systems',
    subject: 'biology',
    installed: false,
    Icon: Dna,
  },

  // ── 编程 ────────────────────────────────────────────────
  {
    id: 'github',
    title: 'GitHub',
    description: 'Triage issues, PRs, and publish flows',
    subject: 'programming',
    installed: false,
    Icon: Github,
  },
  {
    id: 'code-mentor',
    title: 'Code Mentor',
    description: 'Learn algorithms with hands-on problems',
    subject: 'programming',
    installed: false,
    Icon: Code2,
  },

  // ── 语言 ────────────────────────────────────────────────
  {
    id: 'language-practice',
    title: 'Language Practice',
    description: 'Practice vocabulary and translation',
    subject: 'languages',
    installed: false,
    Icon: Languages,
  },

  // ── 历史 ────────────────────────────────────────────────
  {
    id: 'timeline-historian',
    title: 'Timeline Historian',
    description: 'Trace events across civilizations',
    subject: 'history',
    installed: false,
    Icon: Landmark,
  },

  // ── 哲学 ────────────────────────────────────────────────
  {
    id: 'socratic-tutor',
    title: 'Socratic Tutor',
    description: 'Question your way to first principles',
    subject: 'philosophy',
    installed: false,
    Icon: Feather,
  },

  // ── 天文 ────────────────────────────────────────────────
  {
    id: 'sky-atlas',
    title: 'Sky Atlas',
    description: 'Navigate constellations and deep sky objects',
    subject: 'astronomy',
    installed: false,
    Icon: Star,
  },

  // ── 音乐 ────────────────────────────────────────────────
  {
    id: 'music-theory',
    title: 'Music Theory',
    description: 'Master harmony, scales, and ear training',
    subject: 'music',
    installed: false,
    Icon: Music,
  },

  // ── 艺术 ────────────────────────────────────────────────
  {
    id: 'art-history',
    title: 'Art History',
    description: 'Decode masterpieces and art movements',
    subject: 'art',
    installed: false,
    Icon: Palette,
  },

  // ── 经济 ────────────────────────────────────────────────
  {
    id: 'econ-modeler',
    title: 'Econ Modeler',
    description: 'Model supply, demand, and incentives',
    subject: 'economics',
    installed: false,
    Icon: TrendingUp,
  },

  // ── 法律 ────────────────────────────────────────────────
  {
    id: 'legal-reader',
    title: 'Legal Reader',
    description: 'Read statutes and landmark case law',
    subject: 'law',
    installed: false,
    Icon: Gavel,
  },

  // ── 医学 ────────────────────────────────────────────────
  {
    id: 'anatomy-atlas',
    title: 'Anatomy Atlas',
    description: 'Study human body systems in depth',
    subject: 'medicine',
    installed: false,
    Icon: HeartPulse,
  },

  // ── 心理学 ──────────────────────────────────────────────
  {
    id: 'mind-lab',
    title: 'Mind Lab',
    description: 'Explore cognition, behavior, and biases',
    subject: 'psychology',
    installed: false,
    Icon: Brain,
  },

  // ── 考古 ────────────────────────────────────────────────
  {
    id: 'dig-site',
    title: 'Dig Site',
    description: 'Excavate artifacts and date the strata',
    subject: 'archaeology',
    installed: false,
    Icon: Gem,
  },

  // ── 语言学 ──────────────────────────────────────────────
  {
    id: 'philology-tools',
    title: 'Philology Tools',
    description: 'Trace word roots across languages',
    subject: 'linguistics',
    installed: false,
    Icon: BookMarked,
  },

  // ── 逻辑学 ──────────────────────────────────────────────
  {
    id: 'logic-trainer',
    title: 'Logic Trainer',
    description: 'Drill syllogisms, fallacies, and proofs',
    subject: 'logic',
    installed: false,
    Icon: GitFork,
  },

  // ── 古典学 ──────────────────────────────────────────────
  {
    id: 'latin-coach',
    title: 'Latin Coach',
    description: 'Read Caesar and Virgil with declension drills',
    subject: 'classics',
    installed: false,
    Icon: Scroll,
  },

  // ── 统计学 ──────────────────────────────────────────────
  {
    id: 'stats-visualizer',
    title: 'Stats Visualizer',
    description: 'See distributions and inference clearly',
    subject: 'statistics',
    installed: false,
    Icon: BarChart3,
  },

  // ── 密码学 ──────────────────────────────────────────────
  {
    id: 'cipher-workshop',
    title: 'Cipher Workshop',
    description: 'Break ciphers from Caesar to RSA',
    subject: 'cryptography',
    installed: false,
    Icon: Lock,
  },

  // ── 古生物学 ────────────────────────────────────────────
  {
    id: 'fossil-lab',
    title: 'Fossil Lab',
    description: 'Identify species from the fossil record',
    subject: 'paleontology',
    installed: false,
    Icon: Bone,
  },

  // ── 神话学 ──────────────────────────────────────────────
  {
    id: 'myth-map',
    title: 'Myth Map',
    description: 'Navigate pantheons and heroic cycles',
    subject: 'mythology',
    installed: false,
    Icon: Moon,
  },

  // ── 棋类 ────────────────────────────────────────────────
  {
    id: 'chess-tutor',
    title: 'Chess Tutor',
    description: 'Study openings, tactics, and endgames',
    subject: 'chess',
    installed: false,
    Icon: Target,
  },
]
