import { writeFileSync } from 'fs'
import type { ScanResult, Finding } from '../engine/element-tree.js'

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Passing'
  if (score >= 50) return 'Needs attention'
  return 'Critical'
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function locationString(finding: Finding): string {
  const loc = finding.element.location
  if (loc.file) {
    const short = loc.file.split('/').slice(-2).join('/')
    return `${short}${loc.line ? `:${loc.line}` : ''}`
  }
  if (loc.selector) return loc.selector
  return '—'
}

function findingRow(finding: Finding, index: number): string {
  const badgeColor = finding.severity === 'error' ? '#ef4444' : '#f59e0b'
  const loc = escapeHtml(locationString(finding))
  const tag = escapeHtml(`<${finding.element.tag}>`)
  const rule = escapeHtml(finding.rule)
  const message = escapeHtml(finding.message)
  const suggestion = escapeHtml(finding.suggestion)

  return `
    <tr data-severity="${finding.severity}" data-rule="${finding.rule}" ${index % 2 === 0 ? '' : 'class="alt"'}>
      <td><span class="badge" style="background:${badgeColor}">${finding.severity}</span></td>
      <td><code>${rule}</code></td>
      <td><code>${tag}</code></td>
      <td class="loc">${loc}</td>
      <td>${message}</td>
      <td class="suggestion">${suggestion}</td>
    </tr>`
}

function uniqueRules(findings: Finding[]): string[] {
  return [...new Set(findings.map(f => f.rule))].sort()
}

export function generateReport(result: ScanResult): string {
  const color = scoreColor(result.score)
  const label = scoreLabel(result.score)
  const errors = result.findings.filter(f => f.severity === 'error').length
  const warnings = result.findings.filter(f => f.severity === 'warning').length
  const sorted = [...result.findings].sort((a, b) => {
    if (a.severity === b.severity) return a.rule.localeCompare(b.rule)
    return a.severity === 'error' ? -1 : 1
  })
  const ruleOptions = uniqueRules(result.findings).map(r =>
    `<option value="${r}">${r}</option>`
  ).join('\n')
  const rows = sorted.map((f, i) => findingRow(f, i)).join('\n')
  const timestamp = new Date(result.timestamp).toLocaleString()
  const modeLabel = result.mode === 'url' ? 'URL' : 'Source'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Testability Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
  header { margin-bottom: 2rem; }
  header h1 { font-size: 1.5rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.02em; }
  header p { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
  .score-card { display: flex; align-items: center; gap: 1.5rem; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1.5rem 2rem; margin-bottom: 1.5rem; }
  .score-number { font-size: 4rem; font-weight: 800; line-height: 1; color: ${color}; }
  .score-meta h2 { font-size: 1.25rem; font-weight: 600; color: ${color}; }
  .score-meta p { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
  .summary { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .stat { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem 1.5rem; flex: 1; }
  .stat-value { font-size: 2rem; font-weight: 700; }
  .stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.25rem; }
  .stat.errors .stat-value { color: #ef4444; }
  .stat.warnings .stat-value { color: #f59e0b; }
  .stat.total .stat-value { color: #60a5fa; }
  .filters { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; }
  .filters label { font-size: 0.875rem; color: #94a3b8; }
  .filters select { background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #e2e8f0; padding: 0.375rem 0.75rem; font-size: 0.875rem; cursor: pointer; }
  .filters select:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
  table { width: 100%; border-collapse: collapse; background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; font-size: 0.875rem; }
  th { text-align: left; padding: 0.75rem 1rem; background: #0f172a; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
  td { padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; vertical-align: top; line-height: 1.5; }
  tr.alt td { background: #172033; }
  tr:last-child td { border-bottom: none; }
  tr[hidden] { display: none; }
  code { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8125rem; background: #0f172a; padding: 0.125rem 0.375rem; border-radius: 4px; color: #7dd3fc; }
  .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #fff; }
  .loc { color: #94a3b8; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.75rem; max-width: 200px; word-break: break-all; }
  .suggestion { color: #86efac; }
  .no-findings { text-align: center; padding: 3rem; color: #94a3b8; }
  .no-findings strong { display: block; font-size: 1.25rem; color: #22c55e; margin-bottom: 0.5rem; }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Testability Scanner</h1>
    <p>${modeLabel} scan &mdash; ${escapeHtml(result.target)} &mdash; ${timestamp}</p>
  </header>

  <div class="score-card">
    <div class="score-number">${result.score}</div>
    <div class="score-meta">
      <h2>${label}</h2>
      <p>Testability score out of 100</p>
    </div>
  </div>

  <div class="summary">
    <div class="stat errors">
      <div class="stat-value">${errors}</div>
      <div class="stat-label">Errors</div>
    </div>
    <div class="stat warnings">
      <div class="stat-value">${warnings}</div>
      <div class="stat-label">Warnings</div>
    </div>
    <div class="stat total">
      <div class="stat-value">${result.elements.length}</div>
      <div class="stat-label">Elements scanned</div>
    </div>
  </div>

  ${result.findings.length === 0 ? `
  <div class="no-findings">
    <strong>No issues found</strong>
    All scanned elements passed the testability rules.
  </div>` : `
  <div class="filters">
    <label for="sev-filter">Severity:</label>
    <select id="sev-filter">
      <option value="all">All</option>
      <option value="error">Errors only</option>
      <option value="warning">Warnings only</option>
    </select>
    <label for="rule-filter">Rule:</label>
    <select id="rule-filter">
      <option value="all">All rules</option>
      ${ruleOptions}
    </select>
  </div>
  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Rule</th>
        <th>Element</th>
        <th>Location</th>
        <th>Issue</th>
        <th>Suggestion</th>
      </tr>
    </thead>
    <tbody id="findings-body">
      ${rows}
    </tbody>
  </table>`}
</div>
<script>
  const sevFilter = document.getElementById('sev-filter')
  const ruleFilter = document.getElementById('rule-filter')
  function applyFilters() {
    const sev = sevFilter.value
    const rule = ruleFilter.value
    document.querySelectorAll('#findings-body tr').forEach(row => {
      const sevMatch = sev === 'all' || row.dataset.severity === sev
      const ruleMatch = rule === 'all' || row.dataset.rule === rule
      row.hidden = !(sevMatch && ruleMatch)
    })
  }
  sevFilter?.addEventListener('change', applyFilters)
  ruleFilter?.addEventListener('change', applyFilters)
</script>
</body>
</html>`
}

export function writeReport(result: ScanResult, outputPath: string): void {
  const html = generateReport(result)
  writeFileSync(outputPath, html, 'utf-8')
}
