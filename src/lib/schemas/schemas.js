import { z } from "zod";

// Base schemas for common parameter types
const stringSchema = z.string();
const booleanSchema = z.boolean().optional().default(true);
const booleanSchemaTrue = booleanSchema;
const booleanSchemaFalse = z.boolean().optional().default(false);
const numberSchema = z.number().nonnegative().optional();
const optionsSchema = z.record(z.any()).optional().default({});

// Common limit schemas
const limit10Schema = z.number().nonnegative().optional().default(10);
const limit20Schema = z.number().nonnegative().optional().default(20);
const limit3Schema = z.number().nonnegative().optional().default(3);
const limit5Schema = z.number().nonnegative().optional().default(5);
const limit50Schema = z.number().nonnegative().optional().default(50);

// Additional shortcut schemas for repetitive params
const hashSchema = stringSchema
  .refine((val) => val.length > 0, {
    message: "Hash is required and cannot be empty",
  })
  .describe("Unique hash identifier");

const slugSchema = stringSchema
  .refine((val) => val.length > 0, {
    message: "Slug is required and cannot be empty",
  })
  .describe("URL-friendly identifier");

const pathSchema = stringSchema
  .refine((val) => val.length > 0, {
    message: "Path is required and cannot be empty",
  })
  .describe("File path within the repository");

const useCacheSchema = booleanSchema.describe(
  "Use cached data if available to improve performance"
);

const forceRefreshSchema = booleanSchemaFalse.describe(
  "Force refresh from source even if cached data exists"
);

const searchTextSchema = stringSchema
  .refine((val) => val.length > 0, {
    message: "Search text/query is required and cannot be empty",
  })
  .describe("Text query for search or similarity matching");

const imageInputSchema = stringSchema
  .refine((val) => val.trim().length > 0, {
    message: "Image input is required and cannot be empty",
  })
  .describe("Image URL (https://...) or base64-encoded data string");

const thresholdSchema = z
  .number()
  .min(0)
  .max(1)
  .optional()
  .default(0.1)
  .describe("Minimum similarity threshold (0-1, higher = more similar)");

const requestObjectSchema = z
  .object({})
  .refine((val) => typeof val === "object", {
    message: "Request object is required",
  });

// Metadata interface for type safety
/* 
export interface MethodMeta {
  popular?: boolean;      // Commonly used methods
  inference?: boolean;    // AI/ML-powered methods
  internal?: boolean;     // Internal/system methods
  framework?: boolean;    // Framework integration methods
  memoryHeavy?: boolean;  // Methods that consume significant memory
  deprecated?: boolean;   // Deprecated methods
  cacheable?: boolean;    // Methods that benefit from caching
  readonly?: boolean;     // Methods that only read data
}
*/

// RepoMD Constructor Options Schema
export const repoMdOptionsSchema = z.object({
  projectId: z.string().optional().default("680e97604a0559a192640d2c"),
  projectSlug: z.string().optional().default("undefined-project-slug"),
  rev: z.string().optional().default("latest"),
  secret: z.string().nullable().optional().default(null),
  debug: z.boolean().optional().default(false),
  strategy: z.enum(["auto", "browser", "server"]).optional().default("auto"),
});

// API Methods with descriptions and metadata
export const schemas = {
  // Posts Methods
  getAllPosts: z
    .object({
      useCache: useCacheSchema,
      forceRefresh: forceRefreshSchema,
    })
    .describe(
      "Retrieve all blog posts from the repository with metadata and content"
    )
    .meta({ popular: true, readonly: true, cacheable: true }),

  getPostBySlug: z
    .object({
      slug: slugSchema.describe("URL-friendly identifier for the specific post to retrieve"),
    })
    .describe("Get a specific blog post by its URL slug identifier")
    .meta({ popular: true, readonly: true, cacheable: true }),

  getPostByHash: z
    .object({
      hash: hashSchema.describe("Unique hash identifier for the specific post to retrieve"),
    })
    .describe("Get a specific blog post by its unique hash identifier")
    .meta({ readonly: true, cacheable: true }),

  getPostByPath: z
    .object({
      path: pathSchema.describe("File path within the repository to retrieve"),
    })
    .describe("Get a specific blog post by its file path in the repository")
    .meta({ readonly: true, cacheable: true }),

  getRecentPosts: z
    .object({
      count: limit3Schema.describe(
        "Number of recent posts to return (default: 3)"
      ),
    })
    .describe("Get the most recent blog posts sorted by date")
    .meta({ popular: true, readonly: true, cacheable: true }),

  // Similarity Methods
  getPostsSimilarityByHashes: z
    .object({
      hash1: hashSchema.describe("Hash of the first post to compare"),
      hash2: hashSchema.describe("Hash of the second post to compare"),
    })
    .describe(
      "Calculate similarity score between two specific posts using their hash identifiers"
    )
    .meta({ inference: true, readonly: true, cacheable: true }),

  getSimilarPostsHashByHash: z
    .object({
      hash: hashSchema.describe("Hash of the reference post to find similar content for"),
      limit: limit10Schema.describe(
        "Maximum number of similar post hashes to return"
      ),
    })
    .describe(
      "Get list of similar post hashes for a given post using AI similarity matching"
    )
    .meta({ inference: true, popular: true, readonly: true, cacheable: true }),

  getSimilarPostsByHash: z
    .object({
      hash: hashSchema.describe("Hash of the reference post to find similar content for"),
      count: limit5Schema.describe(
        "Number of similar posts to return with full metadata"
      ),
      options: optionsSchema.describe(
        "Additional options for similarity calculation and filtering"
      ),
    })
    .describe(
      "Find posts similar to the given post using AI embeddings, returns full post objects"
    )
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true, cacheable: true }),

  getSimilarPostsBySlug: z
    .object({
      slug: slugSchema.describe("Slug of the reference post to find similar content for"),
      count: limit5Schema.describe("Number of similar posts to return"),
      options: optionsSchema.describe(
        "Additional options for similarity calculation"
      ),
    })
    .describe(
      "Find posts similar to the given post using AI embeddings and semantic analysis"
    )
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true, cacheable: true }),

  // Search Methods
  searchPosts: z
    .object({
      text: stringSchema
        .optional()
        .describe(
          "Search query text (required for memory, vector, vector-text, vector-clip-text modes)"
        ),
      image: imageInputSchema
        .optional()
        .describe(
          "Image URL or base64 data (required for vector-clip-image mode)"
        ),
      props: z
        .object({
          limit: limit20Schema.describe(
            "Maximum number of search results to return"
          ),
          fuzzy: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .default(0.2)
            .describe("Fuzzy matching tolerance (0 = exact, 1 = very fuzzy)"),
          prefix: z
            .boolean()
            .optional()
            .default(true)
            .describe("Enable prefix matching for partial words"),
          boost: z
            .object({
              title: z
                .number()
                .positive()
                .optional()
                .default(3)
                .describe("Weight multiplier for title matches"),
              excerpt: z
                .number()
                .positive()
                .optional()
                .default(2)
                .describe("Weight multiplier for excerpt matches"),
              content: z
                .number()
                .positive()
                .optional()
                .default(1)
                .describe("Weight multiplier for content matches"),
              tags: z
                .number()
                .positive()
                .optional()
                .default(1)
                .describe("Weight multiplier for tag matches"),
              plain: z
                .number()
                .positive()
                .optional()
                .default(2)
                .describe("Weight multiplier for plain text content matches"),
            })
            .optional()
            .describe("Field-specific weight boosts for search relevance"),
        })
        .optional()
        .default({})
        .describe("Additional search configuration options"),
      mode: z
        .enum([
          "memory",
          "vector",
          "vector-text",
          "vector-clip-text",
          "vector-clip-image",
        ])
        .optional()
        .default("memory")
        .describe(
          "Search mode: 'memory' = keyword search in posts, 'vector'/'vector-text' = semantic text search in posts using text embeddings, 'vector-clip-text' = text-to-image search in media using CLIP embeddings, 'vector-clip-image' = image-to-image search in media using CLIP embeddings"
        ),
    })
    .describe(
      "Search across posts and media with multiple modes: memory/vector search posts by text, CLIP modes search media by text or image similarity"
    )
    .meta({ popular: true, inference: true, memoryHeavy: true, readonly: true }),

  searchAutocomplete: z
    .object({
      term: searchTextSchema.describe(
        "Partial search term to generate autocomplete suggestions for"
      ),
      limit: limit10Schema.describe(
        "Maximum number of autocomplete suggestions to return"
      ),
    })
    .describe(
      "Get autocomplete suggestions based on indexed search terms from posts"
    )
    .meta({ popular: true, readonly: true, cacheable: true }),

  refreshSearchIndex: z
    .object({})
    .describe(
      "Refresh the search index with latest post data for updated search results"
    )
    .meta({ internal: true }),

  // Vector Search Methods
  findPostsByText: z
    .object({
      text: searchTextSchema.describe("Text query to find semantically similar posts"),
      options: z
        .object({
          limit: limit20Schema.describe("Maximum number of posts to return"),
          threshold: thresholdSchema,
          useClip: z
            .boolean()
            .optional()
            .default(false)
            .describe("Use CLIP embeddings for multimodal search capabilities"),
        })
        .optional()
        .default({})
        .describe("Search configuration options"),
    })
    .describe("Find posts using semantic similarity with AI text embeddings")
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true }),

  findImagesByText: z
    .object({
      text: searchTextSchema.describe("Text description to find matching images"),
      options: z
        .object({
          limit: limit20Schema.describe("Maximum number of images to return"),
          threshold: thresholdSchema,
        })
        .optional()
        .default({})
        .describe("Search configuration options"),
    })
    .describe(
      "Find images using text descriptions with CLIP multimodal AI embeddings"
    )
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true }),

  findImagesByImage: z
    .object({
      image: imageInputSchema.describe("Image URL or base64 data to find visually similar images"),
      options: z
        .object({
          limit: limit20Schema.describe("Maximum number of images to return"),
          threshold: thresholdSchema,
        })
        .optional()
        .default({})
        .describe("Search configuration options"),
    })
    .describe("Find visually similar images using CLIP image embeddings")
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true }),

  findSimilarContent: z
    .object({
      query: searchTextSchema.describe("Text query or image URL/data to find similar content"),
      options: z
        .object({
          limit: limit20Schema.describe("Maximum number of results to return"),
          threshold: thresholdSchema,
          type: z
            .enum(["auto", "clip"])
            .optional()
            .default("auto")
            .describe(
              "Search type - 'auto' detects query type, 'clip' forces CLIP embeddings"
            ),
        })
        .optional()
        .default({})
        .describe("Search configuration options"),
    })
    .describe(
      "Universal similarity search that automatically detects query type (text or image) and searches both posts and media"
    )
    .meta({ inference: true, popular: true, memoryHeavy: true, readonly: true }),

  // Additional Similarity Methods
  getPostsEmbeddings: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get AI vector embeddings for all posts used in similarity calculations"
    )
    .meta({ inference: true, internal: true, memoryHeavy: true, readonly: true, cacheable: true }),

  getPostsSimilarity: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get the complete similarity matrix showing relationships between all posts"
    )
    .meta({ inference: true, internal: true, memoryHeavy: true, readonly: true, cacheable: true }),

  getTopSimilarPostsHashes: z
    .object({
      useCache: useCacheSchema,
    })
    .describe("Get the most similar post pairs from the entire collection")
    .meta({ inference: true, readonly: true, cacheable: true }),

  getSimilarPostsSlugBySlug: z
    .object({
      slug: slugSchema.describe("Slug of the reference post to find similar content for"),
      limit: limit10Schema.describe(
        "Maximum number of similar post slugs to return"
      ),
    })
    .describe(
      "Get list of similar post slugs for a given post using AI similarity matching"
    )
    .meta({ inference: true, readonly: true, cacheable: true }),

  // Media Methods
  getR2MediaUrl: z
    .object({
      path: pathSchema.describe("Media file path to generate optimized URL for"),
    })
    .describe(
      "Generate optimized URL for media files with automatic format conversion"
    )
    .meta({ popular: true, readonly: true }),

  getAllMedia: z
    .object({
      useCache: useCacheSchema,
    })
    .describe("Retrieve all media files with metadata and optimized URLs")
    .meta({ popular: true, readonly: true, cacheable: true }),

  getAllMedias: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Retrieve all media files with metadata (deprecated alias for getAllMedia)"
    )
    .meta({ memoryHeavy: true, deprecated: true, readonly: true, cacheable: true }),

  getMediaItems: z
    .object({
      useCache: useCacheSchema,
    })
    .describe("Get media items with formatted URLs and metadata for display")
    .meta({ readonly: true, cacheable: true }),

  // Media Similarity Methods
  getMediaEmbeddings: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get AI vector embeddings for all media files used in similarity calculations"
    )
    .meta({ inference: true, internal: true, memoryHeavy: true, readonly: true, cacheable: true }),

  getMediaSimilarity: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get the complete similarity matrix showing relationships between all media files"
    )
    .meta({ inference: true, internal: true, memoryHeavy: true, readonly: true, cacheable: true }),

  getMediaSimilarityByHashes: z
    .object({
      hash1: hashSchema.describe("Hash of the first media file to compare"),
      hash2: hashSchema.describe("Hash of the second media file to compare"),
    })
    .describe(
      "Calculate similarity score between two specific media files using their hash identifiers"
    )
    .meta({ inference: true, readonly: true, cacheable: true }),

  getTopSimilarMediaHashes: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get the most similar media file pairs from the entire collection"
    )
    .meta({ inference: true, readonly: true, cacheable: true }),

  getSimilarMediaHashByHash: z
    .object({
      hash: hashSchema.describe(
        "Hash of the reference media file to find similar content for"
      ),
      limit: limit10Schema.describe(
        "Maximum number of similar media hashes to return"
      ),
    })
    .describe(
      "Get list of similar media file hashes for a given media file using AI similarity matching"
    )
    .meta({ inference: true, readonly: true, cacheable: true }),

  getSimilarMediaByHash: z
    .object({
      hash: hashSchema.describe(
        "Hash of the reference media file to find similar content for"
      ),
      count: limit5Schema.describe(
        "Number of similar media files to return with full metadata"
      ),
    })
    .describe(
      "Find media files similar to the given media file using AI embeddings, returns full media objects"
    )
    .meta({ inference: true, memoryHeavy: true, readonly: true, cacheable: true }),

  handleCloudflareRequest: z
    .object({
      request: requestObjectSchema.describe(
        "Cloudflare request object containing transformation parameters"
      ),
    })
    .describe(
      "Handle Cloudflare media transformation requests for optimized image delivery"
    )
    .meta({ internal: true, framework: true }),

  // File Methods
  getSourceFilesList: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get list of all source files in the repository before build processing"
    )
    .meta({ readonly: true, cacheable: true }),

  getDistFilesList: z
    .object({
      useCache: useCacheSchema,
    })
    .describe("Get list of all built/distribution files after processing")
    .meta({ readonly: true, cacheable: true }),

  getFileContent: z
    .object({
      path: pathSchema.describe("File path within the repository to read content from"),
      useCache: useCacheSchema,
    })
    .describe("Read the content of a specific file from the repository")
    .meta({ readonly: true, cacheable: true }),

  getGraph: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get the project dependency graph showing relationships between files and components"
    )
    .meta({ memoryHeavy: true, readonly: true, cacheable: true }),

  // URL Methods
  getR2Url: z
    .object({
      path: z
        .string()
        .optional()
        .default("")
        .describe(
          "File path within the repository (optional, defaults to root)"
        ),
    })
    .describe(
      "Generate R2 storage URL for accessing repository files with automatic revision resolution"
    )
    .meta({ popular: true, readonly: true }),

  getR2ProjectUrl: z
    .object({
      path: z
        .string()
        .optional()
        .default("")
        .describe(
          "File path within the project folder (optional, defaults to root)"
        ),
    })
    .describe(
      "Generate project-specific R2 URL for accessing project-level resources"
    )
    .meta({ readonly: true }),

  getR2SharedFolderUrl: z
    .object({
      path: z
        .string()
        .optional()
        .default("")
        .describe(
          "File path within the shared folder (optional, defaults to root)"
        ),
    })
    .describe(
      "Generate R2 URL for shared folder resources accessible across projects"
    )
    .meta({ readonly: true }),

  getR2RevUrl: z
    .object({
      path: z
        .string()
        .optional()
        .default("")
        .describe(
          "File path within the repository (optional, defaults to root)"
        ),
    })
    .describe(
      "Generate revision-specific R2 URL for accessing repository files (alias for getR2Url)"
    )
    .meta({ readonly: true, deprecated: true }),

  createViteProxy: z
    .object({
      folder: z
        .string()
        .optional()
        .default("_repo")
        .describe("Repository folder name for Vite proxy configuration"),
    })
    .describe(
      "Create Vite development server proxy configuration for local development"
    )
    .meta({ framework: true }),

  getSqliteUrl: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get URL for the SQLite database containing repository metadata and search indices"
    )
    .meta({ framework: true, readonly: true, cacheable: true }),

  // API Methods
  fetchPublicApi: z
    .object({
      path: z
        .string()
        .optional()
        .default("/")
        .describe("API endpoint path to fetch from (defaults to root)"),
    })
    .describe(
      "Fetch data from public API endpoints with automatic error handling and retries"
    )
    .meta({ internal: true, readonly: true }),

  fetchProjectDetails: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get detailed project information including metadata, configuration, and settings"
    )
    .meta({ readonly: true, cacheable: true }),

  fetchR2Json: z
    .object({
      path: pathSchema.describe("File path in R2 storage to fetch JSON data from"),
      opts: z
        .record(z.any())
        .optional()
        .default({})
        .describe(
          "Additional fetch options like caching, headers, and timeouts"
        ),
    })
    .describe(
      "Fetch JSON data from R2 storage with automatic revision resolution and error handling"
    )
    .meta({ internal: true, readonly: true }),

  fetchJson: z
    .object({
      url: z
        .string()
        .refine((val) => val.length > 0, {
          message: "URL is required for fetchJson operation",
        })
        .describe("Complete URL to fetch JSON data from"),
      opts: z
        .record(z.any())
        .optional()
        .default({})
        .describe(
          "Additional fetch options like headers, timeout, and caching"
        ),
    })
    .describe(
      "Fetch JSON data from any URL with error handling and optional caching"
    )
    .meta({ internal: true, readonly: true }),

  getActiveProjectRev: z
    .object({
      forceRefresh: forceRefreshSchema,
      skipDetails: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Skip fetching detailed project information for faster response"
        ),
    })
    .describe(
      "Get the active revision ID for the project with optional caching and detail control"
    )
    .meta({ readonly: true, cacheable: true }),

  fetchProjectActiveRev: z
    .object({
      forceRefresh: forceRefreshSchema,
    })
    .describe(
      "Fetch the current active revision ID for the project from the API"
    )
    .meta({ readonly: true }),

  handleOpenAiRequest: z
    .object({
      request: requestObjectSchema.describe(
        "OpenAI API request object containing function calls and context"
      ),
      options: z
        .record(z.any())
        .optional()
        .default({})
        .describe("Additional options for OpenAI request processing"),
    })
    .describe(
      "Process OpenAI function calling requests with RepoMD context and tools"
    )
    .meta({ inference: true, framework: true }),

  createOpenAiToolHandler: z
    .object({
      options: z
        .record(z.any())
        .optional()
        .default({})
        .describe("Configuration options for the OpenAI tool handler"),
    })
    .describe(
      "Create a handler for OpenAI function calling that provides access to RepoMD methods"
    )
    .meta({ inference: true, framework: true }),

  // Utility Methods
  getClientStats: z
    .object({})
    .describe(
      "Get performance statistics and usage metrics for the RepoMD client instance"
    )
    .meta({ internal: true, readonly: true }),

  sortPostsByDate: z
    .object({
      posts: z
        .array(z.any())
        .min(1, "Posts array cannot be empty")
        .describe("Array of post objects to sort by date"),
    })
    .describe(
      "Sort an array of posts by their publication date (newest first)"
    )
    .meta({ readonly: true }),

  // Project Methods
  getReleaseInfo: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get release information and version details for the current project"
    )
    .meta({ readonly: true, cacheable: true }),

  getProjectMetadata: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get comprehensive project metadata including configuration, settings, and build information"
    )
    .meta({ readonly: true, cacheable: true }),

  ensureLatestRev: z
    .object({})
    .describe(
      "Ensure the latest revision is resolved and cached for subsequent operations"
    )
    .meta({ internal: true }),

  // Instance Management Methods
  destroy: z
    .object({})
    .describe(
      "Clean up RepoMD instance resources, clear caches, and abort pending operations"
    )
    .meta({ internal: true }),

  // Method Aliases
  getPostsBySlug: z
    .object({
      slug: slugSchema.describe("URL-friendly slug identifier for the post to retrieve"),
    })
    .describe(
      "Get a blog post by its slug (alias for getPostBySlug for backward compatibility)"
    )
    .meta({ popular: true, deprecated: true, readonly: true, cacheable: true }),

  getSourceFiles: z
    .object({
      useCache: useCacheSchema,
    })
    .describe(
      "Get list of source files in the repository (alias for getSourceFilesList)"
    )
    .meta({ framework: true, deprecated: true, readonly: true, cacheable: true }),

  getOpenAiToolSpec: z
    .object({
      blacklistedTools: z
        .array(z.string())
        .optional()
        .default([])
        .describe(
          "Array of function names to exclude from the tool specification"
        ),
    })
    .describe(
      "Get OpenAI tool specification with optional filtering for project-specific configurations"
    )
    .meta({ inference: true, framework: true, readonly: true }),

  // AI Inference Methods
  computeTextEmbedding: z
    .object({
      text: searchTextSchema.describe("Text content to compute semantic embeddings for"),
      instruction: z
        .string()
        .nullable()
        .optional()
        .default(null)
        .describe(
          "Optional instruction to guide the embedding computation (e.g., 'Represent the document for retrieval:')"
        ),
    })
    .describe(
      "Compute semantic vector embeddings for text content using all-MiniLM-L6-v2 model for similarity and retrieval tasks"
    )
    .meta({ inference: true, memoryHeavy: true, readonly: true }),

  computeClipTextEmbedding: z
    .object({
      text: searchTextSchema.describe(
        "Text content to compute CLIP embeddings for, optimized for text-image matching"
      ),
    })
    .describe(
      "Compute CLIP vector embeddings for text content using MobileCLIP model, optimized for multimodal text-image similarity matching"
    )
    .meta({ inference: true, memoryHeavy: true, readonly: true }),

  computeClipImageEmbedding: z
    .object({
      image: imageInputSchema,
    })
    .describe(
      "Compute CLIP vector embeddings for images using MobileCLIP model, optimized for multimodal image-text similarity matching"
    )
    .meta({ inference: true, memoryHeavy: true, readonly: true }),
};

// Helper function to get the schema for a given function name
export function getSchemaForFunction(functionName) {
  return schemas[functionName];
}

// Helper function to filter methods by metadata
export function filterMethodsByMeta(filter) {
  const filtered = {};

  for (const [name, schema] of Object.entries(schemas)) {
    const meta = schema._def?.meta || {};

    let include = false;

    if (typeof filter === "function") {
      include = filter(meta);
    } else {
      // Check if all specified flags match
      include = Object.entries(filter).every(
        ([key, value]) => meta[key] === value
      );
    }

    if (include) {
      filtered[name] = schema;
    }
  }

  return filtered;
}

// Helper functions for common filters
export const getPopularMethods = () => filterMethodsByMeta({ popular: true });
export const getInferenceMethods = () =>
  filterMethodsByMeta({ inference: true });
export const getPublicMethods = () =>
  filterMethodsByMeta((meta) => !meta.internal);
export const getFrameworkMethods = () =>
  filterMethodsByMeta({ framework: true });
export const getLightweightMethods = () =>
  filterMethodsByMeta((meta) => !meta.memoryHeavy);
export const getInternalMethods = () => filterMethodsByMeta({ internal: true });
export const getDeprecatedMethods = () =>
  filterMethodsByMeta({ deprecated: true });
export const getCacheableMethods = () => filterMethodsByMeta({ cacheable: true });
export const getReadonlyMethods = () => filterMethodsByMeta({ readonly: true });

// Get methods by availability context
export function getMethodsByContext(context) {
  switch (context) {
    case "popular":
      return getPopularMethods();
    case "inference":
      return getInferenceMethods();
    case "framework":
      return getFrameworkMethods();
    case "public":
      return getPublicMethods();
    case "lightweight":
      return getLightweightMethods();
    case "cacheable":
      return getCacheableMethods();
    case "readonly":
      return getReadonlyMethods();
    default:
      return schemas;
  }
}

// Get metadata for a specific method
export function getMethodMeta(methodName) {
  const schema = schemas[methodName];
  if (!schema) {
    return null;
  }
  return schema._def?.meta || {};
}

// Get all method metadata as a dictionary
export function getAllMeta() {
  const allMeta = {};
  
  for (const [name, schema] of Object.entries(schemas)) {
    allMeta[name] = schema._def?.meta || {};
  }
  
  return allMeta;
}

// Utility to get method categories
export function getMethodCategories() {
  const categories = {
    posts: [],
    media: [],
    search: [],
    similarity: [],
    files: [],
    urls: [],
    api: [],
    project: [],
    utility: [],
    ai: [],
  };

  for (const [name, schema] of Object.entries(schemas