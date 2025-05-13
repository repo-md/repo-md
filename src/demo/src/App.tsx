import { useState, useEffect, useCallback, useRef } from 'react'
import {RepoMD} from '../../lib/index.js'
import ConfigPanel from './components/ConfigPanel'
import ResultPanel from './components/ResultPanel'
import FunctionList from './components/FunctionList'
import { ApiResult } from './types'
import { FileText, Github, ExternalLink } from 'lucide-react'

// Import function parameters from FunctionList
// Define parameter types for functions
interface FunctionParam {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

// Define function parameters
const functionParams: Record<string, FunctionParam[]> = {
  getPostBySlug: [
    { name: 'slug', required: true, type: 'string' }
  ],
  getPostByHash: [
    { name: 'hash', required: true, type: 'string' }
  ],
  getPostByPath: [
    { name: 'path', required: true, type: 'string' }
  ],
  getRecentPosts: [
    { name: 'count', required: false, type: 'number', defaultValue: 3 }
  ],
  getSimilarPostsByHash: [
    { name: 'hash', required: true, type: 'string' },
    { name: 'count', required: false, type: 'number', defaultValue: 5 }
  ],
  getSimilarPostsBySlug: [
    { name: 'slug', required: true, type: 'string' },
    { name: 'count', required: false, type: 'number', defaultValue: 5 }
  ],
  getSimilarPostsHashByHash: [
    { name: 'hash', required: true, type: 'string' },
    { name: 'limit', required: false, type: 'number', defaultValue: 10 }
  ],
  getSimilarPostsSlugBySlug: [
    { name: 'slug', required: true, type: 'string' },
    { name: 'limit', required: false, type: 'number', defaultValue: 10 }
  ],
  getFileContent: [
    { name: 'path', required: true, type: 'string' }
  ],
  getPostsSimilarityByHashes: [
    { name: 'hash1', required: true, type: 'string' },
    { name: 'hash2', required: true, type: 'string' }
  ]
};

function App() {
  const [projectId, setProjectId] = useState('')
  const [orgSlug, setOrgSlug] = useState('iplanwebsites') // Default value
  const [apiSecret, setApiSecret] = useState('')
  const [strategy, setStrategy] = useState<'auto' | 'server' | 'browser'>('auto') // Default strategy
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

    // Clean up if destroy method exists
    if (typeof (tempRepo as any).destroy === 'function') {
      (tempRepo as any).destroy();
    }

    return () => {
      if (repoRef.current && typeof (repoRef.current as any).destroy === 'function') {
        (repoRef.current as any).destroy();
        repoRef.current = null;
      }
    }
  }, [])

  // Create or recreate the RepoMD instance when config changes
  useEffect(() => {
    // Don't create an instance if we don't have the required fields
    if (!projectId || !orgSlug) return

    // Destroy the previous instance if it exists and has a destroy method
    if (repoRef.current && typeof (repoRef.current as any).destroy === 'function') {
      (repoRef.current as any).destroy();
      repoRef.current = null;
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
        params
      })
      return
    }

    if (!orgSlug) {
      setResult({
        success: false,
        error: 'Organization Slug is required',
        operation,
        params
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
        case 'getPostByHash':
          if (!params.hash) {
            throw new Error('Hash is required for this operation')
          }
          data = await repo.getPostByHash(params.hash)
          break
        case 'getPostByPath':
          if (!params.path) {
            throw new Error('Path is required for this operation')
          }
          data = await repo.getPostByPath(params.path)
          break
        case 'getSimilarPostsBySlug':
          if (!params.slug) {
            throw new Error('Slug is required for this operation')
          }
          const countSlug = params.count ? parseInt(params.count) : 5
          data = await repo.getSimilarPostsBySlug(params.slug, countSlug)
          break
        case 'getSimilarPostsByHash':
          if (!params.hash) {
            throw new Error('Hash is required for this operation')
          }
          const countHash = params.count ? parseInt(params.count) : 5
          data = await repo.getSimilarPostsByHash(params.hash, countHash)
          break
        case 'getSimilarPostsHashByHash':
          if (!params.hash) {
            throw new Error('Hash is required for this operation')
          }
          const limitHash = params.limit ? parseInt(params.limit) : 10
          data = await repo.getSimilarPostsHashByHash(params.hash, limitHash)
          break
        case 'getSimilarPostsSlugBySlug':
          if (!params.slug) {
            throw new Error('Slug is required for this operation')
          }
          const limitSlug = params.limit ? parseInt(params.limit) : 10
          data = await repo.getSimilarPostsSlugBySlug(params.slug, limitSlug)
          break
        case 'getFileContent':
          if (!params.path) {
            throw new Error('Path is required for this operation')
          }
          data = await repo.getFileContent(params.path)
          break
        case 'getPostsSimilarityByHashes':
          if (!params.hash1 || !params.hash2) {
          //  throw new Error('Hash1 and Hash2 are required for this operation')
          }
          data = await repo.getPostsSimilarityByHashes(params.hash1, params.hash2)
          break
        default:
          // Try to execute the function if it exists on the repo instance
          if (typeof repo[operation as keyof typeof repo] === 'function') {
            // For operations without specific parameter handling, we'll try to call with no parameters
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
        params,
        executionTime: endTime - startTime
      })
    } catch (error) {
      const endTime = performance.now()

      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        operation,
        params,
        executionTime: endTime - startTime
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, orgSlug, apiSecret, strategy, revision])

  // Execute any function by name with optional parameters
  const handleExecuteFunction = useCallback((fnName: string, params?: Record<string, string>) => {
    handleRun(fnName, params || {})
  }, [handleRun])

  const [showConfig, setShowConfig] = useState(false);

  const toggleConfig = () => {
    setShowConfig(!showConfig);
  };

  return (
    <div className="container">
      <div className="app-header">
        <h3>Repo.md API Demo</h3>
        <div className="header-actions">
          <a
            href="https://repo.md/docs"
            target="_blank"
            className="header-button"
            title="Documentation"
          >
            <FileText size={18} />
            <span>Docs</span>
          </a>
          <a
            href="https://github.com/repo-md/repo-md"
            target="_blank"
            rel="noopener"
            className="header-button"
            title="GitHub Repository"
          >
            <Github size={18} />
            <span>GitHub</span>
          </a>
          <a
            href="https://repo.md"
            target="_blank"
            className="header-button"
            title="Repo.md Website"
          >
            <ExternalLink size={18} />
            <span>Repo.md</span>
          </a>
        </div>
      </div>

      {showConfig && (
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
      )}

      <div className="main-content">
        <div className="column-left">
          <FunctionList
            functions={functions}
            handleExecute={handleExecuteFunction}
            disabled={loading}
            functionParams={functionParams}
          />
        </div>

        <div className="column-right">
          <ResultPanel
            result={result}
            loading={loading}
            toggleConfig={toggleConfig}
            showConfig={showConfig}
            handleRun={result ?
              (params) => handleRun(result.operation, params || result.params || {}) :
              undefined
            }
            functionParams={functionParams}
          />
        </div>
      </div>
    </div>
  )
}

export default App