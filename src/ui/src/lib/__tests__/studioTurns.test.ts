import { describe, expect, it } from 'vitest'

import { buildStudioTurns } from '@/lib/studioTurns'
import type { FeedItem } from '@/types'

describe('studioTurns agent identity', () => {
  it('keeps stage agents in separate turns and renders lifecycle handoffs', () => {
    const feed: FeedItem[] = [
      {
        id: 'user-1',
        type: 'message',
        role: 'user',
        content: 'Develop and validate the selected route.',
        createdAt: '2026-08-16T02:00:00.000Z',
      },
      {
        id: 'idea-message',
        type: 'message',
        role: 'assistant',
        content: 'The novelty audit selected a mechanism.',
        runId: 'run-idea-1',
        skillId: 'idea',
        agentId: 'idea',
        agentRole: 'idea',
        agentInstanceId: 'run-idea-1',
        createdAt: '2026-08-16T02:00:01.000Z',
      },
      {
        id: 'handoff-1',
        type: 'event',
        label: 'agent_handoff',
        content: 'Promote the mechanism to validation.',
        runId: 'run-idea-1',
        details: {
          from_agent_id: 'idea',
          to_agent_id: 'experiment',
          durable_refs: { active_idea_id: 'idea-1' },
        },
        createdAt: '2026-08-16T02:00:02.000Z',
      },
      {
        id: 'experiment-message',
        type: 'message',
        role: 'assistant',
        content: 'The experiment agent accepted the handoff.',
        runId: 'run-experiment-1',
        skillId: 'experiment',
        agentId: 'experiment',
        agentRole: 'experiment',
        agentInstanceId: 'run-experiment-1',
        createdAt: '2026-08-16T02:00:03.000Z',
      },
    ]

    const turns = buildStudioTurns(feed)

    expect(turns.map((turn) => turn.role)).toEqual(['user', 'assistant', 'system', 'assistant'])
    expect(turns[1]).toMatchObject({ agentId: 'idea', agentInstanceId: 'run-idea-1' })
    expect(turns[2].blocks[0]).toMatchObject({ kind: 'event', item: { label: 'agent_handoff' } })
    expect(turns[3]).toMatchObject({ agentId: 'experiment', agentInstanceId: 'run-experiment-1' })
  })
})
