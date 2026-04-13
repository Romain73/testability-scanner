# Testability Scanner — Implementation Plan

**Date:** 2026-04-10
**Spec:** [2026-04-10-testability-scanner-design.md](../specs/2026-04-10-testability-scanner-design.md)

---

## Phase 1 — Project Scaffold

**Goal:** Runnable Node.js TypeScript CLI with no logic yet.

### Steps

1. **Initialize project**
   - `npm init -y`
   - Install dev dependencies: `typescript`, `@types/node`, `tsx` (for running TS directly)
   - Install runtime dependencies: `@babel/parser`, `@babel/traverse`, `@babel/types`, `@types/babel__traverse`, `playwright`, `commander`
   - Create `tsconfig.json` (target: `ES2022`, module: `NodeNext`, strict: true)
   - Add `bin` field in `package.json` pointing to compiled CLI entry point

2. **Create directory structure**
   ```
   src/
     cli.ts
     analyzers/
       source.ts
       dom.ts
     engine/
       element-tree.ts
       rules/
         index.ts
         missing-test-id.ts
         missing-aria-label.ts
         text-only-locator.ts
         generic-role.ts
         duplicate-test-id.ts
         missing-form-label.ts
         unlabelled-image-button.ts
       scorer.ts
     reporter/
       html.ts
   ```

3. **Stub `cli.ts`** with `commander` — parse `--url`, `--output`, `--threshold` flags, print "not implemented" and exit 0.

**Done when:** `npx tsx src/cli.ts --help` prints usage without errors.

---

## Phase 2 — Shared Types & Element Tree

**Goal:** Define the contracts all other modules depend on.

### Steps

4. **Write `src/engine/element-tree.ts`**
   - Export `ScannedElement` interface (tag, role, attributes, textContent, isInteractive, location)
   - Export `Finding` interface (element, rule, severity, message, suggestion)
   - Export `ScanResult` interface (elements, findings, score, mode, target, timestamp)
   - Export `INTERACTIVE_TAGS` constant: `['button', 'input', 'select', 'textarea', 'a']`
   - Export `INTERACTIVE_ROLES` constant: `['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'option']`
   - Export `isInteractiveElement(el: ScannedElement): boolean` helper

**Done when:** Types compile cleanly and can be imported by other modules.

---

## Phase 3 — Rules Engine

**Goal:** All 7 rules implemented and unit-testable in isolation.

### Steps

5. **Write each rule file** in `src/engine/rules/`

   Each file exports a default function: `(element: ScannedElement, all: ScannedElement[]) => Finding | null`

   - `missing-test-id.ts` — fires if `isInteractive` and `attributes.dataTestId` is absent
   - `missing-aria-label.ts` — fires if `isInteractive` and no accessible name (no ariaLabel, ariaLabelledBy, placeholder, textContent)
   - `text-only-locator.ts` — fires if `isInteractive` and `textContent` is the ONLY identifier (no dataTestId, no ariaLabel, no id)
   - `generic-role.ts` — fires if tag is `div` or `span` and no `role` attribute
   - `duplicate-test-id.ts` — fires if `dataTestId` exists and another element in `all` shares it (skip first occurrence, flag subsequent ones)
   - `missing-form-label.ts` — fires if tag is `input` and no `ariaLabel`, `ariaLabelledBy`, or `placeholder`
   - `unlabelled-image-button.ts` — fires if tag is `button` or `a` and textContent is empty and no `ariaLabel`

6. **Write `src/engine/rules/index.ts`**
   - Import and export all rules as an array: `export const rules = [...]`

7. **Write `src/engine/scorer.ts`**
   - `runRules(elements: ScannedElement[]): Finding[]` — applies all rules to all elements
   - `computeScore(findings: Finding[]): number` — `clamp(100 - (errors × 5 + warnings × 2), 0, 100)`

**Done when:** Can call `runRules([])` and `computeScore([])` without errors.

---

## Phase 4 — Source Analyzer (JSX/TSX)

**Goal:** Parse a directory of JSX/TSX files into `ScannedElement[]`.

### Steps

8. **Write `src/analyzers/source.ts`**
   - `analyzeSource(paths: string[]): Promise<ScannedElement[]>`
   - Use `glob` (or `fast-glob`) to expand directory input to `.jsx`, `.tsx`, `.js`, `.ts` files
   - For each file: parse with `@babel/parser` (plugins: `jsx`, `typescript`)
   - Use `@babel/traverse` to visit `JSXElement` nodes
   - For each JSX element:
     - Extract `tag` from `JSXOpeningElement.name`
     - Extract attributes: map JSX attribute names to `ScannedElement.attributes` fields
       - `data-testid` / `data-cy` / `data-test` → `dataTestId`
       - `aria-label` → `ariaLabel`
       - `aria-labelledby` → `ariaLabelledBy`
       - `placeholder`, `type`, `href`, `id`, `name` → direct mapping
       - `role` → `role` field
     - Extract `textContent` from JSXText children (concatenate, trim)
     - Set `isInteractive` using `isInteractiveElement` helper
     - Set `location.file` and `location.line` from the node's `loc`
   - Add `fast-glob` to dependencies

**Done when:** Running on a small JSX fixture file produces a non-empty `ScannedElement[]` with correct attribute mapping.

---

## Phase 5 — DOM Analyzer (URL mode)

**Goal:** Load a URL with Playwright and produce `ScannedElement[]`.

### Steps

9. **Write `src/analyzers/dom.ts`**
   - `analyzeDom(url: string): Promise<ScannedElement[]>`
   - Launch Playwright Chromium (headless)
   - Navigate to `url`, wait for `networkidle`
   - Query all elements matching: `button, input, select, textarea, a, [role], div, span`
   - For each element, use `page.evaluate()` to extract:
     - `tagName` (lowercased)
     - `role` attribute
     - `data-testid` / `data-cy` / `data-test`
     - `aria-label`, `aria-labelledby`
     - `placeholder`, `type`, `href`, `id`, `name`
     - `innerText` (trimmed)
   - Map to `ScannedElement`, set `isInteractive` via helper
   - Set `location.selector` using a CSS path derived from element position (tagName + nth-of-type chain)
   - Close browser

**Done when:** Running against a real URL (e.g. `https://example.com`) returns a non-empty `ScannedElement[]`.

---

## Phase 6 — HTML Reporter

**Goal:** Turn a `ScanResult` into a self-contained HTML file.

### Steps

10. **Write `src/reporter/html.ts`**
    - `generateReport(result: ScanResult): string` — returns full HTML string
    - Inline all CSS and JS as template literals (no external files)
    - Score card color: green if ≥ 80, amber if 50–79, red if < 50
    - Findings table: sortable by severity (errors first), columns: severity badge, rule ID, tag, location, message, suggestion
    - Client-side filter: two `<select>` dropdowns (severity filter, rule filter) that hide/show table rows via JS
    - `writeReport(result: ScanResult, outputPath: string): Promise<void>` — writes the HTML string to file

**Done when:** Calling `generateReport` with a mock `ScanResult` produces valid, openable HTML.

---

## Phase 7 — Wire Up CLI

**Goal:** End-to-end working tool.

### Steps

11. **Complete `src/cli.ts`**
    - Parse args with `commander`:
      - Positional `[path]` argument for source mode
      - `--url <url>` for URL mode
      - `--output <file>` (default: `testability-report.html`)
      - `--threshold <n>` (default: `0`)
    - If neither `path` nor `--url` provided: print error + usage, exit 1
    - Route to `analyzeSource(paths)` or `analyzeDom(url)`
    - Run `runRules(elements)` → `computeScore(findings)` → build `ScanResult`
    - Print summary to stdout: score, error count, warning count, output file path
    - Call `writeReport(result, outputPath)`
    - Exit with code `1` if `score < threshold`, else `0`

**Done when:** Both of these work end-to-end:
```bash
npx tsx src/cli.ts ./fixtures --output report.html
npx tsx src/cli.ts --url https://example.com --output report.html
```

---

## Phase 8 — Build & Package

**Goal:** Installable and publishable npm package.

### Steps

12. **Configure build**
    - Add `tsc` build script to `package.json`
    - Set `outDir: dist` in `tsconfig.json`
    - Add `#!/usr/bin/env node` shebang to compiled `cli.js`
    - Add `files` field in `package.json`: `["dist"]`
    - Add `prepare` script: `tsc`

13. **Smoke test built package**
    - `npm run build`
    - `node dist/cli.js --help`
    - `node dist/cli.js --url https://example.com`

**Done when:** `npm pack` produces a tarball that works when installed globally.

---

## Fixtures for Testing

Create `fixtures/` directory with sample JSX files covering:
- A well-annotated button (passes all rules)
- A button with no `data-testid` (triggers `missing-test-id`)
- An `<input>` with no label (triggers `missing-form-label`)
- A `<div>` used as a button (triggers `generic-role`)
- Two elements with the same `data-testid` (triggers `duplicate-test-id`)

These serve as manual verification inputs during development.

---

## Dependency Summary

```json
{
  "dependencies": {
    "@babel/parser": "^7",
    "@babel/traverse": "^7",
    "@babel/types": "^7",
    "commander": "^12",
    "fast-glob": "^3",
    "playwright": "^1"
  },
  "devDependencies": {
    "@types/babel__traverse": "^7",
    "@types/node": "^20",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```
