import type { ScannedElement, Finding } from '../element-tree.js'

export default function unlabelledImageButton(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (element.tag !== 'button' && element.tag !== 'a') return null

  const hasLabel =
    element.attributes.ariaLabel ||
    element.attributes.ariaLabelledBy ||
    element.textContent?.trim()

  if (hasLabel) return null

  return {
    element,
    rule: 'unlabelled-image-button',
    severity: 'error',
    message: `<${element.tag}> has no text or aria-label — it may contain only an image or icon`,
    suggestion: `Add aria-label="<description>" to describe the action`,
  }
}
