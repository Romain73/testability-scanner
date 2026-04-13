import type { ScannedElement, Finding } from '../element-tree.js'
import { isInteractiveElement } from '../element-tree.js'

export default function textOnlyLocator(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (!isInteractiveElement(element)) return null
  if (!element.textContent?.trim()) return null

  const hasStableIdentifier =
    element.attributes.dataTestId ||
    element.attributes.ariaLabel ||
    element.attributes.ariaLabelledBy ||
    element.attributes.id

  if (hasStableIdentifier) return null

  return {
    element,
    rule: 'text-only-locator',
    severity: 'warning',
    message: `<${element.tag}> is only identifiable by its text content "${element.textContent?.trim()}"`,
    suggestion: `Add data-testid="<name>" so tests don't break when copy changes`,
  }
}
