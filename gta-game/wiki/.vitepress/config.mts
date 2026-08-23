import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// wiki/ root (this file lives at <root>/.vitepress/config.mts)
const wikiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

interface CatalogueItem {
  title: string
  name: string
  sourceDoc: string | null
  children: CatalogueItem[]
}

// Frontmatter title wins when the page has already been written; catalogue title is the fallback
function frontmatterTitle(mdPath: string): string | undefined {
  try {
    const head = fs.readFileSync(mdPath, 'utf8').slice(0, 600)
    const fm = head.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    return fm?.[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1]
  } catch {
    return undefined
  }
}

function resolveTitle(item: CatalogueItem, trail: string[]): string {
  return frontmatterTitle(path.join(wikiRoot, ...trail, item.name + '.md')) ?? item.title
}

function toSidebarItem(item: CatalogueItem, trail: string[]): any {
  const segs = [...trail, item.name]
  const entry: any = { text: resolveTitle(item, trail), link: '/' + segs.join('/') }
  if (item.children.length) {
    entry.items = item.children.map((c) => toSidebarItem(c, segs))
    entry.collapsed = true
  }
  return entry
}

const catalogue = JSON.parse(fs.readFileSync(path.join(wikiRoot, 'catalogue.json'), 'utf8'))

const sidebar = catalogue.items.map((section: CatalogueItem) => ({
  text: section.title,
  collapsed: true,
  items: section.children.map((c) => toSidebarItem(c, [section.name])),
}))

export default defineConfig({
  lang: 'en-US',
  title: 'CITY RUSH Wiki',
  description: 'Implementation wiki for the CITY RUSH Three.js open-world browser game',
  appearance: 'dark',
  ignoreDeadLinks: true,
  markdown: { theme: 'github-dark' },
  themeConfig: {
    siteTitle: 'CITY RUSH — Implementation Wiki',
    nav: [{ text: 'GitHub', link: catalogue.repoUrl }],
    sidebar,
    socialLinks: [{ icon: 'github', link: catalogue.repoUrl }],
    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous', next: 'Next' },
  },
})
