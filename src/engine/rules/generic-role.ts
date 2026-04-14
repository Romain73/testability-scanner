import type { ScannedElement, Finding } from '../element-tree.js'

const GENERIC_TAGS = new Set(['div', 'span'])

export default function genericRole(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (!GENERIC_TAGS.has(element.tag)) return null
  if (element.role) return null
  if (!element.hasEventHandler) return null

  return {
    element,
    rule: 'generic-role',
    severity: 'warning',
    message: `<${element.tag}> has an event handler but no role attribute, making it opaque to automation tools`,
    suggestion: `Add role="button" (or appropriate role) and ensure it is keyboard-accessible`,
  }
}
