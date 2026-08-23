import { nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import mediumZoom from 'medium-zoom'
import mermaid from 'mermaid'
import './custom.css'

const MAX_ATTEMPTS = 20 // ponytail: poll ceiling per skill spec; raise if slow diagrams get missed
const INTERVAL_MS = 500

let timer: ReturnType<typeof setInterval> | undefined
let zoom: ReturnType<typeof mediumZoom> | undefined

function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#2d333b',
      primaryTextColor: '#e6edf3',
      primaryBorderColor: '#6d5dfc',
      lineColor: '#8b949e',
      secondaryColor: '#161b22',
      tertiaryColor: '#21262d',
      background: '#0d1117',
      mainBkg: '#2d333b',
      nodeBorder: '#6d5dfc',
      clusterBkg: '#161b22',
      clusterBorder: '#30363d',
      titleColor: '#e6edf3',
      edgeLabelBackground: '#0d1117',
    },
  })
}

// Convert ```mermaid code fences (VitePress renders them as pre>code) into div.mermaid containers
function convertMermaidBlocks(): number {
  let converted = 0
  document.querySelectorAll<HTMLElement>('pre > code.language-mermaid').forEach((code) => {
    const pre = code.parentElement as HTMLElement
    if (!pre || pre.hasAttribute('data-mermaid-src')) return
    const div = document.createElement('div')
    div.className = 'mermaid'
    div.textContent = code.textContent ?? ''
    pre.replaceWith(div)
    converted++
  })
  if (converted) mermaid.run({ nodes: Array.from(document.querySelectorAll<HTMLElement>('div.mermaid')) })
  return converted
}

// Layer 3 fix: mermaid inline style attributes beat CSS — rewrite them to the dark palette
function fixInlineStyles() {
  document.querySelectorAll<HTMLElement>('.mermaid svg [style]').forEach((el) => {
    const s = el.style
    if (s.fill && !s.fill.includes('#2d333b') && !s.fill.includes('none')) s.fill = '#2d333b'
    if (s.stroke && !s.stroke.includes('#6d5dfc') && !s.stroke.includes('#8b949e') && !s.stroke.includes('none')) s.stroke = '#6d5dfc'
    if (s.color) s.color = '#e6edf3'
  })
}

function openZoomOverlay(svg: SVGSVGElement) {
  const modal = document.createElement('div')
  modal.className = 'mermaid-zoom-modal'
  const clone = svg.cloneNode(true) as SVGSVGElement
  try {
    // mermaid SVGs ship width/height without a correct viewBox; rebuild it from the real bounds so CSS scaling works
    const bbox = svg.getBBox()
    clone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
  } catch {
    /* keep whatever viewBox the original had */
  }
  clone.removeAttribute('width')
  clone.removeAttribute('height')
  modal.appendChild(clone)
  modal.addEventListener('click', () => modal.remove())
  document.body.appendChild(modal)
}

function attachDiagramZoom() {
  document.querySelectorAll<SVGSVGElement>('.mermaid svg:not([data-zoom-attached])').forEach((svg) => {
    svg.setAttribute('data-zoom-attached', '')
    svg.style.cursor = 'zoom-in'
    svg.addEventListener('click', () => openZoomOverlay(svg))
  })
}

function attachImageZoom() {
  if (!zoom) zoom = mediumZoom([], { background: '#0d1117', margin: 32 })
  zoom.detach()
  const imgs = document.querySelectorAll('.vp-doc img:not([data-zoom-attached])')
  imgs.forEach((img) => img.setAttribute('data-zoom-attached', ''))
  if (imgs.length) zoom.attach(imgs)
}

function activate() {
  let attempts = 0
  stopPolling()
  timer = setInterval(() => {
    convertMermaidBlocks()
    fixInlineStyles()
    attachDiagramZoom()
    attachImageZoom()
    const pending =
      document.querySelectorAll('pre > code.language-mermaid').length +
      document.querySelectorAll('.mermaid svg:not([data-zoom-attached])').length
    if (++attempts >= MAX_ATTEMPTS || pending === 0) stopPolling()
  }, INTERVAL_MS)
}

function stopPolling() {
  if (timer) clearInterval(timer)
  timer = undefined
}

export default {
  extends: DefaultTheme,
  setup() {
    // enhanceApp runs during SSR where document doesn't exist — DOM work only from setup/onMounted
    onMounted(() => {
      initMermaid()
      const route = useRoute()
      watch(
        () => route.path,
        () => nextTick(activate),
        { immediate: true },
      )
    })
  },
}
