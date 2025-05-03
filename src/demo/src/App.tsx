import { useState } from 'react'
import RepoMD from '../../lib/index.js'
import ConfigPanel from './components/ConfigPanel'
import Operations from './components/Operations'
import ResultPanel from './components/ResultPanel'
import { ApiResult } from './types'

function App() {
  const [projectId, setProjectId] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRun = async (operation: string, params: Record<string, string> = {}) => {
    if (!projectId) {
      setResult({
        success: false,
        error: 'Project ID is required',
        operation,
      })
      return
    }

    setLoading(true)
    
    try {
      // Create a RepoMD instance
      const repo = new RepoMD({
        projectId,
        secret: apiSecret || undefined,
        debug: true
      })

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
          throw new Error(`Unknown operation: ${operation}`)
      }

      setResult({
        success: true,
        data,
        operation,
      })
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operation,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Repo.md API Demo</h1>
      
      <ConfigPanel
        projectId={projectId}
        setProjectId={setProjectId}
        apiSecret={apiSecret}
        setApiSecret={setApiSecret}
      />
      
      <Operations 
        handleRun={handleRun} 
        disabled={loading} 
      />
      
      <ResultPanel result={result} loading={loading} />
    </div>
  )
}

export default App