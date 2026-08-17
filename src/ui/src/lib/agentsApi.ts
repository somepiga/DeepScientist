import { api } from '@/lib/api'

export interface AgentSummary {
  id: string
  skill_id: string
  name: string
  role: string
  description: string
  prompt_file: string
  has_override: boolean
  context_scope?: { quest: string[]; global: string[] }
  modes?: string[]
}

export interface AgentPromptPayload {
  agent_id: string
  default_prompt: string
  prompt: string
  has_override: boolean
}

export interface AgentPromptWriteResult {
  ok: boolean
  agent_id: string
  has_override: boolean
  override_path?: string
}

export function listAgents() {
  return api<AgentSummary[]>('/api/agents')
}

export function getAgentPrompt(agentId: string) {
  return api<AgentPromptPayload>(`/api/agents/${encodeURIComponent(agentId)}/prompt`)
}

export function saveAgentPrompt(agentId: string, prompt: string) {
  return api<AgentPromptWriteResult>(`/api/agents/${encodeURIComponent(agentId)}/prompt`, {
    method: 'PUT',
    body: JSON.stringify({ prompt }),
  })
}

export function resetAgentPrompt(agentId: string) {
  return api<AgentPromptWriteResult>(`/api/agents/${encodeURIComponent(agentId)}/prompt`, {
    method: 'PUT',
    body: JSON.stringify({ reset: true }),
  })
}
