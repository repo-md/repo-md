import { z } from "zod";

// Base schemas for common parameter types
const stringSchema = z.string();
const booleanSchema = z.boolean().optional().default(true);
const numberSchema = z.number().nonnegative().optional();
const optionsSchema = z.record(z.any()).optional().default({});

// RepoMD Constructor Options Schema
export const repoMdOptionsSchema = z.object({
  projectId: z.string().optional().default("680e97604a0559a192640d2c"),
  projectSlug: z.string().optional().default("undefined-project-slug"),
  rev: z.string().optional().default("latest"),
  secret: z.string().nullable().optional().default(null),
  debug: z.boolean().optional().default(false),
  strategy: z.enum(["auto", "browser", "server"]).optional().default("auto"),
});

// API Methods with descriptions
export const schemas = {
  // Posts Methods
  getAllPosts: z.object({
    useCache: booleanSchema.describe("Use cached data if available to improve performance"),
    forceRefresh: z.boolean().optional().default(false).describe("Force refresh from R2 storage even if cached data exists"),
  }).describe("Retrieve all blog posts from the repository with metadata and content"),

  getPostBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getPostBySlug operation",
    }).describe("URL-friendly identifier for the specific post to retrieve"),
  }).describe("Get a specific blog post by its URL slug identifier"),

  getPostByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getPostByHash operation",
    }).describe("Unique hash identifier for the specific post to retrieve"),
  }).describe("Get a specific blog post by its unique hash identifier"),

  getPostByPath: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getPostByPath operation",
    }).describe("File path within the repository to retrieve"),
  }).describe("Get a specific blog post by its file path in the repository"),

  getRecentPosts: z.object({
    count: z.number().nonnegative().optional().default(3).describe("Number of recent posts to return (default: 3)"),
  }).describe("Get the most recent blog posts sorted by date"),

  // Similarity Methods
  getPostsSimilarityByHashes: z.object({
    hash1: stringSchema.refine((val) => val.length > 0, {
      message: "Hash1 is required for getPostsSimilarityByHashes operation",
    }).describe("Hash of the first post to compare"),
    hash2: stringSchema.refine((val) => val.length > 0, {
      message: "Hash2 is required for getPostsSimilarityByHashes operation",
    }).describe("Hash of the second post to compare"),
  }).describe("Calculate similarity score between two specific posts using their hash identifiers"),

  getSimilarPostsHashByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarPostsHashByHash operation",
    }).describe("Hash of the reference post to find similar content for"),
    limit: z.number().nonnegative().optional().default(10).describe("Maximum number of similar post hashes to return"),
  }).describe("Get list of similar post hashes for a given post using AI similarity matching"),

  getSimilarPostsByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarPostsByHash operation",
    }).describe("Hash of the reference post to find similar content for"),
    count: z.number().nonnegative().optional().default(5).describe("Number of similar posts to return with full metadata"),
    options: optionsSchema.describe("Additional options for similarity calculation and filtering"),
  }).describe("Find posts similar to the given post using AI embeddings, returns full post objects"),

  getSimilarPostsBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getSimilarPostsBySlug operation",
    }).describe("Slug of the reference post to find similar content for"),
    count: z.number().nonnegative().optional().default(5).describe("Number of similar posts to return"),
    options: optionsSchema.describe("Additional options for similarity calculation"),
  }).describe("Find posts similar to the given post using AI embeddings and semantic analysis"),

  // Search Methods
  searchPosts: z.object({
    text: stringSchema.refine((val) => val.length > 0, {
      message: "Search text is required and cannot be empty",
    }).describe("Search query text to find matching posts"),
    props: z.object({
      limit: z.number().nonnegative().optional().default(20).describe("Maximum number of search results to return"),
      fuzzy: z.number().min(0).max(1).optional().default(0.2).describe("Fuzzy matching tolerance (0 = exact, 1 = very fuzzy)"),
      prefix: z.boolean().optional().default(true).describe("Enable prefix matching for partial words"),
      boost: z.object({
        title: z.number().positive().optional().default(3).describe("Weight multiplier for title matches"),
        excerpt: z.number().positive().optional().default(2).describe("Weight multiplier for excerpt matches"),
        content: z.number().positive().optional().default(1).describe("Weight multiplier for content matches"),
        tags: z.number().positive().optional().default(1).describe("Weight multiplier for tag matches"),
      }).optional().describe("Field-specific weight boosts for search relevance"),
    }).optional().default({}).describe("Additional search configuration options"),
    mode: z.enum(["memory"]).optional().default("memory").describe("Search mode - currently supports 'memory' with future support for 'vector' and 'database'"),
  }).describe("Full-text search across posts with configurable relevance weighting and fuzzy matching"),

  refreshSearchIndex: z.object({}).describe("Refresh the search index with latest post data for updated search results"),

  // Additional Similarity Methods
  getPostsEmbeddings: z.object({
    useCache: booleanSchema.describe("Use cached embedding data if available for better performance"),
  }).describe("Get AI vector embeddings for all posts used in similarity calculations"),

  getPostsSimilarity: z.object({
    useCache: booleanSchema.describe("Use cached similarity data if available for better performance"),
  }).describe("Get the complete similarity matrix showing relationships between all posts"),

  getTopSimilarPostsHashes: z.object({
    useCache: booleanSchema.describe("Use cached similarity data if available for better performance"),
  }).describe("Get the most similar post pairs from the entire collection"),

  getSimilarPostsSlugBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getSimilarPostsSlugBySlug operation",
    }).describe("Slug of the reference post to find similar content for"),
    limit: z.number().nonnegative().optional().default(10).describe("Maximum number of similar post slugs to return"),
  }).describe("Get list of similar post slugs for a given post using AI similarity matching"),

  // Media Methods
  getR2MediaUrl: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getR2MediaUrl operation",
    }).describe("Media file path to generate optimized URL for"),
  }).describe("Generate optimized URL for media files with automatic format conversion"),

  getAllMedia: z.object({
    useCache: booleanSchema.describe("Use cached media data if available"),
  }).describe("Retrieve all media files with metadata and optimized URLs"),

  getAllMedias: z.object({
    useCache: booleanSchema.describe("Use cached media data if available for better performance"),
  }).describe("Retrieve all media files with metadata (deprecated alias for getAllMedia)"),

  getMediaItems: z.object({
    useCache: booleanSchema.describe("Use cached media data if available for better performance"),
  }).describe("Get media items with formatted URLs and metadata for display"),

  // Media Similarity Methods
  getMediaEmbeddings: z.object({
    useCache: booleanSchema.describe("Use cached embedding data if available for better performance"),
  }).describe("Get AI vector embeddings for all media files used in similarity calculations"),

  getMediaSimilarity: z.object({
    useCache: booleanSchema.describe("Use cached similarity data if available for better performance"),
  }).describe("Get the complete similarity matrix showing relationships between all media files"),

  getMediaSimilarityByHashes: z.object({
    hash1: stringSchema.refine((val) => val.length > 0, {
      message: "Hash1 is required for getMediaSimilarityByHashes operation",
    }).describe("Hash of the first media file to compare"),
    hash2: stringSchema.refine((val) => val.length > 0, {
      message: "Hash2 is required for getMediaSimilarityByHashes operation",
    }).describe("Hash of the second media file to compare"),
  }).describe("Calculate similarity score between two specific media files using their hash identifiers"),

  getTopSimilarMediaHashes: z.object({
    useCache: booleanSchema.describe("Use cached similarity data if available for better performance"),
  }).describe("Get the most similar media file pairs from the entire collection"),

  getSimilarMediaHashByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarMediaHashByHash operation",
    }).describe("Hash of the reference media file to find similar content for"),
    limit: z.number().nonnegative().optional().default(10).describe("Maximum number of similar media hashes to return"),
  }).describe("Get list of similar media file hashes for a given media file using AI similarity matching"),

  getSimilarMediaByHash: z.object({
    hash: stringSchema.refine((val) => val.length > 0, {
      message: "Hash is required for getSimilarMediaByHash operation",
    }).describe("Hash of the reference media file to find similar content for"),
    count: z.number().nonnegative().optional().default(5).describe("Number of similar media files to return with full metadata"),
  }).describe("Find media files similar to the given media file using AI embeddings, returns full media objects"),

  handleCloudflareRequest: z.object({
    request: z.object({}).refine((val) => typeof val === "object", {
      message:
        "Request object is required for handleCloudflareRequest operation",
    }).describe("Cloudflare request object containing transformation parameters"),
  }).describe("Handle Cloudflare media transformation requests for optimized image delivery"),

  // File Methods
  getSourceFilesList: z.object({
    useCache: booleanSchema.describe("Use cached file list if available for better performance"),
  }).describe("Get list of all source files in the repository before build processing"),

  getDistFilesList: z.object({
    useCache: booleanSchema.describe("Use cached file list if available for better performance"),
  }).describe("Get list of all built/distribution files after processing"),

  getFileContent: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for getFileContent operation",
    }).describe("File path within the repository to read content from"),
    useCache: booleanSchema.describe("Use cached file content if available for better performance"),
  }).describe("Read the content of a specific file from the repository"),

  getGraph: z.object({
    useCache: booleanSchema.describe("Use cached graph data if available for better performance"),
  }).describe("Get the project dependency graph showing relationships between files and components"),

  // URL Methods
  getR2Url: z.object({
    path: z.string().optional().default("").describe("File path within the repository (optional, defaults to root)"),
  }).describe("Generate R2 storage URL for accessing repository files with automatic revision resolution"),

  getR2ProjectUrl: z.object({
    path: z.string().optional().default("").describe("File path within the project folder (optional, defaults to root)"),
  }).describe("Generate project-specific R2 URL for accessing project-level resources"),

  getR2SharedFolderUrl: z.object({
    path: z.string().optional().default("").describe("File path within the shared folder (optional, defaults to root)"),
  }).describe("Generate R2 URL for shared folder resources accessible across projects"),

  getR2RevUrl: z.object({
    path: z.string().optional().default("").describe("File path within the repository (optional, defaults to root)"),
  }).describe("Generate revision-specific R2 URL for accessing repository files (alias for getR2Url)"),

  createViteProxy: z.object({
    folder: z.string().optional().default("_repo").describe("Repository folder name for Vite proxy configuration"),
  }).describe("Create Vite development server proxy configuration for local development"),

  getSqliteUrl: z.object({
    useCache: booleanSchema.describe("Use cached URL if available for better performance"),
  }).describe("Get URL for the SQLite database containing repository metadata and search indices"),

  // API Methods
  fetchPublicApi: z.object({
    path: z.string().optional().default("/").describe("API endpoint path to fetch from (defaults to root)"),
  }).describe("Fetch data from public API endpoints with automatic error handling and retries"),

  fetchProjectDetails: z.object({
    useCache: booleanSchema.describe("Use cached project details if available for better performance"),
  }).describe("Get detailed project information including metadata, configuration, and settings"),

  fetchR2Json: z.object({
    path: stringSchema.refine((val) => val.length > 0, {
      message: "Path is required for fetchR2Json operation",
    }).describe("File path in R2 storage to fetch JSON data from"),
    opts: z.record(z.any()).optional().default({}).describe("Additional fetch options like caching, headers, and timeouts"),
  }).describe("Fetch JSON data from R2 storage with automatic revision resolution and error handling"),

  fetchJson: z.object({
    url: z.string().refine((val) => val.length > 0, {
      message: "URL is required for fetchJson operation",
    }).describe("Complete URL to fetch JSON data from"),
    opts: z.record(z.any()).optional().default({}).describe("Additional fetch options like headers, timeout, and caching"),
  }).describe("Fetch JSON data from any URL with error handling and optional caching"),

  getActiveProjectRev: z.object({
    forceRefresh: z.boolean().optional().default(false).describe("Force refresh from API even if cached revision exists"),
    skipDetails: z.boolean().optional().default(false).describe("Skip fetching detailed project information for faster response"),
  }).describe("Get the active revision ID for the project with optional caching and detail control"),

  fetchProjectActiveRev: z.object({
    forceRefresh: z.boolean().optional().default(false).describe("Force refresh from API even if cached revision exists"),
  }).describe("Fetch the current active revision ID for the project from the API"),

  handleOpenAiRequest: z.object({
    request: z.object({}).refine((val) => typeof val === "object", {
      message: "Request object is required for handleOpenAiRequest operation",
    }).describe("OpenAI API request object containing function calls and context"),
    options: z.record(z.any()).optional().default({}).describe("Additional options for OpenAI request processing"),
  }).describe("Process OpenAI function calling requests with RepoMD context and tools"),

  createOpenAiToolHandler: z.object({
    options: z.record(z.any()).optional().default({}).describe("Configuration options for the OpenAI tool handler"),
  }).describe("Create a handler for OpenAI function calling that provides access to RepoMD methods"),

  // Utility Methods
  getClientStats: z.object({}).describe("Get performance statistics and usage metrics for the RepoMD client instance"),

  sortPostsByDate: z.object({
    posts: z.array(z.any()).min(1, "Posts array cannot be empty").describe("Array of post objects to sort by date"),
  }).describe("Sort an array of posts by their publication date (newest first)"),

  // Project Methods
  getReleaseInfo: z.object({
    useCache: booleanSchema.describe("Use cached release information if available for better performance"),
  }).describe("Get release information and version details for the current project"),

  getProjectMetadata: z.object({
    useCache: booleanSchema.describe("Use cached project metadata if available for better performance"),
  }).describe("Get comprehensive project metadata including configuration, settings, and build information"),

  ensureLatestRev: z.object({}).describe("Ensure the latest revision is resolved and cached for subsequent operations"),

  // Instance Management Methods
  destroy: z.object({}).describe("Clean up RepoMD instance resources, clear caches, and abort pending operations"),

  // Method Aliases
  getPostsBySlug: z.object({
    slug: stringSchema.refine((val) => val.length > 0, {
      message: "Slug is required for getPostsBySlug operation",
    }).describe("URL-friendly slug identifier for the post to retrieve"),
  }).describe("Get a blog post by its slug (alias for getPostBySlug for backward compatibility)"),

  getSourceFiles: z.object({
    useCache: booleanSchema.describe("Use cached file list if available for better performance"),
  }).describe("Get list of source files in the repository (alias for getSourceFilesList)"),

  getOpenAiToolSpec: z.object({
    blacklistedTools: z.array(z.string()).optional().default([]).describe("Array of function names to exclude from the tool specification"),
  }).describe("Get OpenAI tool specification with optional filtering for project-specific configurations"),
};

// Helper function to get the schema for a given function name
export function getSchemaForFunction(functionName) {
  return schemas[functionName];
}
