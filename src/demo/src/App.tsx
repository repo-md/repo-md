import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RepoMD,
  repoMdOptionsSchema,
  schemas,
  validateFunctionParams,
  functionParamMetadata
} from '../../lib/index.js'
import ConfigPanel from './components/ConfigPanel'
import ResultPanel from './components/ResultPanel'
import FunctionList from './components/FunctionList'
import { ApiResult } from './types'
import { FileText, Github, ExternalLink } from 'lucide-react'

// Import the Zod library
import * as z from 'zod';

interface FunctionParam {
  name: string;
  required: boolean;
  type: string;
  default?: any;
  description?: string;
}

// Use the metadata from our Zod schemas
console.log('Schemas object from import:', schemas);
console.log('Schemas has proper types?', schemas?.getAllPosts?.toString());

// Check what's in the functionParamMetadata
console.log('Function Parameter Metadata:', functionParamMetadata);

// Sample for specific operations
if (schemas?.getAllPosts) {
  const allPostsSchema = schemas.getAllPosts;
  console.log('getAllPosts schema:', allPostsSchema);
  console.log('getAllPosts schema properties:', allPostsSchema._def?.shape?.());
}

// Debugging extracted properties
try {
  const allPostsParams = functionParamMetadata?.getAllPosts || [];
  console.log('getAllPosts params from metadata:', allPostsParams);

  // Debug each param
  allPostsParams.forEach(param => {
    console.log(`Param ${param.name}: required=${param.required}, type=${param.type}, default=${param.default}`);
  });
} catch (err) {
  console.error('Error examining params:', err);
}

// Extract parameter metadata directly from the Zod schemas
const extractParamsFromSchemas = () => {
  const params: Record<string, FunctionParam[]> = {};

  // Process each schema to extract parameter information
  for (const [fnName, schema] of Object.entries(schemas)) {
    try {
      // Skip if schema is missing or invalid
      if (!schema || !schema._def || typeof schema._def.shape !== 'function') {
        console.warn(`Schema for ${fnName} is missing or invalid`);
        continue;
      }

      // Extract shape (parameter definitions) from the schema
      const shape = schema._def.shape();
      const fnParams: FunctionParam[] = [];

      // Process each parameter in the schema
      for (const [paramName, zodParam] of Object.entries(shape)) {
        // Default values
        let paramType = 'unknown';
        let required = true;
        let defaultValue: any = undefined;

        // Process special case: booleanSchema (z.boolean().optional().default(true))
        if (paramName === 'useCache' && fnName !== 'fetchJson') {
          // booleanSchema is optional with default=true
          paramType = 'boolean';
          required = false;
          defaultValue = true;

          fnParams.push({
            name: paramName,
            type: paramType,
            required,
            default: defaultValue
          });
          continue;
        }

        // Try to extract type and optional status
        if (zodParam && typeof zodParam === 'object' && '_def' in zodParam) {
          // Check if parameter is optional
          const isOptional = zodParam instanceof z.ZodOptional;
          required = !isOptional;

          // Extract the actual type (might be nested in ZodOptional)
          const typeObj = isOptional ? zodParam._def.innerType : zodParam;

          // Determine parameter type
          if (typeObj instanceof z.ZodString) {
            paramType = 'string';
          } else if (typeObj instanceof z.ZodNumber) {
            paramType = 'number';
          } else if (typeObj instanceof z.ZodBoolean) {
            paramType = 'boolean';
          } else if (typeObj instanceof z.ZodArray) {
            paramType = 'array';
          } else if (typeObj instanceof z.ZodObject) {
            paramType = 'object';
          } else if (typeObj instanceof z.ZodEnum) {
            paramType = `enum (${typeObj._def.values.join(', ')})`;
          }

          // Try to extract default value
          if (isOptional && typeObj._def && 'defaultValue' in typeObj._def) {
            defaultValue = typeObj._def.defaultValue;
          }

          // Special cases for common parameters with known defaults
          if (paramName === 'forceRefresh' && paramType === 'boolean') {
            defaultValue = false;
          }
          if (paramName === 'count' && fnName === 'getRecentPosts') {
            defaultValue = 3;
          }
          if (paramName === 'count' &&
            (fnName === 'getSimilarPostsBySlug' || fnName === 'getSimilarPostsByHash')) {
            defaultValue = 5;
          }
          if (paramName === 'options' &&
            (fnName === 'getSimilarPostsBySlug' || fnName === 'getSimilarPostsByHash')) {
            defaultValue = {};
          }
        }

        // Create the parameter entry
        fnParams.push({
          name: paramName,
          type: paramType,
          required,
          ...(defaultValue !== undefined && { default: defaultValue })
        });
      }

      // Save the parameters for this function
      params[fnName] = fnParams;

    } catch (error) {
      console.error(`Error extracting parameters for ${fnName}:`, error);
    }
  }

  // Add known optional boolean parameters that might be missed
  const booleanDefaults = [
    'getAllPosts', 'fetchProjectDetails', 'getAllMedia', 'getProjectDetails',
    'getPostsEmbeddings', 'getPostsSimilarity', 'getTopSimilarPostsHashes',
    'getSqliteUrl', 'getClientStats', 'getMediaItems', 'getGraph'
  ];

  booleanDefaults.forEach(fnName => {
    if (!params[fnName]) {
      params[fnName] = [];
    }

    // Add useCache parameter if it doesn't exist
    if (!params[fnName].some(p => p.name === 'useCache')) {
      params[fnName].push({
        name: 'useCache',
        type: 'boolean',
        required: false,
        default: true
      });
    }
  });

  return params;
};

// Log the schemas to debug their structure
console.log('Available schemas:', Object.keys(schemas));
for (const [key, schema] of Object.entries(schemas)) {
  console.log(`Schema ${key}:`, schema);
  if (schema._def && typeof schema._def.shape === 'function') {
    try {
      console.log(`Schema ${key} shape:`, schema._def.shape());
    } catch (e) {
      console.error(`Error getting shape for ${key}:`, e);
    }
  }
}

// Extract parameters directly from schemas
const extractedParams = extractParamsFromSchemas();
console.log('Extracted params from schemas:', extractedParams);

// Fallback for any missing functions - MAKE SURE TO INCLUDE ALL CRITICAL METHODS!
const fallbackParams: Record<string, FunctionParam[]> = {
  getAllPosts: [
    { name: 'useCache', type: 'boolean', required: false, default: true },
    { name: 'forceRefresh', type: 'boolean', required: false, default: false }
  ],
  getPostBySlug: [
    { name: 'slug', type: 'string', required: true }
  ],
  getPostByHash: [
    { name: 'hash', type: 'string', required: true }
  ],
  getPostByPath: [
    { name: 'path', type: 'string', required: true }
  ],
  getRecentPosts: [
    { name: 'count', type: 'number', required: false, default: 3 }
  ],
  getPostsSimilarityByHashes: [
    { name: 'hash1', type: 'string', required: true },
    { name: 'hash2', type: 'string', required: true }
  ],
  getSimilarPostsByHash: [
    { name: 'hash', type: 'string', required: true },
    { name: 'count', type: 'number', required: false, default: 5 }
  ],
  getSimilarPostsHashByHash: [
    { name: 'hash', type: 'string', required: true },
    { name: 'limit', type: 'number', required: false, default: 10 }
  ],
  getFileContent: [
    { name: 'path', type: 'string', required: true },
    { name: 'useCache', type: 'boolean', required: false, default: true }
  ]
};

// Ensure critical methods are properly included (they seem to be missing in some contexts)
console.log('Pre-merge getPostByPath params:', extractedParams['getPostByPath']);
console.log('Pre-merge getPostByHash params:', extractedParams['getPostByHash']);
console.log('Pre-merge getPostBySlug params:', extractedParams['getPostBySlug']);

// List of critical methods that must have parameters
const criticalMethods = ['getPostByHash', 'getPostBySlug', 'getPostByPath', 'getFileContent',
  'getPostsSimilarityByHashes', 'getSimilarPostsByHash'];

// Start with the fallbacks
const functionParams: Record<string, FunctionParam[]> = { ...fallbackParams };

// Add extracted parameters, but don't override fallbacks for critical methods
Object.entries(extractedParams).forEach(([key, params]) => {
  // Skip critical methods to ensure they always use the fallbacks
  if (!criticalMethods.includes(key)) {
    functionParams[key] = params;
  } else {
    // For critical methods, verify the extracted params have the needed properties
    // If they don't, stick with the fallback
    if (params &&
      Array.isArray(params) &&
      params.length > 0 &&
      params.some(p => p.required)) {
      console.log(`Using extracted params for critical method ${key}`);
      functionParams[key] = params;
    } else {
      console.log(`Using fallback params for critical method ${key} (extracted params insufficient)`);
    }
  }
});

// Prioritize metadata from schemas over fallbacks, but fallbacks over functionParamMetadata
// This is because the functionParamMetadata might be losing the optional/required status during build

// Debug the final parameter configuration
console.log('Final function params:', functionParams);

// Count how many optional parameters we have
let requiredCount = 0;
let optionalCount = 0;
Object.values(functionParams).forEach(params => {
  params.forEach(param => {
    if (param.required) requiredCount++;
    else optionalCount++;
  });
});
console.log(`Parameter stats: ${requiredCount} required, ${optionalCount} optional parameters detected`);

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
        console.log(`Processing params for ${operation}:`, params);

        for (const param of functionParams[operation]) {
          // For debugging
          console.log(`Processing param ${param.name}: type=${param.type}, required=${param.required}, default=${param.default}`);

          // If param is provided explicitly and not empty (empty is treated as using default)
          if (params[param.name] !== undefined && params[param.name] !== '') {
            // Convert string values to appropriate types
            if (param.type === 'number') {
              processedParams[param.name] = Number(params[param.name]);
            } else if (param.type === 'boolean' ||
              param.type.includes('boolean') ||
              (param.default !== undefined && typeof param.default === 'boolean')) {
              // For boolean values, just convert to actual boolean
              processedParams[param.name] = params[param.name] === 'true';
              console.log(`Converted boolean param ${param.name}: ${params[param.name]} -> ${processedParams[param.name]}`);
            } else {
              processedParams[param.name] = params[param.name];
            }
          }
          // For empty values on optional parameters, don't include them at all
          // This allows the default value from the schema to be used
          else if (params[param.name] === '' && !param.required) {
            console.log(`Skipping param ${param.name} (empty value for optional parameter)`);
            // Don't add to processedParams, so it will use the schema default
          }
          // Add default values for optional parameters to satisfy schema validation, but only if needed
          else if (!param.required && param.default !== undefined && params[param.name] === undefined) {
            // Since default values are now handled by the schema validation, we skip them
            // to achieve the behavior of using schema defaults
            console.log(`Using schema default for ${param.name}`);
          }
          // Add placeholder for required parameters
          else if (param.required && params[param.name] === undefined) {
            console.warn(`Missing required parameter ${param.name}`);
          }
        }

        // Also check for special cases by parameter name
        const booleanParamNames = ['useCache', 'forceRefresh', 'debug', 'loadIndividually'];
        for (const name of booleanParamNames) {
          if (params[name] !== undefined && processedParams[name] === undefined) {
            processedParams[name] = params[name] === 'true';
            console.log(`Special case: converted ${name} to boolean: ${processedParams[name]}`);
          }
        }
      }

      console.log(`Final processed params:`, processedParams);

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

  // Add URL parameter handling for method
  const getInitialMethod = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('method') || null;
  };

  const [selectedMethod, setSelectedMethod] = useState<string | null>(getInitialMethod());

  // Update URL when method changes
  useEffect(() => {
    if (selectedMethod) {
      const url = new URL(window.location.href);
      url.searchParams.set('method', selectedMethod);
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('method');
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedMethod]);

  // Execute any function by name with optional parameters
  const handleExecuteFunction = useCallback((fnName: string, params?: Record<string, string>) => {
    setSelectedMethod(fnName);
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
            <img src="https://repo.md/brand/repo/logo_purple.svg" alt="Repo.md" style={{ maxHeight: '24px' }} />
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