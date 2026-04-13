import type { ScannedElement, Finding } from '../element-tree.js'
import { isInteractiveElement } from '../element-tree.js'

export default function missingAriaLabel(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (!isInteractiveElement(element)) return null

  const hasAccessibleName =
    element.attributes.ariaLabel ||
    element.attributes.ariaLabelledBy ||
    element.attributes.placeholder ||
    element.textContent?.trim()

  if (hasAccessibleName) return null

  return {
    element,
    rule: 'missing-aria-label',
    severity: 'error',
    message: `<${element.tag}> has no accessible name (no aria-label, aria-labelledby, placeholder, or visible text)`,
    suggestion: `Add aria-label="<description>" or wrap with a <label> element`,
  }
}
