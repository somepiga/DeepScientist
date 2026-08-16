import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'

import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import { Button } from '@/components/ui/button'
import { getProject, type Project } from '@/lib/api/projects'
import { useI18n } from '@/lib/i18n/useI18n'
import { scheduleCommonPluginPreload } from '@/lib/plugin/init'
import { isQuestRuntimeSurface } from '@/lib/runtime/quest-runtime'

function AtmosphereFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#ABA9A5] dark:bg-[#0B0C0E] font-project">
      {children}
    </div>
  )
}

export function ProjectWorkspacePage() {
  const { projectId = '' } = useParams()
  const { t } = useI18n('workspace')
  const { t: tCommon } = useI18n('common')
  const optimisticQuestRoute = Boolean(projectId && isQuestRuntimeSurface())

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(!optimisticQuestRoute)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('font-project')
    return () => document.body.classList.remove('font-project')
  }, [])

  useEffect(() => {
    if (!projectId) {
      return
    }
    return scheduleCommonPluginPreload()
  }, [projectId])

  useEffect(() => {
    if (!projectId) {
      setError(t('page_project_not_found'))
      setLoading(false)
      return
    }

    if (optimisticQuestRoute) {
      setProject(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchProject() {
      try {
        setLoading(true)
        setError(null)
        const data = await getProject(projectId)
        if (!cancelled) {
          setProject(data)
        }
      } catch (caught) {
        if (!cancelled) {
          console.error('Failed to fetch project:', caught)
          setError(caught instanceof Error ? caught.message : t('page_failed_to_load_project'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchProject()

    return () => {
      cancelled = true
    }
  }, [optimisticQuestRoute, projectId, t])

  if (loading) {
    return (
      <AtmosphereFrame>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/60 border-t-transparent" />
            <span>{t('page_loading_project')}</span>
          </div>
        </div>
      </AtmosphereFrame>
    )
  }

  const projectName = project?.name || (projectId ? `Project ${projectId}` : 'Project')

  if (error) {
    return (
      <AtmosphereFrame>
        <div className="flex h-screen items-center justify-center">
          <div className="max-w-md space-y-4 p-8 text-center">
            <div className="text-lg font-medium text-destructive">{t('page_failed_to_load_project')}</div>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()}>{tCommon('action_retry')}</Button>
          </div>
        </div>
      </AtmosphereFrame>
    )
  }

  return (
    <WorkspaceLayout
      projectId={projectId}
      projectName={projectName}
      projectSource={
        typeof project?.settings?.source === 'string'
          ? project.settings.source
          : optimisticQuestRoute
            ? 'quest'
            : null
      }
    />
  )
}

export default ProjectWorkspacePage
