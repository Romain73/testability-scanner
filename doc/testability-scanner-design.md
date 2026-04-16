# Testability Scanner — Design Spec

**Date:** 2026-04-10
**Status:** Approved

---

## Overview

`testability-scanner` is a Node.js CLI tool that audits a web application's testability score. It flags missing selectors, unstable locators, and automation blind spots before they become flaky tests.

The tool operates in two modes:

- **Source mode** — statically analyzes React JSX/TSX files via AST parsing
- **URL mode** — loads a live URL in a headless browser and inspects the rendered DOM

Both modes produce the same output: a scored HTML report of findings.

---

## Architecture

```
src/
  cli.ts                  # Entry point — parses args, routes to mode
  analyzers/
    source.ts             # JSX/TSX AST analyzer (@babel/parser + @babel/traverse)
    dom.ts                # Playwright DOM analyzer
  engine/
    element-tree.ts       # ScannedElement schema (shared intermediate representation)
    rules/                # One file per rule
      missing-test-id.ts
      missing-aria-label.ts
      text-only-locator.ts
      generic-role.ts
      duplicate-test-id.ts
      missing-form-label.ts
      unlabelled-image-button.ts
    scorer.ts             # Computes testability score from findings
  reporter/
    html.ts               # Generates self-contained HTML report
```

Both analyzers produce `ScannedElement[]`. The rules engine processes this list identically regardless of source. This means adding a new rule instantly applies to both modes.

---

## CLI Interface

```bash
# Source mode — directory or file(s)
testability-scanner ./src
testability-scanner ./src/components/Button.tsx

# URL mode — single page snapshot
testability-scanner --url https://myapp.com

# Optional: custom output path (default: testability-report.html)
testability-scanner ./src --output report.html
testability-scanner --url https://myapp.com --output report.html

# Optional: CI threshold — exits with code 1 if score < N
testability-scanner ./src --threshold 80
```

**Exit codes:**

- `0` — scan completed, score at or above threshold (default threshold: 0)
- `1` — score below threshold, or unrecoverable error

---

## Shared Intermediate Representation

Both analyzers normalize their findings into `ScannedElement` objects before the rules engine runs:

```ts
interface ScannedElement {
  tag: string
  role?: string
  attributes: {
    id?: string
    name?: string
    ariaLabel?: string
    ariaLabelledBy?: string
    dataTestId?: string // normalized from data-testid, data-cy, or data-test (whichever is present)
    placeholder?: string
    type?: string
    href?: string
    [key: string]: string | undefined
  }
  textContent?: string
  isInteractive: boolean // true for: button, input, select, textarea, a, or any element with role="button|link|checkbox|radio|tab|menuitem|option"
  hasEventHandler?: boolean // true if element has onClick, onKeyDown, onChange, etc.
  location: {
    // Source mode
    file?: string
    line?: number
    // URL mode
    selector?: string
  }
}
```

**Source analyzer:** Uses `@babel/parser` (with JSX + TypeScript plugins) and `@babel/traverse` to walk JSX element nodes. Extracts attributes and infers interactivity from tag name (`button`, `input`, `a`, `select`, `textarea`) or explicit `role` prop.

**Interactive element definition:** An element is considered interactive if its tag is one of `button`, `input`, `select`, `textarea`, `a` — or if it carries an explicit `role` of `button`, `link`, `checkbox`, `radio`, `tab`, `menuitem`, or `option`. All rules that reference "interactive element" use this definition.

**DOM analyzer:** Uses Playwright to load the URL, then queries all elements matching interactive tags and landmark roles. Maps DOM attributes to the `ScannedElement` schema. Runs without a visible browser window (headless).

---

## Rules Engine

Each rule is a pure function `(element: ScannedElement, allElements: ScannedElement[]) => Finding | null`.

```ts
interface Finding {
  element: ScannedElement
  rule: string
  severity: 'error' | 'warning'
  message: string
  suggestion: string
}
```

### Initial Ruleset

| Rule ID                   | Severity | Description                                                                                                                |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `missing-test-id`         | error    | Interactive element has no `data-testid` (or `data-cy`, `data-test`)                                                       |
| `missing-aria-label`      | error    | Interactive element has no accessible name — no `aria-label`, `aria-labelledby`, `placeholder`, `<label>`, or visible text |
| `text-only-locator`       | warning  | Interactive element is only identifiable by its text content (fragile if copy changes)                                     |
| `generic-role`            | warning  | `<div>` or `<span>` with an event handler but no `role` attribute (layout divs without handlers are ignored)               |
| `duplicate-test-id`       | error    | Two or more elements share the same `data-testid` value                                                                    |
| `missing-form-label`      | error    | `<input>` has no associated `<label>`, `placeholder`, or `aria-label`                                                      |
| `unlabelled-image-button` | error    | `<button>` or `<a>` contains only an image with no `alt` text or `aria-label`                                              |

Rules live in `engine/rules/` as individual files. Adding a new rule requires only creating a new file and registering it in an index — no changes to the engine or analyzers.

---

## Scoring

```
score = clamp(100 - (errorCount × 5 + warningCount × 2), 0, 100)
```

- Each `error` deducts 5 points
- Each `warning` deducts 2 points
- Score is clamped between 0 and 100

The `--threshold` flag makes CI gating straightforward: `--threshold 80` fails the run if the score falls below 80.

---

## HTML Report

A single self-contained `.html` file with inline CSS and JS (no external dependencies, no CDN calls). Sections:

1. **Header** — tool name, mode (source/URL), timestamp, path or URL scanned
2. **Score card** — large score number, color-coded:
   - Green (≥ 80): passing
   - Amber (50–79): needs attention
   - Red (< 50): critical
3. **Summary bar** — total elements scanned, error count, warning count
4. **Findings table** — one row per finding:
   - Severity badge (error/warning)
   - Rule ID
   - Element tag + location (file:line for source mode, CSS selector for URL mode)
   - Message describing the issue
   - Suggestion for how to fix it
5. **Client-side filter** — plain JS filter by severity and/or rule ID, no page reload

---

## Dependencies

| Package           | Purpose                             |
| ----------------- | ----------------------------------- |
| `@babel/parser`   | Parse JSX/TSX source files into AST |
| `@babel/traverse` | Walk AST nodes                      |
| `@babel/types`    | AST node type helpers               |
| `playwright`      | Headless browser for URL mode       |
| `commander`       | CLI argument parsing                |

No runtime dependencies beyond these. The HTML report is self-contained.

---

## Out of Scope (v1)

- Multi-page crawling (single URL snapshot only)
- VS Code extension
- Custom rule configuration via config file
- React Native or non-web targets
- Authentication / login flows for URL mode
