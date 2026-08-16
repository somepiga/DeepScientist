import { expect, test } from '@playwright/test'

test('creates a paused manual workspace directly from the landing page', async ({ page }) => {
  const questId = 'manual-agent-workspace'
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.route('**/api/quests', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: {
          quest_id: questId,
          title: 'Untitled Research Task',
          status: 'paused',
          workspace_mode: 'autonomous',
          active_anchor: 'scout',
        },
      }),
    })
  })

  await page.goto('/')
  const createRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname === '/api/quests'
  )
  await page.locator('[data-onboarding-id="landing-start-research"]').click()
  const payload = (await createRequest).postDataJSON() as {
    auto_start?: boolean
    startup_contract?: { entry_mode?: string; workspace_mode?: string }
  }

  expect(payload.auto_start).toBe(false)
  expect(payload.startup_contract?.workspace_mode).toBe('autonomous')
  expect(payload.startup_contract?.entry_mode).toBe('manual_agent_setup')
  await expect(page).toHaveURL(new RegExp(`/projects/${questId}$`))
  await expect(page.getByText('SetupAgent', { exact: true })).not.toBeVisible()
  expect(pageErrors).toEqual([])
})
