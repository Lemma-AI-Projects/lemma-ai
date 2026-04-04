import { FileText, GraduationCap, Lightbulb, Search } from 'lucide-react'

export const suggestions = [
  { icon: FileText, iconColor: '#EA8444', label: 'Summarize text' },
  { icon: GraduationCap, iconColor: '#4A90D9', label: 'Start a course' },
  { icon: Lightbulb, iconColor: '#4CAF50', label: 'Explain a concept' },
  { icon: Search, iconColor: '#9C5EC7', label: 'Search resources' },
] as const
