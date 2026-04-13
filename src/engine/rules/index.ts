import type { ScannedElement, Finding } from '../element-tree.js'
import missingTestId from './missing-test-id.js'
import missingAriaLabel from './missing-aria-label.js'
import textOnlyLocator from './text-only-locator.js'
import genericRole from './generic-role.js'
import duplicateTestId from './duplicate-test-id.js'
import missingFormLabel from './missing-form-label.js'
import unlabelledImageButton from './unlabelled-image-button.js'

type Rule = (element: ScannedElement, all: ScannedElement[]) => Finding | null

export const rules: Rule[] = [
  missingTestId,
  missingAriaLabel,
  textOnlyLocator,
  genericRole,
  duplicateTestId,
  missingFormLabel,
  unlabelledImageButton,
]
