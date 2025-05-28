import { validateFunctionParams } from './types.js';
import { schemas } from './schemas.js';

/**
 * Creates a validation wrapper for a RepoMD method
 * @param {string} functionName - The name of the function to validate
 * @param {Function} originalMethod - The original method to wrap
 * @returns {Function} A wrapped function that validates parameters before calling the original method
 */
export function createValidatedFunction(functionName, originalMethod) {
  // Check if we have a schema for this function
  const hasSchema = !!schemas[functionName];
  
  // If no schema exists, just return the original method without validation
  if (!hasSchema) {
    return originalMethod;
  }
  
  return function(...args) {
    // For methods that expect positional parameters, convert them to an object
    let paramsObj = {};

    // Check method signature and convert args to an object if needed
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
      // Already an object - might be params object style
      paramsObj = args[0];
    } else {
      // Handle positional parameters - convert to object based on function name
      switch (functionName) {
        case 'getPostBySlug':
          if (typeof args[0] === 'string') {
            paramsObj = { slug: args[0] };
          }
          break;
          
        case 'getPostByHash':
          if (typeof args[0] === 'string') {
            paramsObj = { hash: args[0] };
          }
          break;
          
        case 'getPostByPath':
          if (typeof args[0] === 'string') {
            paramsObj = { path: args[0] };
          }
          break;
          
        case 'getRecentPosts':
          if (typeof args[0] === 'number') {
            paramsObj = { count: args[0] };
          }
          break;
          
        case 'getFileContent':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              path: args[0], 
              useCache: args.length > 1 ? !!args[1] : true 
            };
          }
          break;
          
        case 'getPostsSimilarityByHashes':
          if (typeof args[0] === 'string' && typeof args[1] === 'string') {
            paramsObj = { hash1: args[0], hash2: args[1] };
          }
          break;
          
        case 'getSimilarPostsByHash':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              hash: args[0],
              count: args.length > 1 && typeof args[1] === 'number' ? args[1] : 5,
              options: args.length > 2 && typeof args[2] === 'object' ? args[2] : {}
            };
          }
          break;
          
        case 'getSimilarPostsBySlug':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              slug: args[0],
              count: args.length > 1 && typeof args[1] === 'number' ? args[1] : 5,
              options: args.length > 2 && typeof args[2] === 'object' ? args[2] : {}
            };
          }
          break;
          
        case 'getSimilarPostsSlugBySlug':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              slug: args[0],
              limit: args.length > 1 && typeof args[1] === 'number' ? args[1] : 10
            };
          }
          break;
          
        case 'getGraph':
          if (typeof args[0] === 'boolean' || args[0] === undefined) {
            paramsObj = { useCache: args[0] !== false };
          }
          break;
          
        case 'getR2Url':
        case 'getR2ProjectUrl':
        case 'getR2SharedFolderUrl':
        case 'getR2RevUrl':
          if (typeof args[0] === 'string' || args[0] === undefined) {
            paramsObj = { path: args[0] || '' };
          }
          break;
          
        case 'createViteProxy':
          if (typeof args[0] === 'string' || args[0] === undefined) {
            paramsObj = { folder: args[0] || '_repo' };
          }
          break;
          
        case 'fetchPublicApi':
          if (typeof args[0] === 'string' || args[0] === undefined) {
            paramsObj = { path: args[0] || '/' };
          } else if (args[0] === null) {
            paramsObj = { path: '/' };
          }
          break;
          
        case 'getActiveProjectRev':
          if (typeof args[0] === 'boolean' || args[0] === undefined) {
            paramsObj = { 
              forceRefresh: !!args[0], 
              skipDetails: args.length > 1 ? !!args[1] : false 
            };
          }
          break;
          
        case 'getMediaItems':
        case 'getPostsEmbeddings':
        case 'getPostsSimilarity':
        case 'getTopSimilarPostsHashes':
        case 'getSqliteUrl':
        case 'fetchProjectDetails':
        case 'getReleaseInfo':
        case 'getProjectMetadata':
        case 'getClientStats':
          if (typeof args[0] === 'boolean' || args[0] === undefined) {
            paramsObj = { useCache: args[0] !== false };
          }
          break;
          
        case 'fetchProjectActiveRev':
          if (typeof args[0] === 'boolean' || args[0] === undefined) {
            paramsObj = { forceRefresh: !!args[0] };
          }
          break;
          
        case 'handleOpenAiRequest':
          if (typeof args[0] === 'object') {
            paramsObj = { 
              request: args[0], 
              options: args.length > 1 && typeof args[1] === 'object' ? args[1] : {} 
            };
          }
          break;
          
        case 'createOpenAiToolHandler':
          if (typeof args[0] === 'object' || args[0] === undefined) {
            paramsObj = { options: args[0] || {} };
          }
          break;
          
        case 'fetchR2Json':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              path: args[0], 
              opts: args.length > 1 && typeof args[1] === 'object' ? args[1] : {} 
            };
          }
          break;
          
        case 'fetchJson':
          if (typeof args[0] === 'string') {
            paramsObj = { 
              url: args[0], 
              opts: args.length > 1 && typeof args[1] === 'object' ? args[1] : {} 
            };
          }
          break;
          
        // Default handler for functions with single object parameter
        default:
          // Try to use the first argument if no specific handler
          paramsObj = args[0] || {};
      }
    }

    // Validate parameters if we have a schema
    if (hasSchema) {
      const validation = validateFunctionParams(functionName, paramsObj);
      
      if (!validation.success) {
        throw new Error(`Parameter validation failed for ${String(functionName)}: ${validation.error}`);
      }
      
      // For functions that expect positional parameters, extract them from the validated object
      let validatedArgs = [validation.data];
    
      // Convert back to positional parameters if needed based on function name
      switch (functionName) {
        case 'getPostBySlug':
          validatedArgs = [validation.data.slug];
          break;
            
        case 'getPostByHash':
          validatedArgs = [validation.data.hash];
          break;
          
        case 'getPostByPath':
          validatedArgs = [validation.data.path];
          break;
          
        case 'getRecentPosts':
          validatedArgs = [validation.data.count];
          break;
          
        case 'getFileContent':
          validatedArgs = [validation.data.path, validation.data.useCache];
          break;
          
        case 'getPostsSimilarityByHashes':
          validatedArgs = [validation.data.hash1, validation.data.hash2];
          break;
          
        case 'getSimilarPostsByHash':
          validatedArgs = [validation.data.hash, validation.data.count, validation.data.options];
          break;
          
        case 'getSimilarPostsBySlug':
          validatedArgs = [validation.data.slug, validation.data.count, validation.data.options];
          break;
          
        case 'getSimilarPostsSlugBySlug':
          validatedArgs = [validation.data.slug, validation.data.limit];
          break;
          
        case 'getGraph':
          validatedArgs = [validation.data.useCache];
          break;
          
        case 'getR2Url':
        case 'getR2ProjectUrl':
        case 'getR2SharedFolderUrl':
        case 'getR2RevUrl':
          validatedArgs = [validation.data.path];
          break;
          
        case 'createViteProxy':
          validatedArgs = [validation.data.folder];
          break;
          
        case 'fetchPublicApi':
          validatedArgs = [validation.data.path];
          break;
          
        case 'getActiveProjectRev':
          validatedArgs = [validation.data.forceRefresh, validation.data.skipDetails];
          break;
          
        case 'sortPostsByDate':
          validatedArgs = [validation.data.posts];
          break;
          
        case 'getPostsEmbeddings':
        case 'getPostsSimilarity': 
        case 'getTopSimilarPostsHashes':
        case 'getSqliteUrl':
        case 'fetchProjectDetails':
        case 'getReleaseInfo':
        case 'getProjectMetadata':
        case 'getClientStats':
        case 'getMediaItems':
          validatedArgs = [validation.data.useCache];
          break;
          
        case 'fetchProjectActiveRev':
          validatedArgs = [validation.data.forceRefresh];
          break;
          
        case 'handleOpenAiRequest':
          validatedArgs = [validation.data.request, validation.data.options];
          break;
          
        case 'createOpenAiToolHandler':
          validatedArgs = [validation.data.options];
          break;
          
        case 'fetchR2Json':
          validatedArgs = [validation.data.path, validation.data.opts];
          break;
          
        case 'fetchJson':
          validatedArgs = [validation.data.url, validation.data.opts];
          break;
          
        // For functions not specifically handled, pass the validated object
        default:
          validatedArgs = [validation.data];
      }
      
      // Call the original method with validated arguments
      return originalMethod.apply(this, validatedArgs);
    } else {
      // If no schema, just call the original method directly
      return originalMethod.apply(this, args);
    }
  };
}

/**
 * Applies validation wrappers to RepoMD methods
 * @param {Object} instance - The RepoMD instance to apply validation to
 * @param {string[]} methodNames - Optional list of method names to validate
 */
export function applyValidation(instance, methodNames) {
  const methods = methodNames || Object.keys(instance);
  
  for (const methodName of methods) {
    // Skip non-function properties and private methods
    if (typeof instance[methodName] !== 'function' || methodName.startsWith('_')) {
      continue;
    }
    
    // Skip constructor and known internal methods
    if (methodName === 'constructor' || methodName === 'destroy') {
      continue;
    }
    
    // Create a validated wrapper
    const originalMethod = instance[methodName];
    instance[methodName] = createValidatedFunction(methodName, originalMethod);
  }
}