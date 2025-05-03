import { useState } from 'react'
import { createRepo } from '../../lib/content-client'
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
      // Create base URL from project ID
      const baseUrl = `https://api.example.com/${projectId}`
      const repo = createRepo({ baseUrl })

      let data
      switch (operation) {
        case 'listSlugs':
          data = await repo.listSlugs()
          break
        case 'load':
          if (!params.slug) {
            throw new Error('Slug is required for this operation')
          }
          data = await repo.load(params.slug)
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
      <h1>RepoMD Demo</h1>
      
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