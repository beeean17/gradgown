/**
 * Strips basic markdown syntax for clean card snippets and plaintext previews.
 */
export function stripMarkdown(md: string): string {
  if (!md) return ''
  return md
    .replace(/^#+\s+/gm, '') // Remove headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url) -> text
    .replace(/^>\s+/gm, '') // Remove blockquotes
    .replace(/^[-*+]\s+/gm, '') // Remove list bullets
    .replace(/^\d+\.\s+/gm, '') // Remove list numbers
    .replace(/\|/g, ' ') // Remove table pipes
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
}
