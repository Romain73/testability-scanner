import { chromium } from 'playwright'
import type { ScannedElement } from '../engine/element-tree.js'
import { isInteractiveElement } from '../engine/element-tree.js'

const QUERY_SELECTOR = [
  'button', 'input', 'select', 'textarea', 'a[href]',
  '[role]', 'div', 'span', 'form',
].join(', ')

interface RawElement {
  tag: string
  role: string | null
  dataTestId: string | null
  ariaLabel: string | null
  ariaLabelledBy: string | null
  placeholder: string | null
  type: string | null
  href: string | null
  id: string | null
  name: string | null
  alt: string | null
  textContent: string | null
  selectorPath: string
}

export async function analyzeDom(url: string): Promise<ScannedElement[]> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
  } catch {
    // If networkidle times out, proceed with what loaded
    await page.waitForLoadState('domcontentloaded').catch(() => {})
  }

  const rawElements: RawElement[] = await page.evaluate((selector) => {
    function buildSelectorPath(el: Element): string {
      const parts: string[] = []
      let current: Element | null = el
      while (current && current !== document.body) {
        const tag = current.tagName.toLowerCase()
        const parent: Element | null = current.parentElement
        if (parent) {
          const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName)
          const index = siblings.indexOf(current) + 1
          parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag)
        } else {
          parts.unshift(tag)
        }
        current = parent
      }
      return parts.join(' > ')
    }

    return Array.from(document.querySelectorAll(selector)).map((el): {
      tag: string; role: string | null; dataTestId: string | null; ariaLabel: string | null;
      ariaLabelledBy: string | null; placeholder: string | null; type: string | null;
      href: string | null; id: string | null; name: string | null; alt: string | null;
      textContent: string | null; selectorPath: string;
    } => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      dataTestId: el.getAttribute('data-testid') ?? el.getAttribute('data-cy') ?? el.getAttribute('data-test'),
      ariaLabel: el.getAttribute('aria-label'),
      ariaLabelledBy: el.getAttribute('aria-labelledby'),
      placeholder: el.getAttribute('placeholder'),
      type: el.getAttribute('type'),
      href: el.getAttribute('href'),
      id: el.getAttribute('id'),
      name: el.getAttribute('name'),
      alt: el.getAttribute('alt'),
      textContent: el.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      selectorPath: buildSelectorPath(el),
    }))
  }, QUERY_SELECTOR)

  await browser.close()

  return rawElements.map((raw): ScannedElement => {
    const el: ScannedElement = {
      tag: raw.tag,
      role: raw.role ?? undefined,
      attributes: {
        dataTestId: raw.dataTestId ?? undefined,
        ariaLabel: raw.ariaLabel ?? undefined,
        ariaLabelledBy: raw.ariaLabelledBy ?? undefined,
        placeholder: raw.placeholder ?? undefined,
        type: raw.type ?? undefined,
        href: raw.href ?? undefined,
        id: raw.id ?? undefined,
        name: raw.name ?? undefined,
        alt: raw.alt ?? undefined,
      },
      textContent: raw.textContent || undefined,
      isInteractive: false,
      location: {
        selector: raw.selectorPath,
      },
    }
    el.isInteractive = isInteractiveElement(el)
    return el
  })
}
