import type { ScannedElement, Finding } from '../element-tree.js'
import { isInteractiveElement } from '../element-tree.js'

export default function missingTestId(element: ScannedElement, _all: ScannedElement[]): Finding | null {
  if (!isInteractiveElement(element)) return null
  if (element.attributes.dataTestId) return null

  return {
    element,
    rule: 'missing-test-id',
    severity: 'error',
    message: `<${element.tag}> has no test ID attribute (data-testid, data-cy, or data-test)`,
    suggestion: `Add data-testid="<descriptive-name>" to this element`,
  }
}
