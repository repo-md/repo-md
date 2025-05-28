import { z } from "zod";

// Base schemas for common parameter types
const stringSchema = z.string();
const booleanSchema = z.boolean().optional().default(true);
const numberSchema = z.number().nonnegative().optional();
const optionsSchema = z.record(z.any()).optional().default({});

// RepoMD Constructor Options Schema
export const repoMdOptionsSchema = z.object({
  org: z.string().optional().default("iplanwebsites"),
  orgSlug: z.string().optional().default("iplanwebsites"),
  orgId: z.string().nullable().optional().default(null),
  projectId: z.string().optional().default("680e97604a0559a192640d2c"),
  projectSlug: z.string().optional().default("undefined-project-slug"),
  rev: z.string().optional().default("latest"),
  secret: z.string().nullable().optional().default(null),
  debug: z.boolean().optional().default(false),
  strategy: z.enum(["auto", "browser", "server"]).optional().default("auto"),
});

// API Methods
export const schemas = {
  // Posts Methods
  getAllPosts: z.object({
    useCache: booleanSchema,
    forceRefresh: z.boolean().optional().default(false),
  }),

  getPostBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getPostBySlug operation",
    }),
  }),

  getPostByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getPostByHash operation",
    }),
  }),

  getPostByPath: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getPostByPath operation",
    }),
  }),

  getRecentPosts: z.object({
    count: z.number().nonnegative().optional().default(3),
  }),

  augmentPostsByProperty: z.object({
    keys: z.array(z.string()).min(1, "Keys array cannot be empty"),
    property: z.string().refine((val) => ["hash", "slug", "id"].includes(val), {
      message: "Property must be one of: hash, slug, id",
    }),
    options: z
      .object({
        loadIndividually: z.number().nonnegative().optional().default(3),
        count: z.number().nonnegative().optional(),
        useCache: z.boolean().optional().default(true),
      })
      .optional()
      .default({}),
  }),

  // Similarity Methods
  getPostsSimilarityByHashes: z.object({
    hash1: stringSchema.refine((val) => val.length > 0, {
      message: "Hash1 is required for getPostsSimilarityByHashes operation",
    }),
    hash2: stringSchema.refine((val) => val.length > 0, {
      message: "Hash2 is required for getPostsSimilarityByHashes operation",
    }),
  }),

  getSimilarPostsHashByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarPostsHashByHash operation",
    }),
    limit: z.number().nonnegative().optional().default(10),
  }),

  getSimilarPostsByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarPostsByHash operation",
    }),
    count: z.number().nonnegative().optional().default(5),
    options: optionsSchema,
  }),

  getSimilarPostsBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getSimilarPostsBySlug operation",
    }),
    count: z.number().nonnegative().optional().default(5),
    options: optionsSchema,
  }),

  // Additional Similarity Methods
  getPostsEmbeddings: z.object({
    useCache: booleanSchema,
  }),

  getPostsSimilarity: z.object({
    useCache: booleanSchema,
  }),

  getTopSimilarPostsHashes: z.object({
    useCache: booleanSchema,
  }),

  getSimilarPostsSlugBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getSimilarPostsSlugBySlug operation",
    }),
    limit: z.number().nonnegative().optional().default(10),
  }),

  // Media Methods
  getR2MediaUrl: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getR2MediaUrl operation",
    }),
  }),

  getAllMedia: z.object({
    useCache: booleanSchema,
  }),

  getAllMedias: z.object({
    useCache: booleanSchema,
  }),

  getMediaItems: z.object({
    useCache: booleanSchema,
  }),

  // Media Similarity Methods
  getMediaEmbeddings: z.object({
    useCache: booleanSchema,
  }),

  getMediaSimilarity: z.object({
    useCache: booleanSchema,
  }),

  getMediaSimilarityByHashes: z.object({
    hash1: stringSchema.refine((val) => val.length > 0, {
      message: "Hash1 is required for getMediaSimilarityByHashes operation",
    }),
    hash2: stringSchema.refine((val) => val.length > 0, {
      message: "Hash2 is required for getMediaSimilarityByHashes operation",
    }),
  }),

  getTopSimilarMediaHashes: z.object({
    useCache: booleanSchema,
  }),

  getSimilarMediaHashByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarMediaHashByHash operation",
    }),
    limit: z.number().nonnegative().optional().default(10),
  }),

  getSimilarMediaByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarMediaByHash operation",
    }),
    count: z.number().nonnegative().optional().default(5),
  }),

  handleCloudflareRequest: z.object({
    request: z.object({}).refine((val) => typeof val === "object", {
      message:
        "Request object is required for handleCloudflareRequest operation",
    }),
  }),

  // File Methods
  getSourceFilesList: z.object({
    useCache: booleanSchema,
  }),

  getDistFilesList: z.object({
    useCache: booleanSchema,
  }),

  getFileContent: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getFileContent operation",
    }),
    useCache: booleanSchema,
  }),

  getGraph: z.object({
    useCache: booleanSchema,
  }),

  // URL Methods
  getR2Url: z.object({
    path: z.string().optional().default(""),
  }),

  getR2ProjectUrl: z.object({
    path: z.string().optional().default(""),
  }),

  getR2SharedFolderUrl: z.object({
    path: z.string().optional().default(""),
  }),

  getR2RevUrl: z.object({
    path: z.string().optional().default(""),
  }),

  createViteProxy: z.object({
    folder: z.string().optional().default("_repo"),
  }),

  getSqliteUrl: z.object({
    useCache: booleanSchema,
  }),

  // API Methods
  fetchPublicApi: z.object({
    path: z.string().optional().default("/"),
  }),

  fetchProjectDetails: z.object({
    useCache: booleanSchema,
  }),

  fetchR2Json: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for fetchR2Json operation",
    }),
    opts: z.record(z.any()).optional().default({}),
  }),

  fetchJson: z.object({
    url: z.string().refine((val) => val.length > 0, {
      message: "URL is required for fetchJson operation",
    }),
    opts: z.record(z.any()).optional().default({}),
  }),

  getActiveProjectRev: z.object({
    forceRefresh: z.boolean().optional().default(false),
    skipDetails: z.boolean().optional().default(false),
  }),

  fetchProjectActiveRev: z.object({
    forceRefresh: z.boolean().optional().default(false),
  }),

  handleOpenAiRequest: z.object({
    request: z.object({}).refine((val) => typeof val === "object", {
      message: "Request object is required for handleOpenAiRequest operation",
    }),
    options: z.record(z.any()).optional().default({}),
  }),

  createOpenAiToolHandler: z.object({
    options: z.record(z.any()).optional().default({}),
  }),

  // Utility Methods
  getClientStats: z.object({
    useCache: booleanSchema,
  }),

  sortPostsByDate: z.object({
    posts: z.array(z.any()).min(1, "Posts array cannot be empty"),
  }),

  // Project Methods
  getReleaseInfo: z.object({
    useCache: booleanSchema,
  }),

  getProjectMetadata: z.object({
    useCache: booleanSchema,
  }),
};

// Helper function to get the schema for a given function name
export function getSchemaForFunction(functionName) {
  return schemas[functionName];
}
