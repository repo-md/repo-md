import { z } from 'zod';
import { schemas, repoMdOptionsSchema } from './schemas.js';

// Type for parameter metadata
// Flatten schema objects into parameter metadata
export function extractParamMetadata(schema) {
  // Handle ZodEffects (schemas with refine, transform, etc.)
  let actualSchema = schema;
  if (schema instanceof z.ZodEffects) {
    actualSchema = schema._def.schema;
  }
  
  // Make sure we have a shape function
  if (!actualSchema._def.shape || typeof actualSchema._def.shape !== 'function') {
    console.warn('Schema does not have a valid shape function:', actualSchema);
    return [];
  }
  
  const shape = actualSchema._def.shape();
  const metadata = [];

  for (const [name, zodType] of Object.entries(shape)) {
    let type = 'unknown';
    let required = true;
    let defaultValue = undefined;
    let description = zodType.description || '';

    // Determine parameter type and if it's required
    if (zodType instanceof z.ZodString) {
      type = 'string';
    } else if (zodType instanceof z.ZodNumber) {
      type = 'number';
    } else if (zodType instanceof z.ZodBoolean) {
      type = 'boolean';
    } else if (zodType instanceof z.ZodArray) {
      type = 'array';
    } else if (zodType instanceof z.ZodObject) {
      type = 'object';
    } else if (zodType instanceof z.ZodEnum) {
      type = `enum (${zodType._def.values.join(', ')})`;
    } else if (zodType instanceof z.ZodNullable) {
      type = `${getZodTypeName(zodType._def.innerType)} | null`;
    }

    // Check if optional or has default
    if (zodType instanceof z.ZodOptional || zodType instanceof z.ZodDefault) {
      required = false;
      
      // Get inner type for optional/default fields
      let innerType = zodType._def.innerType || zodType;
      
      // Extract description from inner type if available
      if (innerType.description) {
        description = innerType.description;
      }
      
      // Get default value if available
      if (zodType instanceof z.ZodDefault && zodType._def.defaultValue !== undefined) {
        defaultValue = zodType._def.defaultValue();
      } else if ('_def' in innerType && innerType._def.defaultValue !== undefined) {
        defaultValue = typeof innerType._def.defaultValue === 'function' 
          ? innerType._def.defaultValue() 
          : innerType._def.defaultValue;
      }
      
      // Update type information for optional fields
      type = getZodTypeName(innerType);
    }

    // Add parameter metadata
    metadata.push({
      name,
      type,
      required,
      ...(defaultValue !== undefined && { default: defaultValue }),
      ...(description && { description })
    });
  }

  return metadata;
}

// Helper to get the type name from a Zod type
function getZodTypeName(zodType) {
  if (zodType instanceof z.ZodString) return 'string';
  if (zodType instanceof z.ZodNumber) return 'number';
  if (zodType instanceof z.ZodBoolean) return 'boolean';
  if (zodType instanceof z.ZodArray) return 'array';
  if (zodType instanceof z.ZodObject) return 'object';
  if (zodType instanceof z.ZodEnum) return `enum (${zodType._def.values.join(', ')})`;
  if (zodType instanceof z.ZodOptional) return getZodTypeName(zodType._def.innerType);
  if (zodType instanceof z.ZodDefault) return getZodTypeName(zodType._def.innerType);
  if (zodType instanceof z.ZodNullable) return `${getZodTypeName(zodType._def.innerType)} | null`;
  if (zodType instanceof z.ZodEffects) return getZodTypeName(zodType._def.schema);
  return 'unknown';
}

// Generate metadata for all function parameters
export const functionParamMetadata = {};

// Extract metadata for each function schema
for (const [funcName, schema] of Object.entries(schemas)) {
  functionParamMetadata[funcName] = extractParamMetadata(schema);
}

// Function to get method description from schema
export function getMethodDescription(functionName) {
  const schema = schemas[functionName];
  if (!schema) return null;
  
  return {
    name: functionName,
    description: schema.description || '',
    parameters: extractParamMetadata(schema),
    category: inferCategoryFromName(functionName)
  };
}

// Function to get all method descriptions
export function getAllMethodDescriptions() {
  const descriptions = {};
  for (const functionName of Object.keys(schemas)) {
    descriptions[functionName] = getMethodDescription(functionName);
  }
  return descriptions;
}

// Function to get methods by category
export function getMethodsByCategory(category) {
  const allMethods = getAllMethodDescriptions();
  return Object.entries(allMethods)
    .filter(([_, meta]) => meta.category === category)
    .reduce((acc, [name, meta]) => ({ ...acc, [name]: meta }), {});
}

// Helper function to infer category from function name
function inferCategoryFromName(functionName) {
  // Check AI Inference first before general Embedding check
  if (functionName.includes('computeTextEmbedding') || functionName.includes('computeClipTextEmbedding') || functionName.includes('computeClipImageEmbedding')) return 'AI Inference';
  if (functionName.includes('Post') || functionName.includes('posts')) return 'Posts';
  if (functionName.includes('Media') || functionName.includes('media')) return 'Media';
  if (functionName.includes('Similar') || functionName.includes('Embedding')) return 'Similarity';
  if (functionName.includes('File') || functionName.includes('Graph')) return 'Files';
  if (functionName.includes('Project') || functionName.includes('Release')) return 'Project';
  if (functionName.includes('R2') || functionName.includes('Url') || functionName.includes('Sqlite')) return 'URLs';
  if (functionName.includes('Api') || functionName.includes('fetch')) return 'API';
  if (functionName.includes('OpenAi')) return 'OpenAI';
  return 'Utility';
}

// Validate function parameters against their schema
export function validateFunctionParams(functionName, params) {
  if (!schemas[functionName]) {
    return { 
      success: false, 
      data: {},
      error: `Schema not found for function: ${String(functionName)}` 
    };
  }

  try {
    const schema = schemas[functionName];
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, data: {}, error: errorMessages };
    }
    return { success: false, data: {}, error: 'Validation error: ' + String(error) };
  }
}