import type { ScannedElement, Finding } from '../element-tree.js'

export default function missingFormLabel(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (element.tag !== 'input') return null

  // Hidden and submit inputs don't need labels
  const type = element.attributes.type?.toLowerCase()
  if (type === 'hidden' || type === 'submit' || type === 'reset' || type === 'button') return null

  const hasLabel =
    element.attributes.ariaLabel ||
    element.attributes.ariaLabelledBy ||
    element.attributes.placeholder ||
    element.textContent?.trim()

  if (hasLabel) return null

  return {
    element,
    rule: 'missing-form-label',
    severity: 'error',
    message: `<input type="${type ?? 'text'}"> has no accessible label`,
    suggestion: `Add a <label> element, aria-label="<description>", or placeholder attribute`,
  }
}
