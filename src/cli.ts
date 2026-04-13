#!/usr/bin/env node
import { program } from 'commander'
import { analyzeSource } from './analyzers/source.js'
import { analyzeDom } from './analyzers/dom.js'
import { runRules, computeScore } from './engine/scorer.js'
import { writeReport } from './reporter/html.js'
import type { ScanResult } from './engine/element-tree.js'

program
  .name('testability-scanner')
  .description("Audit your web app's testability score")
  .version('0.1.0')

program
  .argument('[path]', 'Path to JSX/TSX source directory or file (source mode)')
  .option('--url <url>', 'URL to scan (URL mode)')
  .option('--output <file>', 'Output HTML report path', 'testability-report.html')
  .option('--threshold <n>', 'Minimum score to pass (exit 1 if below)', '0')
  .action(async (path: string | undefined, options: { url?: string; output: string; threshold: string }) => {
    const threshold = parseInt(options.threshold, 10)

    if (!path && !options.url) {
      console.error('Error: provide a source path or --url <url>')
      program.help()
      process.exit(1)
    }

    if (path && options.url) {
      console.error('Error: use either a source path or --url, not both')
      process.exit(1)
    }

    const mode: 'source' | 'url' = options.url ? 'url' : 'source'
    const target = (options.url ?? path) as string

    console.log(`Scanning ${mode === 'url' ? target : path} …`)

    const elements = mode === 'url'
      ? await analyzeDom(target)
      : await analyzeSource(target)

    const findings = runRules(elements)
    const score = computeScore(findings)

    const result: ScanResult = {
      mode,
      target,
      timestamp: new Date().toISOString(),
      elements,
      findings,
      score,
    }

    writeReport(result, options.output)

    const errors = findings.filter(f => f.severity === 'error').length
    const warnings = findings.filter(f => f.severity === 'warning').length

    console.log(`\nScore:    ${score}/100 ${score >= 80 ? '✓' : score >= 50 ? '!' : '✗'}`)
    console.log(`Errors:   ${errors}`)
    console.log(`Warnings: ${warnings}`)
    console.log(`Elements: ${elements.length} scanned`)
    console.log(`Report:   ${options.output}`)

    if (score < threshold) {
      console.error(`\nFailed: score ${score} is below threshold ${threshold}`)
      process.exit(1)
    }
  })

program.parse()
