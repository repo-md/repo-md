/**
 * RepoMD - A client for interacting with the repo.md API with modular architecture
 */

import { LOG_PREFIXES } from "./logger.js";
import { fetchJson } from "./utils.js";

// Import modular components
import { createUrlGenerator } from "./core/urls.js";
import { createApiClient } from "./core/api.js";
import cache from "./core/cache.js";
import { createPostRetrieval } from "./posts/retrieval.js";
import { createPostSimilarity } from "./posts/similarity.js";
import { createMediaHandler } from "./media/handler.js";
import { createProjectConfig } from "./project/config.js";
import { createFileHandler } from "./files/index.js";

// Import OpenAI utilities
import {
  createOpenAiToolHandler,
  handleOpenAiRequest,
} from "./openai/OpenAiToolHandler.js";

// Import exported logo and tool specs
import { OpenAiToolSpec, toolSpecs } from "./openai/OpenAiToolSpec.js";

const prefix = LOG_PREFIXES.REPO_MD;

class RepoMD {
  constructor({
    org = "iplanwebsites",
    orgSlug = "iplanwebsites",
    orgId = null,
    projectId = "680e97604a0559a192640d2c",
    projectSlug = "undefined-project-slug",
    rev = "latest", // Default to "latest"
    secret = null,
    debug = false,
    strategy = "auto", // auto, browser, server
  } = {}) {
    // Store configuration
    this.org = org;
    this.projectId = projectId;
    this.projectSlug = projectSlug;
    this.orgSlug = orgSlug;
    this.orgId = orgId;
    this.rev = rev;
    this.debug = debug;
    this.secret = secret;
    this.strategy = strategy;
    this.activeRev = null; // Store resolved latest revision ID

    // Configure cache for this instance
    cache.configure("posts", { maxSize: 1000 }, debug);
    cache.configure("similarity", { maxSize: 500 }, debug);
    cache.configure("media", { maxSize: 200 }, debug);

    // Create resolver function for the URL generator
    const resolveLatestRev = async () => {
      try {
        // Try to use the faster /rev endpoint directly
        const resolvedRev = await this.api.fetchProjectActiveRev();

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
      orgSlug,
      projectId,
      activeRev: this.activeRev,
      rev,
      resolveLatestRev,
      debug,
    });

    // Initialize API client
    this.api = createApiClient({
      orgSlug,
      projectId,
      projectSlug,
      debug,
    });

    // If we're using "latest" revision, try to eagerly resolve it to avoid issues with lazy loading
    if (rev === "latest" && !this.activeRev) {
      // This is non-blocking - we don't await it but start the process early
      this.api
        .fetchProjectActiveRev()
        .then((resolvedRev) => {
          this.activeRev = resolvedRev;

          // Update URL generator with the resolved activeRev
          this.urls = createUrlGenerator({
            orgSlug: this.orgSlug,
            projectId: this.projectId,
            activeRev: this.activeRev,
            rev: this.rev,
            resolveLatestRev,
            debug: this.debug,
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

    if (this.debug) {
      console.log(`${prefix} 🚀 Initialized with:
        - org: ${org}
        - projectId: ${projectId}
        - rev: ${rev}
        - strategy: ${strategy}
      `);
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
          orgSlug: this.orgSlug,
          projectId: this.projectId,
          activeRev: this.activeRev,
          rev: this.rev,
          resolveLatestRev,
          debug: this.debug,
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
      fetchR2Json: this.fetchR2Json,
      _fetchMapData: this._fetchMapData,
      debug: this.debug,
    });

    // Initialize post similarity service
    this.similarity = createPostSimilarity({
      fetchR2Json: this.fetchR2Json,
      _fetchMapData: this._fetchMapData,
      getRecentPosts: this.posts.getRecentPosts,
      getPostBySlug: this.posts.getPostBySlug,
      augmentPostsByProperty: this.posts.augmentPostsByProperty,
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
  }

  // URL generation methods (proxy to URL module)
  async getR2Url(path = "") {
    return await this.urls.getRevisionUrl(path);
  }

  getR2ProjectUrl(path = "") {
    return this.urls.getProjectUrl(path);
  }

  async getR2RevUrl(path = "") {
    return await this.urls.getRevisionUrl(path);
  }

  createViteProxy(folder = "_repo") {
    return this.urls.createViteProxy(this.orgSlug, this.projectId, folder);
  }

  // API methods (proxy to API module)
  async fetchPublicApi(path = "/") {
    return await this.api.fetchPublicApi(path);
  }

  async fetchProjectDetails() {
    return await this.api.fetchProjectDetails();
  }

  async getActiveProjectRev() {
    return await this.api.getActiveProjectRev();
  }

  // SQLite URL method
  async getSqliteURL() {
    return await this.urls.getSqliteUrl();
  }

  // Media methods (proxy to Media module)
  async getR2MediaUrl(path) {
    return await this.media.getMediaUrl(path);
  }

  async getAllMedias(useCache = true) {
    return await this.media.getAllMedias(useCache);
  }

  async getAllMedia(useCache = true) {
    return await this.media.getAllMedia(useCache);
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

  async getPostById(id) {
    return await this.posts.getPostById(id);
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

  async augmentPostsByProperty(keys, property, options = {}) {
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

  destroy(request) {
    /// todo
  }
}

// Export the logo
export const logo = `
▄▖            ▌
▙▘█▌▛▌▛▌  ▛▛▌▛▌
▌▌▙▖▙▌▙▌▗ ▌▌▌▙▌
    ▌          `;

// Export RepoMD class and OpenAI related tools
export { RepoMD, OpenAiToolSpec, toolSpecs };
