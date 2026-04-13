import type { ScannedElement, Finding } from '../element-tree.js'

const GENERIC_TAGS = new Set(['div', 'span'])

export default function genericRole(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (!GENERIC_TAGS.has(element.tag)) return null
  if (element.role) return null

  // Only flag if it looks interactive (has a click handler hint via attributes)
  // In source mode we can't detect event handlers, so we flag div/span with
  // tabIndex or cursor:pointer — but those aren't in our schema.
  // We flag all div/span without role as a warning since they're opaque to automation.
  return {
    element,
    rule: 'generic-role',
    severity: 'warning',
    message: `<${element.tag}> has no role attribute, making it opaque to automation tools`,
    suggestion: `Add role="button" (or appropriate role) and ensure it is keyboard-accessible`,
  }
}
