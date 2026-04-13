import type { ScannedElement, Finding } from '../element-tree.js'

export default function duplicateTestId(element: ScannedElement, all: ScannedElement[]): Finding | null {
  const testId = element.attributes.dataTestId
  if (!testId) return null

  const duplicates = all.filter(el => el.attributes.dataTestId === testId)
  // Only flag the second+ occurrence to avoid double-reporting
  const firstOccurrence = duplicates[0]
  if (firstOccurrence === element) return null

  return {
    element,
    rule: 'duplicate-test-id',
    severity: 'error',
    message: `data-testid="${testId}" is used on multiple elements`,
    suggestion: `Use a unique data-testid for each element — automation tools will match the wrong element`,
  }
}
