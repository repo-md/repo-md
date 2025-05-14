import { z } from 'zod';

// Base schemas for common parameter types
const stringSchema = z.string();
const booleanSchema = z.boolean().optional().default(true);
const numberSchema = z.number().nonnegative().optional();
const optionsSchema = z.record(z.any()).optional().default({});

// RepoMD Constructor Options Schema
export const repoMdOptionsSchema = z.object({
  org: z.string().optional().default('iplanwebsites'),
  orgSlug: z.string().optional().default('iplanwebsites'),
  orgId: z.string().nullable().optional().default(null),
  projectId: z.string().optional().default('680e97604a0559a192640d2c'),
  projectSlug: z.string().optional().default('undefined-project-slug'),
  rev: z.string().optional().default('latest'),
  secret: z.string().nullable().optional().default(null),
  debug: z.boolean().optional().default(false),
  strategy: z.enum(['auto', 'browser', 'server']).optional().default('auto')
});

// API Methods
export const schemas = {
  // Posts Methods
  getAllPosts: z.object({
    useCache: booleanSchema,
    forceRefresh: z.boolean().optional().default(false)
  }),
  
  getPostBySlug: z.object({
    slug: stringSchema.refine(val => val.length > 0, {
      message: 'Slug is required for getPostBySlug operation'
    })
  }),
  
  getPostByHash: z.object({
    hash: stringSchema.refine(val => val.length > 0, {
      message: 'Hash is required for getPostByHash operation'
    })
  }),
  
  getPostByPath: z.object({
    path: stringSchema.refine(val => val.length > 0, {
      message: 'Path is required for getPostByPath operation'
    })
  }),
  
  getRecentPosts: z.object({
    count: z.number().nonnegative().optional().default(3)
  }),
  
  augmentPostsByProperty: z.object({
    keys: z.array(z.string()).min(1, 'Keys array cannot be empty'),
    property: z.string().refine(val => ['hash', 'slug', 'id'].includes(val), {
      message: 'Property must be one of: hash, slug, id'
    }),
    options: z.object({
      loadIndividually: z.number().nonnegative().optional().default(3),
      count: z.number().nonnegative().optional(),
      useCache: z.boolean().optional().default(true)
    }).optional().default({})
  }),
  
  // Similarity Methods
  getPostsSimilarityByHashes: z.object({
    hash1: stringSchema.refine(val => val.length > 0, {
      message: 'Hash1 is required for getPostsSimilarityByHashes operation'
    }),
    hash2: stringSchema.refine(val => val.length > 0, {
      message: 'Hash2 is required for getPostsSimilarityByHashes operation'
    })
  }),
  
  getSimilarPostsHashByHash: z.object({
    hash: stringSchema.refine(val => val.length > 0, {
      message: 'Hash is required for getSimilarPostsHashByHash operation'
    }),
    limit: z.number().nonnegative().optional().default(10)
  }),
  
  getSimilarPostsByHash: z.object({
    hash: stringSchema.refine(val => val.length > 0, {
      message: 'Hash is required for getSimilarPostsByHash operation'
    }),
    count: z.number().nonnegative().optional().default(5),
    options: optionsSchema
  }),
  
  getSimilarPostsBySlug: z.object({
    slug: stringSchema.refine(val => val.length > 0, {
      message: 'Slug is required for getSimilarPostsBySlug operation'
    }),
    count: z.number().nonnegative().optional().default(5),
    options: optionsSchema
  }),
  
  // Media Methods
  getR2MediaUrl: z.object({
    path: stringSchema.refine(val => val.length > 0, {
      message: 'Path is required for getR2MediaUrl operation'
    })
  }),
  
  getAllMedia: z.object({
    useCache: booleanSchema
  }),
  
  getAllMedias: z.object({
    useCache: booleanSchema
  }),
  
  // File Methods
  getSourceFilesList: z.object({
    useCache: booleanSchema
  }),
  
  getDistFilesList: z.object({
    useCache: booleanSchema
  }),
  
  getFileContent: z.object({
    path: stringSchema.refine(val => val.length > 0, {
      message: 'Path is required for getFileContent operation'
    }),
    useCache: booleanSchema
  }),
  
  // Project Methods
  getReleaseInfo: z.object({}),
  
  getProjectMetadata: z.object({})
};

// Create a type for the schema object
export type SchemaType = typeof schemas;

// Create a type-safe record of function names to their parameter schemas
export type FunctionSchemas = {
  [K in keyof typeof schemas]: typeof schemas[K]
};

// Helper function to get the schema for a given function name
export function getSchemaForFunction<T extends keyof FunctionSchemas>(functionName: T): FunctionSchemas[T] {
  return schemas[functionName];
}