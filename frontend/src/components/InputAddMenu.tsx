import { useState } from 'react'
import {
  BookOpen,
  Copy,
  FileText,
  Globe,
  ImagePlus,
  Layers,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  InputMenu,
  InputMenuItem,
  InputMenuLabel,
  InputMenuSeparator,
  InputMenuSub,
  InputMenuSwitchItem,
} from '@/components/InputMenu'

interface InputAddMenuProps {
  className?: string
  contextLabel?: string
  menuAlignOffset?: number
  referenceLabel?: string
  toolsLabel?: string
}

// Plus button size. Change this value to adjust the circular button diameter.
const ADD_BUTTON_SIZE_CLASS = 'size-[33px]'

// Plus button border. Remove or change this value to control whether it has an outline.
const ADD_BUTTON_BORDER_CLASS = 'border border-zinc-200'

// Plus icon size inside the circular button.
const ADD_ICON_SIZE_CLASS = 'size-[18px]'

export function InputAddMenu({
  className,
  contextLabel = 'Include context',
  menuAlignOffset = -10,
  referenceLabel = 'Reference materials',
  toolsLabel = 'Tools',
}: InputAddMenuProps) {
  const [includeContext, setIncludeContext] = useState(true)
  const [webSearch, setWebSearch] = useState(false)

  return (
    <InputMenu
      alignOffset={menuAlignOffset}
      trigger={
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-background text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
            ADD_BUTTON_SIZE_CLASS,
            ADD_BUTTON_BORDER_CLASS,
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            className
          )}
          aria-label="Add context and tools"
        >
          <Plus className={cn(ADD_ICON_SIZE_CLASS, 'text-zinc-500')} />
        </button>
      }
    >
      <InputMenuItem icon={ImagePlus} label="Add photos & files" />
      <InputMenuItem icon={BookOpen} label={referenceLabel} />

      <InputMenuSeparator />

      <InputMenuSwitchItem
        icon={Layers}
        label={contextLabel}
        checked={includeContext}
        onCheckedChange={setIncludeContext}
      />
      <InputMenuSwitchItem
        icon={Globe}
        label="Web search"
        checked={webSearch}
        onCheckedChange={setWebSearch}
      />

      <InputMenuSeparator />

      <InputMenuSub icon={LayoutGrid} label={toolsLabel}>
        <InputMenuLabel>{toolsLabel}</InputMenuLabel>
        <InputMenuItem icon={ListChecks} label="Generate quiz" />
        <InputMenuItem icon={FileText} label="Summarize section" />
        <InputMenuItem icon={Copy} label="Make flashcards" />
        <InputMenuItem icon={Lightbulb} label="Explain concept" />
      </InputMenuSub>
    </InputMenu>
  )
}
