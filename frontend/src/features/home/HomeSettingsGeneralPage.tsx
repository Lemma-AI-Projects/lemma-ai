import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export function HomeSettingsGeneralPage() {
  return (
    <>
      <h2 className="text-lg font-normal text-zinc-900">通用</h2>
      <Separator className="mt-4 bg-zinc-200" />

      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-4 py-3">
        <span className="text-[16px] font-normal leading-7 text-zinc-600">语言</span>
        <Select defaultValue="zh">
          <SelectTrigger size="sm" className="w-[96px] shadow-none">
            <SelectValue placeholder="选择语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh">汉语</SelectItem>
            <SelectItem value="en">英语</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator className="bg-zinc-200" />
    </>
  )
}
