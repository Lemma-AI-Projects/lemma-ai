/*
 * Adapted from SamHerbert/SVG-Loaders grid.svg.
 * Copyright (c) 2014 Sam Herbert. Licensed under the MIT License.
 */
export function ConversationThinkingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="AI 正在思考"
      data-slot="conversation-thinking-indicator"
      className="flex h-7 w-fit items-center text-zinc-400"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 105 105"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        aria-hidden="true"
        className="block"
      >
        <circle cx="12.5" cy="12.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="0s"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="12.5" cy="52.5" r="12.5" fillOpacity=".5">
          <animate
            attributeName="fill-opacity"
            begin="100ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="52.5" cy="12.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="300ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="52.5" cy="52.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="600ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="92.5" cy="12.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="800ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="92.5" cy="52.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="400ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="12.5" cy="92.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="700ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="52.5" cy="92.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="500ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="92.5" cy="92.5" r="12.5">
          <animate
            attributeName="fill-opacity"
            begin="200ms"
            dur="1s"
            values="1;.2;1"
            calcMode="linear"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span className="sr-only">思考中…</span>
    </div>
  )
}
