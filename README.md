# testability-scanner

Static analysis tool that audits your web app's testability score — flagging missing selectors, unstable locators, and automation blind spots before they become flaky tests.

## How it works

The scanner operates in two modes:

- **Source mode** — parses your React JSX/TSX files via AST and detects issues at the code level
- **URL mode** — loads a live URL in a headless browser (Playwright) and inspects the rendered DOM

Both modes run the same rules engine and produce the same HTML report.

## Installation

```bash
npm install -g testability-scanner
```

Or run without installing:

```bash
npx testability-scanner ./src
```

## Usage

### Source mode

Point at a directory or a single file:

```bash
testability-scanner ./src
testability-scanner ./src/components/Button.tsx
```

### URL mode

Point at a live URL (single page snapshot):

```bash
testability-scanner --url https://myapp.com
```

### Options

| Flag | Default | Description |
|---|---|---|
| `--url <url>` | — | URL to scan (URL mode) |
| `--output <file>` | `testability-report.html` | Path for the HTML report |
| `--threshold <n>` | `0` | Minimum score — exits with code `1` if below |

### CI integration

Use `--threshold` to gate your pipeline:

```bash
testability-scanner ./src --threshold 80
```

Exit code `0` = passed, `1` = score below threshold.

Example GitHub Actions step:

```yaml
- name: Check testability
  run: npx testability-scanner ./src --threshold 80
```

## Rules

| Rule | Severity | Flags |
|---|---|---|
| `missing-test-id` | error | Interactive element with no `data-testid`, `data-cy`, or `data-test` |
| `missing-aria-label` | error | Interactive element with no accessible name |
| `missing-form-label` | error | `<input>` with no label, `aria-label`, or placeholder |
| `unlabelled-image-button` | error | `<button>` or `<a>` with no text or `aria-label` |
| `duplicate-test-id` | error | Multiple elements sharing the same `data-testid` |
| `text-only-locator` | warning | Interactive element identifiable only by its text content |
| `generic-role` | warning | `<div>` or `<span>` with no `role` attribute |

## Scoring

```
score = clamp(100 − (errors × 5 + warnings × 2), 0, 100)
```

| Score | Status |
|---|---|
| ≥ 80 | Passing |
| 50–79 | Needs attention |
| < 50 | Critical |

## Report

The `--output` file is a self-contained HTML file with no external dependencies. It includes:

- Score card (color-coded)
- Summary: elements scanned, error count, warning count
- Filterable findings table: severity, rule, element, location, issue, suggestion

## Local development

```bash
npm install
npx tsx src/cli.ts ./fixtures --output report.html
```

Build:

```bash
npm run build
node dist/cli.js ./src
```
