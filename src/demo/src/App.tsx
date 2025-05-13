import { useState, useEffect, useCallback, useRef } from 'react'
import {RepoMD} from '../../lib/index.js'
import ConfigPanel from './components/ConfigPanel'
import Operations from './components/Operations'
import ResultPanel from './components/ResultPanel'
import FunctionList from './components/FunctionList'
import { ApiResult } from './types'

function App() {
  const [projectId, setProjectId] = useState('')
  const [orgSlug, setOrgSlug] = useState('iplanwebsites') // Default value
  const [apiSecret, setApiSecret] = useState('')
  const [strategy, setStrategy] = useState('auto') // Default strategy
  const [revision, setRevision] = useState('') // Empty by default, will default to "latest" in RepoMD
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [functions, setFunctions] = useState<string[]>([])

  // Keep a reference to the current RepoMD instance
  const repoRef = useRef<RepoMD | null>(null)

  // Extract all functions from the RepoMD instance
  useEffect(() => {
    // Create a temporary instance to extract methods
    const tempRepo = new RepoMD({
      debug: false,
    })

    // Get all function/method names from the instance
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(tempRepo))
      .filter(name => {
        // Exclude internal methods and ones that likely require parameters
        return (
          typeof tempRepo[name as keyof typeof tempRepo] === 'function' &&
          !name.startsWith('_') &&
          name !== 'constructor'
        )
      })

    setFunctions(methodNames)

    // Clean up
    tempRepo.destroy?.()

    return () => {
      if (repoRef.current?.destroy) {
        repoRef.current.destroy()
        repoRef.current = null
      }
    }
  }, [])

  // Create or recreate the RepoMD instance when config changes
  useEffect(() => {
    // Don't create an instance if we don't have the required fields
    if (!projectId || !orgSlug) return

    // Destroy the previous instance if it exists
    if (repoRef.current?.destroy) {
      repoRef.current.destroy()
      repoRef.current = null
    }

    // Create a new instance
    repoRef.current = new RepoMD({
      projectId,
      orgSlug,
      strategy,
      secret: apiSecret || undefined,
      rev: revision || 'latest', // Use 'latest' as default if empty
      debug: true
    })

  }, [projectId, orgSlug, apiSecret, strategy, revision])

  const handleRun = useCallback(async (operation: string, params: Record<string, string> = {}) => {
    if (!projectId) {
      setResult({
        success: false,
        error: 'Project ID is required',
        operation,
      })
      return
    }

    if (!orgSlug) {
      setResult({
        success: false,
        error: 'Organization Slug is required',
        operation,
      })
      return
    }

    setLoading(true)
    const startTime = performance.now()

    try {
      // Ensure we have an instance
      if (!repoRef.current) {
        repoRef.current = new RepoMD({
          projectId,
          orgSlug,
          strategy,
          secret: apiSecret || undefined,
          rev: revision || 'latest', // Use 'latest' as default if empty
          debug: true
        })
      }

      // Use the maintained instance
      const repo = repoRef.current

      let data
      switch (operation) {
        case 'getProjectDetails':
          data = await repo.fetchProjectDetails()
          break
        case 'getAllPosts':
          data = await repo.getAllPosts()
          break
        case 'getAllMedia':
          data = await repo.getAllMedia()
          break
        case 'getRecentPosts':
          const count = params.count ? parseInt(params.count) : 3
          data = await repo.getRecentPosts(count)
          break
        case 'getPostBySlug':
          if (!params.slug) {
            throw new Error('Slug is required for this operation')
          }
          data = await repo.getPostBySlug(params.slug)
          break
        default:
          // Try to execute the function if it exists on the repo instance
          if (typeof repo[operation as keyof typeof repo] === 'function') {
            // For simplicity, we'll call methods without parameters for now
            data = await (repo[operation as keyof typeof repo] as Function)()
          } else {
            throw new Error(`Unknown operation: ${operation}`)
          }
      }

      const endTime = performance.now()

      setResult({
        success: true,
        data,
        operation,
        executionTime: endTime - startTime
      })
    } catch (error) {
      const endTime = performance.now()

      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operation,
        executionTime: endTime - startTime
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, orgSlug, apiSecret, strategy, revision])

  // Execute any function by name
  const handleExecuteFunction = useCallback((fnName: string) => {
    handleRun(fnName)
  }, [handleRun])

  return (
    <div className="container">
      <h1>Repo.md API Demo</h1>

      <ConfigPanel
        projectId={projectId}
        setProjectId={setProjectId}
        orgSlug={orgSlug}
        setOrgSlug={setOrgSlug}
        apiSecret={apiSecret}
        setApiSecret={setApiSecret}
        strategy={strategy}
        setStrategy={setStrategy}
        revision={revision}
        setRevision={setRevision}
      />

      <Operations
        handleRun={handleRun}
        disabled={loading}
      />

      <FunctionList
        functions={functions}
        handleExecute={handleExecuteFunction}
        disabled={loading}
      />

      <ResultPanel result={result} loading={loading} />
    </div>
  )
}

export default App