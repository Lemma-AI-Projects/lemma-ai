import { useCallback, useEffect, useRef, type RefObject } from 'react'

// 离底部多近算「在底部」。
const BOTTOM_THRESHOLD = 8

// 让消息列表在内容变高或变矮时保持贴底：只要用户本来就在底部，就继续停在底部。
// 输入框上方多出一块问卷、换题时问卷变高、发出一条新消息，最后几条消息都还看得见。
// 用户往上翻去看前面的内容时不跟，不会把人拽回来。
//
// `scrollRef` 指向滚动容器，它的第一个子元素是装内容的那一层（ConversationLayout 的结构）。
// 返回的函数用来在发消息、提交这类动作之后说一声「接下来的变化请跟到底部」，
// 不管用户当时翻到了哪。
export function useStickToBottom(scrollRef: RefObject<HTMLDivElement | null>) {
  const pinnedRef = useRef(true)

  useEffect(() => {
    const scroller = scrollRef.current
    const content = scroller?.firstElementChild
    if (!scroller || !content) return undefined

    // 只有「用户自己往上翻」才算离开底部。不能简单地用「现在离底部多远」来判断：
    // 滚动事件比内容变化晚一帧到，问卷变高的动画期间，事件到的时候内容又长高了一截，
    // 会被误判成已经不在底部，之后就不再跟了。
    let lastScrollTop = scroller.scrollTop
    const handleScroll = () => {
      const distance =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      if (distance < BOTTOM_THRESHOLD) {
        pinnedRef.current = true
      } else if (scroller.scrollTop < lastScrollTop) {
        pinnedRef.current = false
      }
      lastScrollTop = scroller.scrollTop
    }
    // 内容高度或窗口高度一变就检查；开始观察时也会先跑一次，进页面时落在底部。
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) {
        scroller.scrollTop = scroller.scrollHeight
      }
    })
    // 内容那一层按 border-box 观察：底部给输入区留的空位是它的内边距，
    // 默认的 content-box 不包含内边距，空位变大变小时不会通知。
    observer.observe(content, { box: 'border-box' })
    observer.observe(scroller)
    scroller.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      observer.disconnect()
      scroller.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef])

  return useCallback(() => {
    pinnedRef.current = true
  }, [])
}
