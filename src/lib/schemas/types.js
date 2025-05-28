import { z } from 'zod';
import { schemas, repoMdOptionsSchema } from './schemas.js';

// Type for parameter metadata
// Flatten schema objects into parameter metadata
export function extractParamMetadata(schema) {
  const shape = schema._def.shape();
  const metadata = [];

  for (const [name, zodType] of Object.entries(shape)) {
    let type = 'unknown';
    let required = true;
    let defaultValue = undefined;
    let description = '';

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

    // Check if optional
    if (zodType instanceof z.ZodOptional) {
      required = false;
      
      // Get inner type for optional fields
      const innerType = zodType._def.innerType;
      
      // Get default value if available
      if ('_def' in innerType && innerType._def.defaultValue !== undefined) {
        defaultValue = innerType._def.defaultValue;
      }
      
      // Update type information for optional fields
      if (innerType instanceof z.ZodString) {
        type = 'string';
      } else if (innerType instanceof z.ZodNumber) {
        type = 'number';
      } else if (innerType instanceof z.ZodBoolean) {
        type = 'boolean';
      } else if (innerType instanceof z.ZodArray) {
        type = 'array';
      } else if (innerType instanceof z.ZodObject) {
        type = 'object';
      } else if (innerType instanceof z.ZodEnum) {
        type = `enum (${innerType._def.values.join(', ')})`;
      } else if (innerType instanceof z.ZodNullable) {
        type = `${getZodTypeName(innerType._def.innerType)} | null`;
      }
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
  return 'unknown';
}

// Generate metadata for all function parameters
export const functionParamMetadata = {};

// Extract metadata for each function schema
for (const [funcName, schema] of Object.entries(schemas)) {
  functionParamMetadata[funcName] = extractParamMetadata(schema);
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