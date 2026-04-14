import { readFileSync } from 'fs'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import fg from 'fast-glob'
import type { ScannedElement } from '../engine/element-tree.js'
import { isInteractiveElement } from '../engine/element-tree.js'

// @babel/traverse ships as CommonJS — types don't declare call signatures in NodeNext interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = ((_traverse as any).default ?? _traverse) as any

const JSX_EXTENSIONS = ['**/*.jsx', '**/*.tsx', '**/*.js', '**/*.ts']

function getAttrValue(attr: t.JSXAttribute): string | undefined {
  const val = attr.value
  if (!val) return 'true'
  if (t.isStringLiteral(val)) return val.value
  if (t.isJSXExpressionContainer(val)) {
    const expr = val.expression
    if (t.isStringLiteral(expr)) return expr.value
    if (t.isNumericLiteral(expr)) return String(expr.value)
    if (t.isTemplateLiteral(expr) && expr.quasis.length === 1) {
      return expr.quasis[0].value.cooked ?? undefined
    }
    // Dynamic expression (ternary, logical, variable, etc.) — attribute is present but runtime-determined
    if (!t.isJSXEmptyExpression(expr)) return '[dynamic]'
  }
  return undefined
}

function getTagName(node: t.JSXOpeningElement): string {
  const name = node.name
  if (t.isJSXIdentifier(name)) return name.name.toLowerCase()
  if (t.isJSXMemberExpression(name)) return name.property.name.toLowerCase()
  return 'unknown'
}

function getTextContent(node: t.JSXElement): string {
  const parts: string[] = []
  for (const child of node.children) {
    if (t.isJSXText(child)) {
      parts.push(child.value)
    } else if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression
      if (t.isStringLiteral(expr)) {
        parts.push(expr.value)
      } else if (!t.isJSXEmptyExpression(expr)) {
        // Dynamic expression (ternary, logical, variable, etc.) — treat as having text content
        parts.push('[dynamic]')
      }
    } else if (t.isJSXElement(child)) {
      // Recurse into nested elements (e.g. <span>text</span> inside a <a> or <button>)
      const nested = getTextContent(child)
      if (nested) parts.push(nested)
    }
  }
  return parts.join('').replace(/\s+/g, ' ').trim()
}

const EVENT_HANDLER_PROPS = new Set([
  'onClick', 'onKeyDown', 'onKeyUp', 'onKeyPress',
  'onMouseDown', 'onMouseUp', 'onPointerDown', 'onPointerUp',
  'onFocus', 'onBlur', 'onChange',
])

function buildElement(node: t.JSXElement, file: string): ScannedElement {
  const opening = node.openingElement
  const tag = getTagName(opening)
  const attributes: ScannedElement['attributes'] = {}
  let role: string | undefined
  let hasEventHandler = false

  for (const attr of opening.attributes) {
    if (!t.isJSXAttribute(attr)) continue
    const name = t.isJSXIdentifier(attr.name) ? attr.name.name : attr.name.namespace.name + ':' + attr.name.name.name
    const value = getAttrValue(attr)

    if (EVENT_HANDLER_PROPS.has(name)) {
      hasEventHandler = true
      continue
    }

    switch (name) {
      case 'data-testid':
      case 'data-cy':
      case 'data-test':
        attributes.dataTestId = value
        break
      case 'aria-label':
        attributes.ariaLabel = value
        break
      case 'aria-labelledby':
        attributes.ariaLabelledBy = value
        break
      case 'placeholder':
        attributes.placeholder = value
        break
      case 'type':
        attributes.type = value
        break
      case 'href':
        attributes.href = value
        break
      case 'id':
        attributes.id = value
        break
      case 'name':
        attributes.name = value
        break
      case 'alt':
        attributes.alt = value
        break
      case 'role':
        role = value
        break
    }
  }

  const textContent = getTextContent(node)
  const el: ScannedElement = {
    tag,
    role,
    attributes,
    textContent: textContent || undefined,
    isInteractive: false,
    hasEventHandler,
    location: {
      file,
      line: opening.loc?.start.line,
    },
  }
  el.isInteractive = isInteractiveElement(el)
  return el
}

function shouldInclude(el: ScannedElement): boolean {
  return (
    el.isInteractive ||
    el.tag === 'div' ||
    el.tag === 'span' ||
    el.tag === 'input' ||
    el.tag === 'form'
  )
}

export async function analyzeSource(input: string): Promise<ScannedElement[]> {
  let files: string[]

  const isFile = input.endsWith('.jsx') || input.endsWith('.tsx') ||
    input.endsWith('.js') || input.endsWith('.ts')

  if (isFile) {
    files = [input]
  } else {
    files = await fg(JSX_EXTENSIONS, { cwd: input, absolute: true, ignore: ['**/node_modules/**'] })
  }

  const elements: ScannedElement[] = []

  for (const file of files) {
    let code: string
    try {
      code = readFileSync(file, 'utf-8')
    } catch {
      continue
    }

    let ast: t.File
    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true,
      })
    } catch {
      continue
    }

    traverse(ast, {
      JSXElement(path: NodePath<t.JSXElement>) {
        const el = buildElement(path.node, file)
        if (shouldInclude(el)) elements.push(el)
      },
    })
  }

  return elements
}
