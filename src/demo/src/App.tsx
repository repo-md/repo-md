import { useState, useEffect, useCallback, useRef } from 'react'
import {RepoMD} from '../../lib/index.js'
import ConfigPanel from './components/ConfigPanel'
import ResultPanel from './components/ResultPanel'
import FunctionList from './components/FunctionList'
import { ApiResult } from './types'
import { FileText, Github, ExternalLink } from 'lucide-react'
import { functionParamMetadata, validateFunctionParams } from './zodTypes.js'
import { repoMdOptionsSchema, schemas } from './schemas.js'

// Import function parameters from our Zod schemas
interface FunctionParam {
  name: string;
  required: boolean;
  type: string;
  default?: any;
  description?: string;
}

// Use the metadata from our Zod schemas
const functionParams: Record<string, FunctionParam[]> = functionParamMetadata;

function App() {
  // Get initial values from localStorage or use defaults
  const getInitialProjectId = () => {
    const stored = localStorage.getItem('repomd_demo_projectId');
    return stored || '680e97604a0559a192640d2c'; // Default project ID
  };

  const [projectId, setProjectId] = useState(getInitialProjectId)
  const [orgSlug, setOrgSlug] = useState(() => {
    const stored = localStorage.getItem('repomd_demo_orgSlug');
    return stored || 'iplanwebsites'; // Default value
  })
  const [apiSecret, setApiSecret] = useState('')
  const [strategy, setStrategy] = useState<'auto' | 'server' | 'browser'>(() => {
    const stored = localStorage.getItem('repomd_demo_strategy');
    return (stored as 'auto' | 'server' | 'browser') || 'auto'; // Default strategy
  })
  const [revision, setRevision] = useState(() => {
    const stored = localStorage.getItem('repomd_demo_revision');
    return stored || ''; // Empty by default, will default to "latest" in RepoMD
  })
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [functions, setFunctions] = useState<string[]>([])

  // Keep a reference to the current RepoMD instance
  const repoRef = useRef<RepoMD | null>(null)

  // Extract all functions from the RepoMD prototype without creating an instance
  useEffect(() => {
    // Get all function/method names from the RepoMD prototype directly
    // This avoids creating a temporary instance
    const methodNames = Object.getOwnPropertyNames(RepoMD.prototype)
      .filter(name => {
        // Exclude internal methods and constructor
        return (
          typeof RepoMD.prototype[name as keyof typeof RepoMD.prototype] === 'function' &&
          !name.startsWith('_') &&
          name !== 'constructor'
        )
      })

    setFunctions(methodNames)

    // Clean up function for when the component unmounts
    return () => {
      if (repoRef.current) {
        try {
          if (typeof repoRef.current.destroy === 'function') {
            repoRef.current.destroy();
          }
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
        repoRef.current = null;
      }
    }
  }, [])

  // Use a ref to track if this is the first mount
  const isFirstMount = useRef(true);
  
  // Create or recreate the RepoMD instance when config changes
  useEffect(() => {
    // Skip the first mount since React strict mode in development will run effects twice
    // This prevents double initialization during initial render
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    // Use default values if fields are missing
    const currentProjectId = projectId || '680e97604a0559a192640d2c';
    const currentOrgSlug = orgSlug || 'iplanwebsites';

    // Destroy the previous instance if it exists
    if (repoRef.current) {
      try {
        if (typeof repoRef.current.destroy === 'function') {
          repoRef.current.destroy();
        }
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
      repoRef.current = null;
    }

    try {
      // Validate options with Zod
      const options = repoMdOptionsSchema.parse({
        projectId: currentProjectId,
        orgSlug: currentOrgSlug,
        strategy,
        secret: apiSecret || null,
        rev: revision || 'latest',
        debug: true
      });
      
      // Create a new instance with validated options
      const instance = new RepoMD(options);
      
      // Force initialization by ensuring each service is referenced
      // This is to work around potential timing issues
      try {
        // Access each service module
        if (!instance.posts) console.log('Posts module not initialized');
        if (!instance.media) console.log('Media module not initialized');
        if (!instance.files) console.log('Files module not initialized');
        if (!instance.similarity) console.log('Similarity module not initialized');
        if (!instance.project) console.log('Project module not initialized');
      } catch (e) {
        console.error('Error checking initialization status:', e);
      }
      
      repoRef.current = instance;
    } catch (error) {
      console.error('Invalid options:', error);
      // Create with default options if validation fails
      const instance = new RepoMD({
        projectId: currentProjectId,
        orgSlug: currentOrgSlug,
        debug: true
      });
      
      // Force initialization by ensuring each service is referenced
      // This is to work around potential timing issues
      try {
        // Access each service module
        if (!instance.posts) console.log('Posts module not initialized');
        if (!instance.media) console.log('Media module not initialized');
        if (!instance.files) console.log('Files module not initialized');
        if (!instance.similarity) console.log('Similarity module not initialized');
        if (!instance.project) console.log('Project module not initialized');
      } catch (e) {
        console.error('Error checking initialization status:', e);
      }
      
      
      repoRef.current = instance;
    }

  }, [projectId, orgSlug, apiSecret, strategy, revision])

  const handleRun = useCallback(async (operation: string, params: Record<string, string> = {}) => {
    // Always ensure we have a project ID and org slug
    const currentProjectId = projectId || '680e97604a0559a192640d2c';
    const currentOrgSlug = orgSlug || 'iplanwebsites';

    setLoading(true)
    const startTime = performance.now()

    try {
      // Ensure we have an instance - this is the only place we create the instance
      // if it doesn't exist, which lazy-loads it when actually needed
      if (!repoRef.current) {
        console.log('Creating RepoMD instance on first operation');
        // Validate options with Zod
        const options = repoMdOptionsSchema.parse({
          projectId: currentProjectId,
          orgSlug: currentOrgSlug,
          strategy,
          secret: apiSecret || null,
          rev: revision || 'latest',
          debug: true
        });
        
        // Create new instance with direct property access
        const instance = new RepoMD(options);
        
        // Force initialization by ensuring each service is referenced
        // This is to work around potential timing issues
        try {
          // Access each service module
          if (!instance.posts) console.log('Posts module not initialized');
          if (!instance.media) console.log('Media module not initialized');
          if (!instance.files) console.log('Files module not initialized');
          if (!instance.similarity) console.log('Similarity module not initialized');
          if (!instance.project) console.log('Project module not initialized');
        } catch (e) {
          console.error('Error checking initialization status:', e);
        }
        
        repoRef.current = instance;
      }

      // Use the maintained instance
      const repo = repoRef.current

      // Process parameters from string values to proper types
      const processedParams: Record<string, any> = {};
      
      // Convert string values to appropriate types based on schema
      if (functionParams[operation]) {
        for (const param of functionParams[operation]) {
          if (params[param.name] !== undefined) {
            // Convert string values to appropriate types
            if (param.type === 'number') {
              processedParams[param.name] = Number(params[param.name]);
            } else if (param.type === 'boolean') {
              processedParams[param.name] = params[param.name] === 'true';
            } else {
              processedParams[param.name] = params[param.name];
            }
          }
        }
      }
      
      // Validate parameters using Zod schemas
      const validationResult = validateFunctionParams(operation as keyof typeof schemas, processedParams);
      
      if (!validationResult.success) {
        throw new Error(`Parameter validation failed: ${validationResult.error}`);
      }
      
      const validParams = validationResult.data;
      
      let data;
      
      // Direct access to methods to avoid proxy issues
      switch (operation) {
        case 'getProjectDetails':
          data = await repo.fetchProjectDetails();
          break;
        
        case 'getAllPosts':
          data = await repo.getAllPosts();
          break;
          
        case 'getAllMedia':
          data = await repo.getAllMedia();
          break;
          
        case 'getRecentPosts': {
          const count = params.count ? parseInt(params.count) : 3;
          data = await repo.getRecentPosts(count);
          break;
        }
          
        case 'getPostBySlug': {
          data = await repo.getPostBySlug(params.slug);
          break;
        }
          
        case 'getPostByHash': {
          data = await repo.getPostByHash(params.hash);
          break;
        }
          
        case 'getPostByPath': {
          data = await repo.getPostByPath(params.path);
          break;
        }
          
        case 'getSimilarPostsBySlug': {
          const count = params.count ? parseInt(params.count) : 5;
          data = await repo.getSimilarPostsBySlug(params.slug, count);
          break;
        }
          
        case 'getSimilarPostsByHash': {
          const count = params.count ? parseInt(params.count) : 5;
          data = await repo.getSimilarPostsByHash(params.hash, count);
          break;
        }
          
        case 'getSimilarPostsHashByHash': {
          const limit = params.limit ? parseInt(params.limit) : 10;
          data = await repo.getSimilarPostsHashByHash(params.hash, limit);
          break;
        }
          
        case 'getFileContent': {
          data = await repo.getFileContent(params.path);
          break;
        }
          
        case 'getPostsSimilarityByHashes': {
          data = await repo.getPostsSimilarityByHashes(params.hash1, params.hash2);
          break;
        }
          
        default:
          // For any other methods, try to call it directly
          if (typeof repo[operation] === 'function') {
            data = await repo[operation]();
          } else {
            throw new Error(`Unknown operation: ${operation}`);
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
      <h3 className="title-container">
        <a href="https://repo.md" target="_blank" className="logo-link">
          <img src="https://repo.md/brand/repo/logo_purple.svg" alt="Repo.md" style={{maxHeight: '24px'}} />
        </a>
        <span className="title-text">API playground</span>
      </h3>
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
            projectId={projectId}
            orgSlug={orgSlug}
            strategy={strategy}
            revision={revision}
          />
        </div>
      </div>
    </div>
  )
}

export default App