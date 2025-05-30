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

      // Debug logging for getRecentPosts
      if (fnName === 'getRecentPosts') {
        console.log(`[DEBUG] Processing schema for ${fnName}:`, schema);
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

        // Debug logging for count parameter
        if (paramName === 'count' && fnName === 'getRecentPosts') {
          console.log(`[DEBUG] Processing ${paramName} in ${fnName}:`, zodParam);
        }


        // Try to extract type and optional status
        if (zodParam && typeof zodParam === 'object' && '_def' in zodParam) {
          // Check if parameter is optional or has default value
          const isOptional = zodParam instanceof z.ZodOptional;
          const hasDefault = zodParam._def && typeof zodParam._def === 'object' && zodParam._def !== null && 'defaultValue' in zodParam._def;
          
          // A parameter is optional if it's either explicitly optional OR has a default value
          required = !isOptional && !hasDefault;

          // Extract the actual type (might be nested in ZodOptional or ZodDefault)
          let typeObj = zodParam;
          
          // Unwrap ZodDefault and ZodOptional in any order (can be nested)
          let changed = true;
          while (changed) {
            changed = false;
            
            // Unwrap ZodDefault
            if (typeObj._def && (typeObj._def as any).typeName === 'ZodDefault') {
              typeObj = (typeObj._def as any).innerType;
              changed = true;
            }
            
            // Unwrap ZodOptional
            if (typeObj._def && (typeObj._def as any).typeName === 'ZodOptional') {
              typeObj = (typeObj._def as any).innerType;
              changed = true;
            }
          }

          // Debug logging for type detection
          if (paramName === 'count' && fnName === 'getRecentPosts') {
            console.log(`[DEBUG] Type detection for ${paramName}:`, {
              original: zodParam,
              unwrapped: typeObj,
              typeName: typeObj._def?.typeName,
              isZodNumber: typeObj instanceof z.ZodNumber,
              isOptional,
              hasDefault
            });
          }

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
          } else {
            // Additional type checking by typeName
            const typeName = typeObj._def?.typeName;
            if (typeName === 'ZodNumber') {
              paramType = 'number';
            } else if (typeName === 'ZodString') {
              paramType = 'string';
            } else if (typeName === 'ZodBoolean') {
              paramType = 'boolean';
            }
          }

          // Debug logging after type detection
          if (paramName === 'count' && fnName === 'getRecentPosts') {
            console.log(`[DEBUG] Final type for ${paramName}: '${paramType}'`);
          }

          // Extract default value - check both the original param and the inner type
          if (zodParam._def && 'defaultValue' in zodParam._def) {
            defaultValue = (zodParam._def as any).defaultValue;
          } else if (isOptional && typeObj._def && 'defaultValue' in typeObj._def) {
            defaultValue = (typeObj._def as any).defaultValue;
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

// Use only schema-extracted parameters
const functionParams: Record<string, FunctionParam[]> = extractedParams;


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
            const paramValue = params[param.name];
            const paramType = param.type.toLowerCase();
            
            if (paramType === 'number' || paramType.includes('number')) {
              const numberValue = Number(paramValue);
              if (!isNaN(numberValue)) {
                processedParams[param.name] = numberValue;
                console.log(`Converted number param ${param.name}: "${paramValue}" -> ${numberValue}`);
              } else {
                console.warn(`Invalid number value for ${param.name}: "${paramValue}"`);
                processedParams[param.name] = paramValue; // Keep original value for validation error
              }
            } else if (paramType === 'boolean' || 
                      paramType.includes('boolean') ||
                      (param.default !== undefined && typeof param.default === 'boolean')) {
              // For boolean values, convert to actual boolean
              processedParams[param.name] = paramValue === 'true';
              console.log(`Converted boolean param ${param.name}: "${paramValue}" -> ${processedParams[param.name]}`);
            } else if (paramType.includes('array') || paramType.includes('[]')) {
              // Handle array parameters
              try {
                processedParams[param.name] = JSON.parse(paramValue);
                console.log(`Converted array param ${param.name}: "${paramValue}" -> ${processedParams[param.name]}`);
              } catch {
                // Fallback to comma-separated string parsing
                processedParams[param.name] = paramValue.split(',').map(s => s.trim());
                console.log(`Converted array param ${param.name} (fallback): "${paramValue}" -> ${processedParams[param.name]}`);
              }
            } else {
              // String and other types - keep as string
              processedParams[param.name] = paramValue;
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

        // Check for any remaining parameters using schema information
        for (const [name, value] of Object.entries(params)) {
          if (value !== undefined && processedParams[name] === undefined) {
            // Find this parameter in the function's schema to determine its type
            const paramDef = functionParams[operation]?.find(p => p.name === name);
            if (paramDef?.type === 'boolean' || (paramDef?.default !== undefined && typeof paramDef.default === 'boolean')) {
              processedParams[name] = value === 'true';
              console.log(`Schema-based: converted ${name} to boolean: ${processedParams[name]}`);
            } else if (paramDef?.type === 'number' || (paramDef?.default !== undefined && typeof paramDef.default === 'number')) {
              const numberValue = Number(value);
              if (!isNaN(numberValue)) {
                processedParams[name] = numberValue;
                console.log(`Schema-based: converted ${name} to number: ${processedParams[name]}`);
              } else {
                processedParams[name] = value;
                console.log(`Schema-based: kept ${name} as string (NaN): ${processedParams[name]}`);
              }
            }
          }
        }
      }

      console.log(`Final processed params:`, processedParams);

      // Validate parameters using Zod schemas
      const validationResult = validateFunctionParams(operation as keyof typeof schemas, processedParams);

      if (!validationResult.success) {
        throw new Error(`🎛️ Parameter validation failed: ${validationResult.error}`);
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
    const currentMethod = new URLSearchParams(window.location.search).get('method');
    
    if (selectedMethod && currentMethod !== selectedMethod) {
      const url = new URL(window.location.href);
      url.searchParams.set('method', selectedMethod);
      window.history.replaceState({}, '', url.toString());
    } else if (!selectedMethod && currentMethod) {
      const url = new URL(window.location.href);
      url.searchParams.delete('method');
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedMethod]);

  // Execute any function by name with optional parameters
  const handleExecuteFunction = useCallback((fnName: string, params?: Record<string, string>) => {
    // Only update selectedMethod if it's different to prevent loops
    if (selectedMethod !== fnName) {
      setSelectedMethod(fnName);
    }
    handleRun(fnName, params || {})
  }, [handleRun, selectedMethod])

  const [configCollapsed, setConfigCollapsed] = useState(true);

  const toggleConfigCollapsed = () => {
    setConfigCollapsed(!configCollapsed);
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
        isCollapsed={configCollapsed}
        onToggle={toggleConfigCollapsed}
      />

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