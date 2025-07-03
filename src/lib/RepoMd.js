/**
 * RepoMD - A client for interacting with the repo.md API with modular architecture
 */

import { LOG_PREFIXES } from "./logger.js";
import { fetchJson } from "./utils.js";
import envizion from "envizion";
import { getVersionInfo } from "./version.js";

// Import modular components
import { createUrlGenerator } from "./core/urls.js";
import { createApiClient } from "./core/api.js";
import cache from "./core/cache.js";
import { createPostRetrieval } from "./posts/retrieval.js";
import { createPostSimilarity } from "./posts/similarity.js";
import { createPostSearch } from "./posts/search.js";
import { createMediaHandler } from "./media/handler.js";
import { createProjectConfig } from "./project/config.js";
import { createFileHandler } from "./files/index.js";
import { createMediaSimilarity } from "./media/similarity.js";

// Import OpenAI utilities
import {
  createOpenAiToolHandler,
  handleOpenAiRequest,
} from "./openai/OpenAiToolHandler.js";

// Import exported logo and tool specs
import { createOpenAiSpecs } from "./openai/OpenAiToolSpec.js";

// Import alias mechanism, validation and logging
import { applyAliases } from "./aliases.js";
import {
  applyValidation,
  repoMdOptionsSchema,
  getMethodDescription,
  getAllMethodDescriptions,
  getMethodsByCategory,
} from "./schemas/index.js";
import { applyLogging } from "./core/logger-wrapper.js";

// Import Next.js middleware support
import { RepoNextMiddleware, createRepoMiddleware } from "./middleware/RepoNextMiddleware.js";

// Import unified proxy configuration
import { UnifiedProxyConfig } from "./proxy/UnifiedProxyConfig.js";

const prefix = LOG_PREFIXES.REPO_MD;

class RepoMD {
  constructor({
    projectId,
    projectSlug = "undefined-project-slug",
    rev = "latest", // Default to "latest"
    secret = null,
    debug = false,
    strategy = "auto", // auto, browser, server
    revCacheExpirySeconds = 300, // 5 minutes default
    debug_rev_caching = false,
  } = {}) {
    // Try to get project ID from environment if not provided
    if (!projectId) {
      projectId = this._getProjectIdFromEnv();
    }
    // Store configuration
    this.projectId = projectId;
    this.projectSlug = projectSlug;
    this.rev = rev;
    this.debug = debug;
    this.secret = secret;
    this.strategy = strategy;
    this.revCacheExpirySeconds = revCacheExpirySeconds;
    this.debug_rev_caching = debug_rev_caching;
    this.activeRev = null; // Store resolved latest revision ID

    // Initialize stats tracking
    this.stats = {
      posts: {
        totalLoaded: 0,
        byMethod: {
          memoryCache: 0,
          directHashFile: 0,
          directSlugFile: 0,
          pathMap: 0,
          directPath: 0,
          allPosts: 0,
        },
        individualLoads: 0,
        allPostsLoaded: false,
        lastUpdated: Date.now(),
      },
      revisionCache: {
        type: this.rev === "latest" ? "latest" : "specific",
        expirySeconds: this.revCacheExpirySeconds,
        debugEnabled: this.debug_rev_caching,
        currentRevision: this.activeRev,
        lastUpdated: Date.now(),
      },
    };

    // Configure cache for this instance
    cache.configure("posts", { maxSize: 1000 }, debug);
    cache.configure("similarity", { maxSize: 500 }, debug);
    cache.configure("media", { maxSize: 200 }, debug);

    // Create resolver function for the URL generator
    const resolveLatestRev = async () => {
      try {
        // Use getActiveProjectRev which has built-in promise caching
        const resolvedRev = await this.api.getActiveProjectRev();

        // Update our cached activeRev
        this.activeRev = resolvedRev;

        if (this.debug) {
          console.log(
            `${prefix} ✅ Resolved latest revision: ${resolvedRev} via resolver function`
          );
        }

        return resolvedRev;
      } catch (error) {
        if (this.debug) {
          console.warn(
            `${prefix} ⚠️ Failed to resolve latest rev during URL generation: ${error.message}`
          );
        }
        throw error;
      }
    };

    // Initialize URL generator with the resolver function
    this.urls = createUrlGenerator({
      projectId,
      activeRev: this.activeRev,
      rev,
      resolveLatestRev,
      debug,
      revCacheExpirySeconds: this.revCacheExpirySeconds,
      debug_rev_caching: this.debug_rev_caching,
    });

    // Initialize API client
    this.api = createApiClient({
      projectId,
      projectSlug,
      debug,
    });

    // If we're using "latest" revision, try to eagerly resolve it to avoid issues with lazy loading
    if (rev === "latest" && !this.activeRev) {
      // This is non-blocking - we don't await it but start the process early
      this.api
        .getActiveProjectRev()
        .then((resolvedRev) => {
          this.activeRev = resolvedRev;

          // Update URL generator with the resolved activeRev
          this.urls = createUrlGenerator({
            projectId: this.projectId,
            activeRev: this.activeRev,
            rev: this.rev,
            resolveLatestRev,
            debug: this.debug,
            revCacheExpirySeconds: this.revCacheExpirySeconds,
            debug_rev_caching: this.debug_rev_caching,
          });

          if (this.debug) {
            console.log(
              `${prefix} 🚀 Eagerly resolved 'latest' to revision: ${this.activeRev}`
            );
          }
        })
        .catch((error) => {
          if (this.debug) {
            console.warn(
              `${prefix} ⚠️ Eager resolution failed, will resolve lazily: ${error.message}`
            );
          }
        });
    }

    // Create bind functions for passing to other modules
    this.fetchJson = this.fetchJson.bind(this);
    this.fetchR2Json = this.fetchR2Json.bind(this);
    this.ensureLatestRev = this.ensureLatestRev.bind(this);
    this._fetchMapData = this._fetchMapData.bind(this);

    // Initialize other services after bind functions are available
    this.initializeServices();

    // Generate instance ID
    this._instanceId = Math.random().toString(36).substring(2, 10);

    if (this.debug) {
      console.log(`${prefix} 🚀 Initialized RepoMD instance with:
        - projectId: ${projectId}
        - rev: ${rev}
        - strategy: ${strategy}
        - instance: ${this._instanceId}
      `);
    }

    // Display version and build information using envizion (browser only)
    if (typeof window !== "undefined") {
      const { version, buildDate } = getVersionInfo();
      envizion({
        title: "Repo.md client",
        subtitle: "Build apps and websites using markdown", // `${strategy === "browser" ? "Browser" : "Auto"} Mode`,
        version,
        buildDate,
      });
    }
  }

  // Helper function to fetch JSON with error handling and caching
  async fetchJson(url, opts = {}) {
    return await fetchJson(url, opts, this.debug);
  }

  // Ensure latest revision is resolved before making R2 calls
  async ensureLatestRev() {
    try {
      if (this.rev === "latest" && !this.activeRev) {
        if (this.debug) {
          console.log(
            `${prefix} 🔄 Resolving latest revision for project ${
              this.projectId || this.projectSlug
            }`
          );
        }

        // Use the API's ensureLatestRev helper which handles cached revisions
        // and will use the faster /rev endpoint through fetchProjectActiveRev
        const latestId = await this.api.ensureLatestRev(
          this.rev,
          this.activeRev
        );

        if (!latestId) {
          throw new Error(
            `Could not determine latest revision ID for project ${
              this.projectId || this.projectSlug
            }`
          );
        }

        this.activeRev = latestId;

        // Recreate the resolver function
        const resolveLatestRev = async () => {
          try {
            // Try to use the faster /rev endpoint directly
            const resolvedRev = await this.api.fetchProjectActiveRev();

            // Update our cached activeRev
            this.activeRev = resolvedRev;

            return resolvedRev;
          } catch (error) {
            if (this.debug) {
              console.warn(
                `${prefix} ⚠️ Failed to resolve latest rev during URL generation: ${error.message}`
              );
            }
            throw error;
          }
        };

        // Update URL generator with the resolved activeRev
        this.urls = createUrlGenerator({
          projectId: this.projectId,
          activeRev: this.activeRev,
          rev: this.rev,
          resolveLatestRev,
          debug: this.debug,
          revCacheExpirySeconds: this.revCacheExpirySeconds,
          debug_rev_caching: this.debug_rev_caching,
        });

        if (this.debug) {
          console.log(
            `${prefix} ✅ Resolved 'latest' to revision: ${this.activeRev}`
          );
        }
      }
    } catch (error) {
      const errorMessage = `Failed to resolve latest revision: ${error.message}`;
      if (this.debug) {
        console.error(`${prefix} ❌ ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }
  }

  // Fetch a JSON file from R2 storage
  async fetchR2Json(path, opts = {}) {
    // Get the URL, which will resolve revision if needed
    const url = await this.urls.getRevisionUrl(path);
    return await this.fetchJson(url, opts);
  }

  // Helper function to safely fetch map data
  async _fetchMapData(mapPath, defaultValue = {}) {
    try {
      return await this.fetchR2Json(mapPath, {
        defaultValue,
        useCache: true,
      });
    } catch (error) {
      if (this.debug) {
        console.error(
          `${prefix} ❌ Error fetching map data ${mapPath}:`,
          error
        );
      }
      return defaultValue;
    }
  }

  // Initialize all service modules
  initializeServices() {
    // Initialize post retrieval service
    this.posts = createPostRetrieval({
      getRevisionUrl: this.urls.getRevisionUrl,
      getProjectUrl: this.urls.getProjectUrl,
      getSharedFolderUrl: this.urls.getSharedFolderUrl,
      fetchR2Json: this.fetchR2Json,
      fetchJson: this.fetchJson,
      _fetchMapData: this._fetchMapData,
      stats: this.stats,
      debug: this.debug,
    });

    // Initialize post similarity service
    this.similarity = createPostSimilarity({
      fetchR2Json: this.fetchR2Json.bind(this),
      _fetchMapData: this._fetchMapData.bind(this),
      getRecentPosts: this.getRecentPosts.bind(this),
      getPostBySlug: this.getPostBySlug.bind(this),
      augmentPostsByProperty: this._augmentPostsByProperty.bind(this),
      debug: this.debug,
    });

    // Initialize post search service
    this.search = createPostSearch({
      getAllPosts: this.getAllPosts.bind(this),
      getPostsEmbeddings: this.getPostsEmbeddings.bind(this),
      getAllMedia: this.getAllMedia.bind(this),
      getMediaEmbeddings: this.getMediaEmbeddings.bind(this),
      debug: this.debug,
    });

    // Initialize media handling service
    this.media = createMediaHandler({
      fetchR2Json: this.fetchR2Json,
      getProjectUrl: this.urls.getProjectUrl,
      getRevisionUrl: this.urls.getRevisionUrl,
      debug: this.debug,
    });

    // Initialize project configuration service
    this.project = createProjectConfig({
      fetchProjectDetails: this.api.fetchProjectDetails,
      debug: this.debug,
    });

    // Initialize file handling service
    this.files = createFileHandler({
      fetchR2Json: this.fetchR2Json,
      debug: this.debug,
    });

    // Initialize media similarity service
    this.mediaSimilarity = createMediaSimilarity({
      fetchR2Json: this.fetchR2Json.bind(this),
      _fetchMapData: this._fetchMapData.bind(this),
      getAllMedia: this.getAllMedia.bind(this),
      debug: this.debug,
    });

    // Apply any configured method aliases to this instance
    applyAliases(this, this.debug);

    // Apply parameter validation to methods
    applyValidation(this);

    // Apply method logging
    applyLogging(this, this.debug);

    if (this.debug) {
      console.log(`${prefix} ✓ Applied parameter validation to methods`);
      console.log(`${prefix} ✓ Applied method logging to API methods`);
    }
  }

  // URL generation methods (proxy to URL module)
  async getR2Url(path = "") {
    return await this.urls.getRevisionUrl(path);
  }

  getR2ProjectUrl(path = "") {
    return this.urls.getProjectUrl(path);
  }

  getR2SharedFolderUrl(path = "") {
    return this.urls.getSharedFolderUrl(path);
  }

  async getR2RevUrl(path = "") {
    return await this.urls.getRevisionUrl(path);
  }

  createViteProxy(folder = "_repo") {
    // For backward compatibility, still support the folder parameter
    const config = this.getUnifiedProxyConfig({
      mediaUrlPrefix: `/${folder}/medias/`,
    });
    return config.toViteConfig();
  }

  // API methods (proxy to API module)
  async fetchPublicApi(path = "/") {
    return await this.api.fetchPublicApi(path);
  }

  async fetchProjectDetails() {
    return await this.api.fetchProjectDetails();
  }

  async fetchProjectActiveRev() {
    return await this.api.fetchProjectActiveRev();
  }

  async getActiveProjectRev() {
    return await this.api.getActiveProjectRev();
  }

  // SQLite URL method
  async getSqliteUrl() {
    return await this.urls.getSqliteUrl();
  }

  // Client stats method
  getClientStats() {
    // Update timestamp
    this.stats.posts.lastUpdated = Date.now();
    this.stats.revisionCache.lastUpdated = Date.now();

    // Update current revision info
    this.stats.revisionCache.currentRevision = this.activeRev;

    // Get detailed revision cache state from URL generator if available
    if (this.urls && typeof this.urls.getRevisionCacheStats === "function") {
      const cacheStats = this.urls.getRevisionCacheStats();
      this.stats.revisionCache = {
        ...this.stats.revisionCache,
        currentRevision: cacheStats.activeRevState || this.activeRev,
        cacheValue: cacheStats.cacheValue,
        cacheTimestamp: cacheStats.cacheTimestamp,
        isExpired: cacheStats.isExpired,
        msUntilExpiry: cacheStats.msUntilExpiry,
        expiryMs: cacheStats.expiryMs,
        revisionType: cacheStats.revisionType,
      };
    }

    // Return a copy of the stats object to prevent direct modification
    return JSON.parse(JSON.stringify(this.stats));
  }

  // Media methods (proxy to Media module)
  async getR2MediaUrl(path) {
    return await this.media.getMediaUrl(path);
  }

  async getAllMedia(useCache = true) {
    return await this.media.getAllMedia(useCache);
  }

  async getAllMedias(useCache = true) {
    if (this.debug) {
      console.warn(
        `${prefix} ⚠️ Deprecated: 'getAllMedias' is an alias of 'getAllMedia', it might be removed in a future version.`
      );
    }
    return await this.media.getAllMedias(useCache);
  }

  async getMediaItems(useCache = true) {
    return await this.media.getMediaItems(useCache);
  }

  async handleCloudflareRequest(request) {
    return await this.media.handleCloudflareRequest(request);
  }

  // Post retrieval methods (proxy to Posts module)
  async getAllPosts(useCache = true, forceRefresh = false) {
    return await this.posts.getAllPosts(useCache, forceRefresh);
  }

  async getPostBySlug(slug) {
    return await this.posts.getPostBySlug(slug);
  }

  async getPostByHash(hash) {
    return await this.posts.getPostByHash(hash);
  }

  async getPostByPath(path) {
    return await this.posts.getPostByPath(path);
  }

  async _augmentPostsByProperty(keys, property, options = {}) {
    return await this.posts.augmentPostsByProperty(keys, property, options);
  }

  sortPostsByDate(posts) {
    return this.posts.sortPostsByDate(posts);
  }

  async getRecentPosts(count = 3) {
    return await this.posts.getRecentPosts(count);
  }

  _findPostByProperty(posts, property, value) {
    return this.posts._findPostByProperty(posts, property, value);
  }

  // Post similarity methods (proxy to Similarity module)
  async getPostsEmbeddings() {
    return await this.similarity.getPostsEmbeddings();
  }

  async getPostsSimilarity() {
    return await this.similarity.getPostsSimilarity();
  }

  async getPostsSimilarityByHashes(hash1, hash2) {
    return await this.similarity.getPostsSimilarityByHashes(hash1, hash2);
  }

  async getTopSimilarPostsHashes() {
    return await this.similarity.getTopSimilarPostsHashes();
  }

  async getSimilarPostsHashByHash(hash, limit = 10) {
    return await this.similarity.getSimilarPostsHashByHash(hash, limit);
  }

  async getSimilarPostsByHash(hash, count = 5, options = {}) {
    return await this.similarity.getSimilarPostsByHash(hash, count, options);
  }

  async getSimilarPostsSlugBySlug(slug, limit = 10) {
    return await this.similarity.getSimilarPostsSlugBySlug(slug, limit);
  }

  async getSimilarPostsBySlug(slug, count = 5, options = {}) {
    return await this.similarity.getSimilarPostsBySlug(slug, count, options);
  }

  // Post search methods (proxy to Search module)
  async searchPosts(text, props = {}, mode = "memory") {
    return await this.search.searchPosts({ text, props, mode });
  }

  async searchAutocomplete(term, limit = 10) {
    return await this.search.searchAutocomplete(term, limit);
  }

  async refreshSearchIndex() {
    return await this.search.refreshMemoryIndex();
  }

  // Vector search methods - new public API
  async findPostsByText(text, options = {}) {
    const { limit = 20, threshold = 0.1, useClip = false } = options;
    const mode = useClip ? "vector-clip-text" : "vector-text";

    const results = await this.search.searchPosts({
      text,
      props: { limit, threshold },
      mode,
    });

    // Return only posts, filter out media results
    return results
      .filter((result) => result.type === "post" || result.post)
      .map((result) => ({
        ...result,
        content: result.post || result.content,
      }));
  }

  async findImagesByText(text, options = {}) {
    const { limit = 20, threshold = 0.1 } = options;

    const results = await this.search.searchPosts({
      text,
      props: { limit, threshold },
      mode: "vector-clip-text",
    });

    // Return only media results
    return results
      .filter((result) => result.type === "media" || result.media)
      .map((result) => ({
        ...result,
        content: result.media || result.content,
      }));
  }

  async findImagesByImage(image, options = {}) {
    const { limit = 20, threshold = 0.1 } = options;

    const results = await this.search.searchPosts({
      image,
      props: { limit, threshold },
      mode: "vector-clip-image",
    });

    // Return only media results
    return results
      .filter((result) => result.type === "media" || result.media)
      .map((result) => ({
        ...result,
        content: result.media || result.content,
      }));
  }

  async findSimilarContent(query, options = {}) {
    const { limit = 20, threshold = 0.1, type = "auto" } = options;

    // Determine search mode and params based on query type and options
    let mode;
    const searchParams = { props: { limit, threshold } };

    if (typeof query === "string") {
      if (query.startsWith("http") || query.startsWith("data:")) {
        // Looks like an image URL or data URI
        mode = "vector-clip-image";
        searchParams.image = query;
      } else {
        // Text query
        mode = type === "clip" ? "vector-clip-text" : "vector-text";
        searchParams.text = query;
      }
    } else {
      throw new Error("Query must be a string (text or image URL/data)");
    }

    searchParams.mode = mode;

    const results = await this.search.searchPosts(searchParams);

    // Return all results with enhanced metadata
    return results.map((result) => ({
      ...result,
      content: result.post || result.media || result.content,
      contentType: result.type || (result.post ? "post" : "media"),
    }));
  }

  // Project configuration methods (proxy to Project module)
  async getReleaseInfo() {
    return await this.project.getReleaseInfo(this.projectId);
  }

  async getProjectMetadata() {
    return await this.project.getProjectMetadata();
  }

  // File handling methods (proxy to Files module)
  async getSourceFilesList(useCache = true) {
    return await this.files.getSourceFilesList(useCache);
  }

  async getDistFilesList(useCache = true) {
    return await this.files.getDistFilesList(useCache);
  }

  async getGraph(useCache = true) {
    return await this.files.getGraph(useCache);
  }

  async getFileContent(path, useCache = true) {
    return await this.files.getFileContent(path, useCache);
  }

  // OpenAI integrations
  createOpenAiToolHandler() {
    return createOpenAiToolHandler(this);
  }

  handleOpenAiRequest(request) {
    return handleOpenAiRequest(request, this);
  }

  getOpenAiToolSpec(options = {}) {
    const { blacklistedTools = [], ...otherOptions } = options;

    // Generate the base spec
    const baseSpec = createOpenAiSpecs();

    // Apply project-specific configurations
    if (blacklistedTools.length > 0) {
      const filteredFunctions = baseSpec.functions.filter(
        (func) => !blacklistedTools.includes(func.name)
      );

      if (
        this.debug &&
        filteredFunctions.length !== baseSpec.functions.length
      ) {
        console.log(
          `${prefix} 🚫 Filtered out ${
            baseSpec.functions.length - filteredFunctions.length
          } blacklisted tools: ${blacklistedTools.join(", ")}`
        );
      }

      return {
        ...baseSpec,
        functions: filteredFunctions,
      };
    }

    return baseSpec;
  }

  // Media similarity methods (proxy to MediaSimilarity module)
  async getMediaEmbeddings() {
    return await this.mediaSimilarity.getMediaEmbeddings();
  }

  async getMediaSimilarity() {
    return await this.mediaSimilarity.getMediaSimilarity();
  }

  async getMediaSimilarityByHashes(hash1, hash2) {
    return await this.mediaSimilarity.getMediaSimilarityByHashes(hash1, hash2);
  }

  async getTopSimilarMediaHashes() {
    return await this.mediaSimilarity.getTopSimilarMediaHashes();
  }

  async getSimilarMediaHashByHash(hash, limit = 10) {
    return await this.mediaSimilarity.getSimilarMediaHashByHash(hash, limit);
  }

  async getSimilarMediaByHash(hash, count = 5) {
    return await this.mediaSimilarity.getSimilarMediaByHash(hash, count);
  }

  // AI Inference methods (using inference module)
  async computeTextEmbedding(text, instruction = null) {
    const { computeTextEmbedding } = await import("./inference.js");
    return await computeTextEmbedding(text, instruction, this.debug);
  }

  async computeClipTextEmbedding(text) {
    const { computeClipTextEmbedding } = await import("./inference.js");
    return await computeClipTextEmbedding(text, this.debug);
  }

  async computeClipImageEmbedding(image) {
    const { computeClipImageEmbedding } = await import("./inference.js");
    return await computeClipImageEmbedding(image, this.debug);
  }

  // Unified proxy configuration
  /**
   * Get a unified proxy configuration for any framework
   * @param {Object} options - Configuration options
   * @param {string} [options.mediaUrlPrefix] - URL prefix for media requests
   * @param {string} [options.r2Url] - CDN URL
   * @param {number} [options.cacheMaxAge] - Cache max age in seconds
   * @param {boolean} [options.debug] - Enable debug logging
   * @returns {UnifiedProxyConfig} Unified proxy configuration instance
   */
  getUnifiedProxyConfig(options = {}) {
    return new UnifiedProxyConfig({
      projectId: this.projectId,
      mediaUrlPrefix: options.mediaUrlPrefix,
      r2Url: options.r2Url,
      cacheMaxAge: options.cacheMaxAge,
      debug: options.debug ?? this.debug,
    });
  }

  // Next.js middleware integration
  /**
   * Create a Next.js middleware handler for this RepoMD instance
   * @param {Object} options - Middleware configuration options
   * @param {string} [options.mediaUrlPrefix] - URL prefix for media requests
   * @param {boolean} [options.debug] - Enable debug logging
   * @returns {Function} Next.js middleware handler
   */
  createNextMiddleware(options = {}) {
    // Use the unified proxy configuration
    const config = this.getUnifiedProxyConfig(options);
    return createRepoMiddleware({
      projectId: this.projectId,
      mediaUrlPrefix: config.mediaUrlPrefix,
      r2Url: config.r2Url,
      debug: config.debug,
    });
  }

  /**
   * Get the Next.js middleware configuration
   * @param {string} [matcher] - Custom matcher pattern
   * @returns {Object} Next.js middleware config object
   */
  static getNextMiddlewareConfig(matcher) {
    return {
      matcher: RepoNextMiddleware.getMatcher(matcher),
    };
  }

  // Method documentation methods
  static getMethodDescription(methodName) {
    return getMethodDescription(methodName);
  }

  static getAllMethodDescriptions() {
    return getAllMethodDescriptions();
  }

  static getMethodsByCategory(category) {
    return getMethodsByCategory(category);
  }

  static getAllMethodCategories() {
    const allMethods = getAllMethodDescriptions();
    return [...new Set(Object.values(allMethods).map((m) => m.category))];
  }

  getMethodDescription(methodName) {
    return this.constructor.getMethodDescription(methodName);
  }

  /**
   * Get project ID from environment variables
   * @private
   * @returns {string|null} The project ID or null if not found
   */
  _getProjectIdFromEnv() {
    // Check if we're in a browser environment
    if (typeof process === 'undefined' || !process.env) {
      return null;
    }

    // Try multiple common environment variable names
    const envVars = {
      'REPO_MD_PROJECT_ID': process.env.REPO_MD_PROJECT_ID,
      'REPOMD_PROJECT_ID': process.env.REPOMD_PROJECT_ID,
      'NEXT_PUBLIC_REPO_MD_PROJECT_ID': process.env.NEXT_PUBLIC_REPO_MD_PROJECT_ID,
      'VITE_REPO_MD_PROJECT_ID': process.env.VITE_REPO_MD_PROJECT_ID,
      'REACT_APP_REPO_MD_PROJECT_ID': process.env.REACT_APP_REPO_MD_PROJECT_ID,
    };
    
    // Find the first defined env var
    const envProjectId = Object.values(envVars).find(val => val);
    
    if (!envProjectId) {
      const envVarsList = Object.keys(envVars).map(key => `  ${key}=your-project-id`).join('\n');
      
      throw new Error(
        `\n🚨 RepoMD Project ID Missing!\n\n` +
        `The REPO_MD_PROJECT_ID environment variable needs to be configured, or passed directly to the RepoMD constructor.\n\n` +
        `Option 1: Set an environment variable (recommended):\n${envVarsList}\n\n` +
        `Option 2: Pass it directly to the constructor:\n` +
        `  new RepoMD({ projectId: 'your-project-id' })\n\n` +
        `Learn more: https://docs.repo.md/configuration`
      );
    }
    
    return envProjectId;
  }

  destroy() {
    if (this.debug) {
      console.log(
        `${prefix} 🧹 Cleaning up RepoMD instance resources (instance: ${
          this._instanceId || "unknown"
        })`
      );
    }

    // Clear all cache for this instance
    cache.clear("posts");
    cache.clear("similarity");
    cache.clear("media");

    // Clear any references to services
    this.posts = null;
    this.similarity = null;
    this.search = null;
    this.media = null;
    this.project = null;
    this.files = null;

    // Clean up API client timers and resources
    if (this.api && typeof this.api.cleanup === "function") {
      this.api.cleanup();
    }

    // Clear URL generator and API client
    this.urls = null;
    this.api = null;

    // Clear any pending fetch operations if supported by platform
    if (typeof AbortController !== "undefined" && this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    // Flag as destroyed to prevent further use
    this._destroyed = true;
  }
}

// Export the logo
export const logo = `
▄▖            ▌
▙▘█▌▛▌▛▌  ▛▛▌▛▌
▌▌▙▖▙▌▙▌▗ ▌▌▌▙▌
    ▌          `;

// Export RepoMD class and OpenAI related tools
export { RepoMD, createOpenAiSpecs };

// Also export proxy configuration for direct use
export { UnifiedProxyConfig };
