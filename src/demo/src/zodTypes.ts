import { z } from 'zod';
import { schemas, repoMdOptionsSchema as repoMdOptions, FunctionSchemas } from './schemas.js';

// Re-export the schema
export const repoMdOptionsSchema = repoMdOptions;

// Infer TypeScript types from Zod schemas
export type RepoMdOptions = z.infer<typeof repoMdOptionsSchema>;

// Create parameter types for each function
export type FunctionParams = {
  [K in keyof FunctionSchemas]: z.infer<FunctionSchemas[K]>
};

// Type for parameter metadata
export interface ParamMetadata {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description?: string;
}

// Flatten schema objects into parameter metadata
export function extractParamMetadata(schema: z.ZodObject<any>): ParamMetadata[] {
  const shape = schema._def.shape();
  const metadata: ParamMetadata[] = [];

  for (const [name, zodType] of Object.entries(shape)) {
    let type = 'unknown';
    let required = true;
    let defaultValue: any = undefined;
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
function getZodTypeName(zodType: z.ZodTypeAny): string {
  if (zodType instanceof z.ZodString) return 'string';
  if (zodType instanceof z.ZodNumber) return 'number';
  if (zodType instanceof z.ZodBoolean) return 'boolean';
  if (zodType instanceof z.ZodArray) return 'array';
  if (zodType instanceof z.ZodObject) return 'object';
  if (zodType instanceof z.ZodEnum) return `enum (${zodType._def.values.join(', ')})`;
  return 'unknown';
}

// Generate metadata for all function parameters
export const functionParamMetadata: Record<string, ParamMetadata[]> = {};

// Extract metadata for each function schema
for (const [funcName, schema] of Object.entries(schemas)) {
  functionParamMetadata[funcName] = extractParamMetadata(schema);
}

// Validate function parameters against their schema
export function validateFunctionParams<T extends keyof FunctionSchemas>(
  functionName: T, 
  params: any
): { success: boolean; data: FunctionParams[T]; error?: string } {
  if (!schemas[functionName]) {
    return { 
      success: false, 
      data: {} as FunctionParams[T],
      error: `Schema not found for function: ${String(functionName)}` 
    };
  }

  try {
    const schema = schemas[functionName];
    const validatedData = schema.parse(params);
    return { success: true, data: validatedData as FunctionParams[T] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return { success: false, data: {} as FunctionParams[T], error: errorMessages };
    }
    return { success: false, data: {} as FunctionParams[T], error: 'Validation error: ' + String(error) };
  }
}

// Export the type for the RepoMD class to help IDE autocompletion
export interface RepoMdInterface {
  // Constructor options
  org: string;
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string | null;
  rev: string;
  debug: boolean;
  secret: string | null;
  activeRev: string | null;
  strategy: string;

  // Posts Methods
  getAllPosts(params?: FunctionParams['getAllPosts']): Promise<any[]>;
  getPostBySlug(params: FunctionParams['getPostBySlug']): Promise<any | null>;
  getPostByHash(params: FunctionParams['getPostByHash']): Promise<any | null>;
  getPostByPath(params: FunctionParams['getPostByPath']): Promise<any | null>;
  getRecentPosts(params?: FunctionParams['getRecentPosts']): Promise<any[]>;
  augmentPostsByProperty(params: FunctionParams['augmentPostsByProperty']): Promise<any[]>;

  // Similarity Methods
  getPostsSimilarityByHashes(params: FunctionParams['getPostsSimilarityByHashes']): Promise<number>;
  getSimilarPostsHashByHash(params: FunctionParams['getSimilarPostsHashByHash']): Promise<string[]>;
  getSimilarPostsByHash(params: FunctionParams['getSimilarPostsByHash']): Promise<any[]>;
  getSimilarPostsBySlug(params: FunctionParams['getSimilarPostsBySlug']): Promise<any[]>;

  // Media Methods
  getR2MediaUrl(params: FunctionParams['getR2MediaUrl']): Promise<string>;
  getAllMedia(params?: FunctionParams['getAllMedia']): Promise<any>;
  getAllMedias(params?: FunctionParams['getAllMedias']): Promise<any>;

  // File Methods
  getSourceFilesList(params?: FunctionParams['getSourceFilesList']): Promise<any[]>;
  getDistFilesList(params?: FunctionParams['getDistFilesList']): Promise<any[]>;
  getFileContent(params: FunctionParams['getFileContent']): Promise<any>;

  // Project Methods
  getReleaseInfo(params?: FunctionParams['getReleaseInfo']): Promise<any>;
  getProjectMetadata(params?: FunctionParams['getProjectMetadata']): Promise<any>;
}