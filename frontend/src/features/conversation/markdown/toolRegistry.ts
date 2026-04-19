import type { AllowedTags, Components, CustomRenderer } from 'streamdown'

/**
 * Inline AI-emitted HTML tags (e.g. `<source id="…">`, `<lemma-mention …>`).
 *
 * Each entry must declare its allowed attributes in `allowedTags` AND a matching
 * React renderer in `components`. To opt out of nested markdown parsing for a
 * tag's children, also list the tag in `literalTagContent`.
 */
export const toolHtmlTags: {
  allowedTags: AllowedTags
  literalTagContent: string[]
  components: Components
} = {
  allowedTags: {},
  literalTagContent: [],
  components: {},
}

/**
 * Block-level AI-emitted code-fence renderers (e.g. ```lemma-tool { … } ```).
 *
 * Each entry maps a fence language identifier to a React component that receives
 * `{ code, language, isIncomplete, meta }`. Use Streamdown's `CodeBlockContainer`
 * primitives to keep visual continuity with native code blocks.
 */
export const toolCodeRenderers: CustomRenderer[] = []
