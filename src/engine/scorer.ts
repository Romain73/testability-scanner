import type { ScannedElement, Finding } from './element-tree.js'
import { rules } from './rules/index.js'

export function runRules(elements: ScannedElement[]): Finding[] {
  const findings: Finding[] = []
  for (const element of elements) {
    for (const rule of rules) {
      const finding = rule(element, elements)
      if (finding) findings.push(finding)
    }
  }
  return findings
}

export function computeScore(findings: Finding[]): number {
  const errors = findings.filter(f => f.severity === 'error').length
  const warnings = findings.filter(f => f.severity === 'warning').length
  return Math.max(0, Math.min(100, 100 - errors * 5 - warnings * 2))
}
