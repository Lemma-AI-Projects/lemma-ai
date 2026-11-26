import { useRef, type PointerEvent } from 'react'

// 元素当前的 translate（没设过就是 0）。
function readTranslate(element: HTMLElement) {
  const [x, y] = getComputedStyle(element).translate.split(' ').map(parseFloat)
  return { x: x || 0, y: y || 0 }
}

// 鼠标停在浮层里的时候，把浮层钉在原地；鼠标移出去之后再滑到它该在的位置。
//
// 加号菜单是挂在加号上的。附上第一份资料时输入卡会长高一行，加号往下走，浮层也跟着
// 往下跳一截，鼠标底下就换成了另一行，接着点就会点错。
//
// 做法：浮层外面有一层由 Radix 负责定位（锚点一动就改它的 transform）。鼠标进来时记下
// 浮层在窗口里的位置，之后那一层每动一次，就把浮层自己往回挪同样的距离。
// 返回的两个事件处理函数直接展开到 PopoverContent 上。
export function useStayPutWhileHovered() {
  const observerRef = useRef<MutationObserver | null>(null)

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    const content = event.currentTarget
    const layer = content.parentElement
    if (!layer) return

    // 上一次的浮层可能是在鼠标还在里面时关掉的，先收尾。
    observerRef.current?.disconnect()

    const offset = readTranslate(content)
    const layerRect = layer.getBoundingClientRect()
    const pinned = { left: layerRect.left + offset.x, top: layerRect.top + offset.y }
    // 如果正在往回滑，就停在滑到的地方。
    content.style.transition = 'none'
    content.style.translate = `${offset.x}px ${offset.y}px`

    const observer = new MutationObserver(() => {
      const rect = layer.getBoundingClientRect()
      content.style.translate = `${pinned.left - rect.left}px ${pinned.top - rect.top}px`
    })
    observer.observe(layer, { attributes: true, attributeFilter: ['style'] })
    observerRef.current = observer
  }

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    observerRef.current?.disconnect()
    observerRef.current = null
    const content = event.currentTarget
    content.style.transition = 'translate 220ms cubic-bezier(0.22, 1, 0.36, 1)'
    content.style.translate = '0px 0px'
  }

  return { onPointerEnter, onPointerLeave }
}
