export interface ScannedElement {
  tag: string
  role?: string
  attributes: {
    id?: string
    name?: string
    ariaLabel?: string
    ariaLabelledBy?: string
    /** Normalized from data-testid, data-cy, or data-test (whichever is present) */
    dataTestId?: string
    placeholder?: string
    type?: string
    href?: string
    alt?: string
    [key: string]: string | undefined
  }
  textContent?: string
  isInteractive: boolean
  hasEventHandler?: boolean
  location: {
    file?: string
    line?: number
    selector?: string
  }
}

export interface Finding {
  element: ScannedElement
  rule: string
  severity: 'error' | 'warning'
  message: string
  suggestion: string
}

export interface ScanResult {
  mode: 'source' | 'url'
  target: string
  timestamp: string
  elements: ScannedElement[]
  findings: Finding[]
  score: number
}

export const INTERACTIVE_TAGS = new Set([
  'button', 'input', 'select', 'textarea', 'a',
])

export const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option',
])

export function isInteractiveElement(el: ScannedElement): boolean {
  return (
    INTERACTIVE_TAGS.has(el.tag) ||
    (el.role != null && INTERACTIVE_ROLES.has(el.role))
  )
}
