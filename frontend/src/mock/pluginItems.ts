import {
  AppWindow,
  BookOpenText,
  Bot,
  BrainCircuit,
  Calculator,
  FileText,
  Github,
  Languages,
  PenTool,
  Presentation,
  Slack,
  Table,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type PluginSubject = 'general' | 'math'

export interface PluginItem {
  id: string
  title: string
  description: string
  subject: PluginSubject
  installed: boolean
  Icon: LucideIcon
}

export const pluginItems: PluginItem[] = [
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
    id: 'github',
    title: 'GitHub',
    description: 'Triage issues, PRs, and publish flows',
    subject: 'general',
    installed: false,
    Icon: Github,
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
  {
    id: 'language-practice',
    title: 'Language Practice',
    description: 'Practice vocabulary and translation',
    subject: 'general',
    installed: false,
    Icon: Languages,
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
]
