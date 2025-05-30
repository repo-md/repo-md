import { validateFunctionParams, extractParamMetadata } from './types.js';
import { schemas } from './schemas.js';

// Cache for parameter metadata to avoid repeated schema introspection
const parameterMetadataCache = new Map();

/**
 * Extract parameter metadata from schema using schema introspection
 * @param {string} functionName - The name of the function
 * @returns {Array} Array of parameter metadata objects
 */
function getParameterMetadata(functionName) {
  if (parameterMetadataCache.has(functionName)) {
    return parameterMetadataCache.get(functionName);
  }

  const schema = schemas[functionName];
  if (!schema) {
    return [];
  }

  const metadata = extractParamMetadata(schema);
  parameterMetadataCache.set(functionName, metadata);
  return metadata;
}

/**
 * Convert positional arguments to parameter object using schema-driven approach
 * @param {string} functionName - The name of the function
 * @param {Array} args - The positional arguments
 * @returns {Object} Parameter object
 */
function convertArgsToParamsObject(functionName, args) {
  const paramMetadata = getParameterMetadata(functionName);
  
  if (paramMetadata.length === 0) {
    // No schema metadata available, return first arg if it's an object, otherwise empty
    return (args.length === 1 && args[0] !== null && typeof args[0] === 'object') ? args[0] : {};
  }

  // If we have only one argument and it's an object, assume it's already a params object
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
    return args[0];
  }

  // Convert positional arguments to parameter object based on schema order
  const paramsObj = {};
  
  paramMetadata.forEach((param, index) => {
    if (index < args.length && args[index] !== undefined) {
      paramsObj[param.name] = args[index];
    } else if (param.default !== undefined) {
      paramsObj[param.name] = param.default;
    }
  });

  return paramsObj;
}

/**
 * Convert validated parameter object back to positional arguments
 * @param {string} functionName - The name of the function
 * @param {Object} validatedData - The validated parameter object
 * @returns {Array} Array of positional arguments
 */
function convertParamsObjectToArgs(functionName, validatedData) {
  const paramMetadata = getParameterMetadata(functionName);
  
  if (paramMetadata.length === 0) {
    // No schema metadata available, return the object as single argument
    return [validatedData];
  }

  // Convert parameter object to positional arguments based on schema order
  const args = [];
  
  paramMetadata.forEach((param) => {
    if (validatedData.hasOwnProperty(param.name)) {
      args.push(validatedData[param.name]);
    } else if (param.default !== undefined) {
      args.push(param.default);
    }
  });

  return args;
}

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
    // Convert positional arguments to parameter object using schema introspection
    const paramsObj = convertArgsToParamsObject(functionName, args);

    // Validate parameters using Zod schema
    const validation = validateFunctionParams(functionName, paramsObj);
    
    if (!validation.success) {
      throw new Error(`Parameter validation failed for ${String(functionName)}: ${validation.error}`);
    }
    
    // Convert validated parameter object back to positional arguments using schema introspection
    const validatedArgs = convertParamsObjectToArgs(functionName, validation.data);
    
    // Call the original method with validated arguments
    return originalMethod.apply(this, validatedArgs);
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