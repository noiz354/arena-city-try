import { expect, test } from '@playwright/test'

/**
 * Browser smoke test (runs in CI where Playwright browsers are installed):
 * - the page boots and the loading screen clears
 * - the HUD renders and the FPS counter ticks
 * - the WebGL canvas is present and sized
 * - no console/page errors are thrown during boot + a few frames
 */
test('game boots, renders frames, and logs no errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(`pageerror: ${String(err)}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
  })

  await page.goto('/')

  // loading screen must clear (first rendered frame)
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 30_000 })

  // HUD appears with the game title
  await expect(page.locator('.hud__title')).toContainText('CITY RUSH')

  // WebGL canvas exists and is sized
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(100)
  expect(box!.height).toBeGreaterThan(100)

  // let a few frames render, then check the FPS counter is live
  await page.waitForTimeout(1500)
  const fps = await page.locator('#hud-fps').textContent()
  expect(fps).toMatch(/FPS: \d+/)

  // artifact for visual inspection
  await page.screenshot({ path: 'artifacts/visual-boot.png' })

  // a real boot must be error-free
  expect(errors, `console/page errors:\n${errors.join('\n')}`).toEqual([])
})
