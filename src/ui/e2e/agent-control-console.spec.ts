import { expect, test } from '@playwright/test'

test('supervises a staged research task from the control console', async ({ page, request }) => {
  const questId = `ui-agent-console-${Date.now()}`
  let savedSkillMarkdown = ''
  const createResponse = await request.post('/api/quests', {
    data: {
      quest_id: questId,
      title: 'UI control-console verification',
      goal: 'Verify task-level supervision of a staged research workflow.',
      auto_start: false,
      auto_bind_latest_connectors: false,
      startup_contract: { workspace_mode: 'autonomous' },
    },
  })

  expect(createResponse.ok()).toBeTruthy()

  try {
    await page.route(`**/api/quests/${questId}/agents/scout/config`, async (route) => {
      if (route.request().method() === 'PUT') {
        savedSkillMarkdown = String((route.request().postDataJSON() as { skill_markdown?: string }).skill_markdown || '')
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          quest_id: questId,
          agent_id: 'scout',
          skill_markdown: savedSkillMarkdown,
          is_quest_override: Boolean(savedSkillMarkdown),
          updated_at: new Date().toISOString(),
        }),
      })
    })
    await page.goto(`/projects/${questId}`)

    await expect(page.getByText('研究任务控制台')).toBeVisible()
    await expect(page.getByText('当前阶段')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始运行' })).toBeVisible()
    await expect(page.getByRole('button', { name: '补充约束' })).toBeVisible()
    await expect(page.getByRole('button', { name: '查看产出' })).toBeVisible()

    await page.getByRole('button', { name: '配置' }).first().click()
    await expect(page.getByText('编辑 @scout/SKILL.md')).toBeVisible()
    await page.getByRole('textbox').last().fill('# Scout\n\nPrioritize novelty against the supplied baseline.')
    await page.getByRole('button', { name: '保存 SKILL.md' }).click()
    await expect.poll(() => savedSkillMarkdown).toBe('# Scout\n\nPrioritize novelty against the supplied baseline.')

    const reroute = page.getByRole('button', { name: '设为下一阶段' }).first()
    await reroute.click()
    await expect(page.getByText('确认调整研究路由')).toBeVisible()

    const settingsRequest = page.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().endsWith(`/api/quests/${questId}/settings`)
    )
    await page.getByRole('button', { name: '确认调整' }).click()
    const requestPayload = (await settingsRequest).postDataJSON() as { active_anchor?: string }
    expect(requestPayload.active_anchor).toBeTruthy()
  } finally {
    await request.delete(`/api/quests/${questId}`, { data: { source: 'playwright' } })
  }
})
