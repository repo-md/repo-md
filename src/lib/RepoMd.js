/**
 * RepoMD - A client for interacting with the repo.md API with quick-lru cache
 */

import { handleCloudflareRequest as handleMediaRequest } from "./mediaProxy.js";
import { frameworkSnippets } from "./index.js";
import {
  createOpenAiToolHandler,
  handleOpenAiRequest,
} from "./openai/OpenAiToolHandler.js";
import { LOG_PREFIXES } from "./logger.js";

import { fetchJson } from "./utils.js";

const DEBUG = true;
const R2_DOMAIN = "https://r2.repo.md";
const prefix = LOG_PREFIXES.REPO_MD;

class RepoMD {
  constructor({
    org = "iplanwebsites",
    orgSlug = "iplanwebsites",
    orgId = null,
    project = "tbd",
    projectId = "680e97604a0559a192640d2c",
    projectSlug = "undefined-project-slug",
    rev = "latest", // Default to "latest"
    secret = null,
    debug = false,
    //maxCacheSize = 50,
    //cacheTTL = 300000, // 5 minutes
  } = {}) {
    this.org = org;
    this.project = project;
    this.projectId = projectId;
    this.projectSlug = projectSlug;
    this.orgSlug = orgSlug;
    this.orgId = orgId;
    this.rev = rev;
    this.debug = debug;
    this.secret = secret;
    this.activeRev = null; // Store resolved latest revision ID
    this.posts = null; // Cache for all posts

    // Resize cache if different settings are provided
    //if (maxCacheSize !== lru.maxSize) {
    //    lru.resize(maxCacheSize);
    //  }

    if (this.debug) {
      console.log(`${prefix} 🚀 Initialized with:
        - org: ${org}
        - project: ${project}
        - rev: ${rev} 
        `);
    }
  }

  // Get basic URL with given domain and path
  getR2Url(path = "") {
    return this.getR2RevUrl(path);
  }
  getR2ProjectUrl(path = "") {
    //    const url = `${R2_DOMAIN}/${this.orgSlug}/${this.projectId}/${resolvedRev}${path}`;
    const url = `${R2_DOMAIN}/${this.orgSlug}/${this.projectId}${path}`;
    if (this.debug) {
      console.log(`${prefix} 🔗 Generated URL: ${url}`);
    }
    return url;
  }
  getR2RevUrl(path = "") {
    const resolvedRev = this.rev === "latest" ? this.activeRev : this.rev;
    const url = this.getR2ProjectUrl("/" + resolvedRev + path);
    //  const url = `https://${domain}/${this.orgSlug}/${this.projectId}/${resolvedRev}${path}`;
    if (this.debug) {
      console.log(`${prefix} 🔗 Generated URL: ${url}`);
    }
    return url;
  }

  // Get base API URL for backend calls

  async fetchPublicApi(path = "/") {
    const domain = "api.repo.md";
    const url = `https://${domain}/v1${path}`;

    try {
      const result = await this.fetchJson(url, {
        errorMessage: "Error fetching public API route: " + path,
        useCache: true, // fetchJson already handles caching
        returnErrorObject: true, // Get structured error response
      });

      // Check if we got an error object back
      if (result && result.success === false) {
        throw new Error(result.error || `Failed to fetch data from ${url}`);
      }

      // If the result is null or undefined, it likely means there was an error
      if (result === null || result === undefined) {
        throw new Error(
          `Failed to fetch data from ${url} - please verify your project credentials`
        );
      }

      return result.data;
    } catch (error) {
      const errorMsg = `API Request Failed: ${error.message}`;

      if (this.debug) {
        console.error(`${prefix} ❌ ${errorMsg}`);
        console.error(`${prefix} 🔍 Failed URL: ${url}`);
      }

      // Provide a user-friendly message that includes project information
      const projectInfo = this.projectId
        ? `project ID: ${this.projectId}`
        : this.projectSlug
        ? `project slug: ${this.projectSlug}`
        : "unknown project";

      throw new Error(`Failed to access ${projectInfo}: ${error.message}`);
    }
  }

  // Fetch project configuration including latest release information
  async fetchProjectDetails() {
    let path;

    // Check if we have a valid projectId and use it preferentially
    if (this.projectId && this.projectId !== "undefined-project-id") {
      path = `/project-id/${this.projectId}`;
      if (this.debug) {
        console.log(`${prefix} 🔍 Using project ID path: ${path}`);
      }
    } else if (
      this.projectSlug &&
      this.projectSlug !== "undefined-project-slug"
    ) {
      path = `/orgs/${this.orgSlug}/projects/slug/${this.projectSlug}`;
      if (this.debug) {
        console.log(`${prefix} 🔍 Using project slug path: ${path}`);
      }
    } else {
      // If neither valid projectId nor projectSlug is available, throw an error
      throw new Error(
        "No valid projectId or projectSlug provided for fetching project details"
      );
    }

    // EX: https://api.repo.md/v1/orgs/iplanwebsites/projects/680e97604a0559a192640d2c
    // or: https://api.repo.md/v1/orgs/iplanwebsites/projects/slug/port1g
    const project = await this.fetchPublicApi(path);
    return project;
  }
  // Get the latest revision ID
  async getActiveProjectRev() {
    try {
      const projectDetails = await this.fetchProjectDetails();

      if (!projectDetails || typeof projectDetails !== "object") {
        throw new Error("Invalid project details response format");
      }

      const { activeRev } = projectDetails;

      if (!activeRev) {
        throw new Error(
          `No active revision found for project ${
            this.projectId || this.projectSlug
          }`
        );
      }

      return activeRev;
    } catch (error) {
      if (this.debug) {
        console.error(
          `${prefix} ❌ Error getting active project revision: ${error.message}`
        );
      }
      throw new Error(
        `Failed to get active project revision: ${error.message}`
      );
    }
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

        const latestId = await this.getActiveProjectRev();

        if (!latestId) {
          throw new Error(
            `Could not determine latest revision ID for project ${
              this.projectId || this.projectSlug
            }`
          );
        }

        this.activeRev = latestId;

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

  // Helper function to fetch JSON with error handling and caching
  async fetchJson(url, opts = {}) {
    return await fetchJson(url, opts, this.debug);
  }

  // Get URL for the SQLite database
  async getSqliteURL() {
    await this.ensureLatestRev();
    return this.getR2Url("/content.sqlite");
  }

  // Legacy support for older code
  async getR2MediaUrl(path) {
    // await this.ensureLatestRev(); // NO more need to resolve latest rev
    // const url = this.getR2Url(`/_medias/${path}`);
    // https://r2.repo.md/iplanwebsites/680e97604a0559a192640d2c/_shared/medias/9ad367214fab7207e61dbea46f32e9943d55b7e8cefb55e02f57e06f0db6dd0f-sm.jpeg
    const url = this.getR2ProjectUrl(`/_shared/medias/${path}`);
    return url; // Ensure we return the resolved string, not a Promise
  }

  // Fetch a JSON file from R2 storage
  async fetchR2Json(path, opts = {}) {
    await this.ensureLatestRev();
    const url = this.getR2Url(path);
    return await this.fetchJson(url, opts);
  }

  // Fetch all blog posts
  async getAllPosts(useCache = true, forceRefresh = false) {
    const startTime = performance.now();

    // Return cached posts if available and refresh not forced
    if (useCache && this.posts && !forceRefresh) {
      const duration = (performance.now() - startTime).toFixed(2);
      if (this.debug) {
        console.log(
          `${prefix} 💾 Using cached posts array (${this.posts.length} posts) in ${duration}ms`
        );
      }
      return this.posts;
    }

    // Fetch posts from R2
    const posts = await this.fetchR2Json("/posts.json", {
      defaultValue: [],
      useCache,
    });

    // Cache the posts for future use
    if (useCache) {
      this.posts = posts;
      const duration = (performance.now() - startTime).toFixed(2);
      if (this.debug) {
        console.log(
          `${prefix} 📄 Cached ${posts.length} posts in memory in ${duration}ms`
        );
      }
    }

    return posts;
  }

  // Helper to augment an array of keys with their corresponding posts
  async augmentPostsByProperty(keys, property, options = {}) {
    if (!keys || !keys.length) return [];

    const {
      loadIndividually = 3, // Threshold for switching to bulk loading
      count = keys.length, // How many posts to return
      useCache = true, // Whether to use cache
    } = options;

    // Slice to requested count
    const targetKeys = keys.slice(0, count);

    if (this.debug) {
      console.log(
        `[RepoMD] Augmenting ${targetKeys.length} posts by ${property}`
      );
    }

    // For small number of posts (<= loadIndividually), load individually
    if (targetKeys.length <= loadIndividually) {
      if (this.debug) {
        console.log(`[RepoMD] Loading ${targetKeys.length} posts individually`);
      }

      // Use the appropriate getter method based on property
      const getterMethod =
        property === "hash"
          ? this.getPostByHash.bind(this)
          : property === "slug"
          ? this.getPostBySlug.bind(this)
          : this.getPostById.bind(this);

      // Fetch all posts in parallel
      const posts = await Promise.all(
        targetKeys.map((key) => getterMethod(key))
      );

      return posts.filter(Boolean); // Filter out null values
    }

    // For larger sets, check if posts are already cached
    if (useCache && this.posts) {
      if (this.debug) {
        console.log(`[RepoMD] Using cached posts for bulk augmentation`);
      }

      // Create a lookup map for efficient filtering
      const postsMap = {};
      this.posts.forEach((post) => {
        if (post[property]) {
          postsMap[post[property]] = post;
        }
      });

      // Map keys to full post objects
      return targetKeys.map((key) => postsMap[key]).filter(Boolean);
    }

    // Otherwise load all posts and filter
    if (this.debug) {
      console.log(`[RepoMD] Loading all posts for bulk augmentation`);
    }

    const allPosts = await this.getAllPosts(useCache);
    const postsMap = {};

    // Create a lookup map for efficient filtering
    allPosts.forEach((post) => {
      if (post[property]) {
        postsMap[post[property]] = post;
      }
    });

    // Map keys to full post objects
    return targetKeys.map((key) => postsMap[key]).filter(Boolean);
  }

  // Fetch media data
  async getAllMedias(useCache = true) {
    const mediaData = await this.fetchR2Json("/medias.json", {
      defaultValue: {},
      useCache,
    });

    if (this.debug) {
      console.log(`[RepoMD] Fetched media data:`, mediaData);
    }

    return mediaData;
  }
  async getAllMedia(useCache = true) {
    // compatibility alias
    return await this.getAllMedias(useCache);
  }

  // Get all media items with formatted URLs
  async getMediaItems(useCache = true) {
    const mediaData = await this.getAllMedias(useCache);
    const items = [];

    if (this.debug) {
      console.log(
        "[RepoMD] Raw media data structure:",
        JSON.stringify(mediaData, null, 2)
      );
    }

    return mediaData.mediaData || [];
  }

  // Get a single blog post by ID
  async getPostById(id) {
    const startTime = performance.now();
    let lookupMethod = "unknown";

    if (this.debug) {
      console.log(`${prefix} 📡 Fetching post with ID: ${id}`);
    }

    // First check if we already have posts in memory
    if (this.posts) {
      if (this.debug) {
        console.log(`${prefix} 💾 Searching for ID in cached posts array`);
      }
      const post = this._findPostByProperty(this.posts, "id", id);
      if (post) {
        lookupMethod = "memory-cache";
        const duration = (performance.now() - startTime).toFixed(2);
        if (this.debug) {
          console.log(
            `${prefix} ✅ Found post in cache: ${
              post.title || id
            } in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Fall back to loading all posts and filtering
    if (this.debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find ID: ${id}`
      );
    }
    const posts = await this.getAllPosts();
    const post = this._findPostByProperty(posts, "id", id);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = "all-posts";
      if (this.debug) {
        console.log(
          `${prefix} ✅ Found post by ID in full posts list in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (this.debug) {
        console.log(
          `${prefix} ❓ Post with ID not found even after loading all posts (search took ${duration}ms)`
        );
      }
    }

    return post;
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
        console.error(`[RepoMD] Error fetching map data ${mapPath}:`, error);
      }
      return defaultValue;
    }
  }

  // Helper function to find post in array by property
  _findPostByProperty(posts, property, value) {
    return posts?.find((post) => post[property] === value) || null;
  }

  // Get a post by its direct path
  async getPostByPath(path) {
    if (this.debug) {
      console.log(`[RepoMD] Fetching post by path: ${path}`);
    }

    try {
      return await this.fetchR2Json(path, {
        defaultValue: null,
        useCache: true,
      });
    } catch (error) {
      if (this.debug) {
        console.error(`[RepoMD] Error fetching post at path ${path}:`, error);
      }
      return null;
    }
  }

  // Get a single blog post by slug
  async getPostBySlug(slug) {
    const startTime = performance.now();
    let lookupMethod = "unknown";

    if (this.debug) {
      console.log(`${prefix} 📡 Fetching post with slug: ${slug}`);
    }

    // First check if we already have posts in memory
    if (this.posts) {
      if (this.debug) {
        console.log(`${prefix} 💾 Searching for slug in cached posts array`);
      }
      const post = this._findPostByProperty(this.posts, "slug", slug);
      if (post) {
        lookupMethod = "memory-cache";
        const duration = (performance.now() - startTime).toFixed(2);
        if (this.debug) {
          console.log(
            `${prefix} ✅ Found post in cache by slug: ${
              post.title || slug
            } in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Try to get post hash from slug map
    const slugMap = await this._fetchMapData("/posts-slug-map.json");

    if (slugMap && slugMap[slug]) {
      // If we have a hash, use getPostByHash
      if (this.debug) {
        console.log(
          `${prefix} 🔍 Found hash for slug in slugMap: ${slugMap[slug]}`
        );
      }
      const post = await this.getPostByHash(slugMap[slug]);
      if (post) {
        lookupMethod = "slug-map";
        const duration = (performance.now() - startTime).toFixed(2);
        if (this.debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post via hash from slug mapping in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Fall back to loading all posts and filtering
    if (this.debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find slug: ${slug}`
      );
    }
    const posts = await this.getAllPosts();
    const post = this._findPostByProperty(posts, "slug", slug);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = "all-posts";
      if (this.debug) {
        console.log(
          `${prefix} ✅ Found post by slug in full posts list in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (this.debug) {
        console.log(
          `${prefix} ❓ Post with slug not found even after loading all posts (search took ${duration}ms)`
        );
      }
    }

    return post;
  }

  // Get a single blog post by hash
  async getPostByHash(hash) {
    const startTime = performance.now();
    let lookupMethod = "unknown";

    if (this.debug) {
      console.log(`${prefix} 📡 Fetching post with hash: ${hash}`);
    }

    // First check if we already have posts in memory
    if (this.posts) {
      if (this.debug) {
        console.log(`${prefix} 💾 Searching for hash in cached posts array`);
      }
      const post = this._findPostByProperty(this.posts, "hash", hash);
      if (post) {
        lookupMethod = "memory-cache";
        const duration = (performance.now() - startTime).toFixed(2);
        if (this.debug) {
          console.log(
            `${prefix} ✅ Found post in cache by hash: ${
              post.title || hash
            } in ${duration}ms`
          );
        }
        return post;
      } else {
        if (this.debug) {
          console.log(
            `${prefix} ❓ Post with hash not found in cache: ${hash}`
          );
        }
      }
    }

    // Try to get post path from path map
    const pathMap = await this._fetchMapData("/posts-path-map.json");

    if (pathMap && pathMap[hash]) {
      // If we have a path, use getPostByPath
      if (this.debug) {
        console.log(
          `${prefix} 🔍 Found path for hash in pathMap: ${pathMap[hash]}`
        );
      }
      const post = await this.getPostByPath(pathMap[hash]);
      if (post) {
        lookupMethod = "path-map";
        const duration = (performance.now() - startTime).toFixed(2);
        if (this.debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post by path from hash mapping in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Fall back to loading all posts and filtering
    // This is temporary and will be improved later as mentioned
    if (this.debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find hash: ${hash}`
      );
    }
    const posts = await this.getAllPosts();
    const post = this._findPostByProperty(posts, "hash", hash);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = "all-posts";
      if (this.debug) {
        console.log(
          `${prefix} ✅ Found post by hash in full posts list: ${
            post.title || hash
          } in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (this.debug) {
        console.log(
          `${prefix} ❓ Post with hash not found even after loading all posts: ${hash} (search took ${duration}ms)`
        );
      }
    }
    return post;
  }

  // Get posts embeddings map
  async getPostsEmbeddings() {
    if (this.debug) {
      console.log(`[RepoMD] Fetching posts embeddings map`);
    }

    return await this._fetchMapData("/posts-embedding-hash-map.json");
  }

  // Get similar post hashes by hash (returns just the hashes)
  async getSimilarPostsHashByHash(hash, limit = 10) {
    if (this.debug) {
      console.log(`[RepoMD] Fetching similar post hashes for hash: ${hash}`);
    }

    const embeddingsMap = await this.getPostsEmbeddings();

    if (
      embeddingsMap &&
      embeddingsMap[hash] &&
      Array.isArray(embeddingsMap[hash])
    ) {
      return embeddingsMap[hash].slice(0, limit);
    }

    return [];
  }

  // Get similar posts by hash using augmentation helper
  async getSimilarPostsByHash(hash, count = 5, options = {}) {
    if (this.debug) {
      console.log(`[RepoMD] Fetching similar posts for hash: ${hash}`);
    }

    // Get array of similar post hashes
    const similarHashes = await this.getSimilarPostsHashByHash(hash, count);

    if (!similarHashes.length) {
      // Fall back to recent posts if no similar posts found
      return await this.getRecentPosts(count);
    }

    // Use augmentation helper to get full post objects
    return await this.augmentPostsByProperty(similarHashes, "hash", {
      count,
      ...options,
    });
  }

  // Get similar post slugs by slug (returns just the slugs)
  async getSimilarPostsSlugBySlug(slug, limit = 10) {
    if (this.debug) {
      console.log(`[RepoMD] Fetching similar post slugs for slug: ${slug}`);
    }

    const embeddingsMap = await this._fetchMapData(
      "/posts-embedding-slug-map.json"
    );

    if (
      embeddingsMap &&
      embeddingsMap[slug] &&
      Array.isArray(embeddingsMap[slug])
    ) {
      return embeddingsMap[slug].slice(0, limit);
    }

    return [];
  }

  // Get similar posts by slug using augmentation helper
  async getSimilarPostsBySlug(slug, count = 5, options = {}) {
    if (this.debug) {
      console.log(`[RepoMD] Fetching similar posts for slug: ${slug}`);
    }

    // Get array of similar post slugs
    const similarSlugs = await this.getSimilarPostsSlugBySlug(slug, count);

    if (similarSlugs.length > 0) {
      // Use augmentation helper to get full post objects
      return await this.augmentPostsByProperty(similarSlugs, "slug", {
        count,
        ...options,
      });
    }

    // Try to get the post hash and find similar posts by hash if no similar posts by slug
    try {
      const post = await this.getPostBySlug(slug);
      if (post && post.hash) {
        return await this.getSimilarPostsByHash(post.hash, count, options);
      }
    } catch (error) {
      if (this.debug) {
        console.error(
          `[RepoMD] Error getting similar posts by hash for slug ${slug}:`,
          error
        );
      }
    }

    // Fall back to recent posts if no similar posts found
    return await this.getRecentPosts(count);
  }

  // Sort posts by date (newest first)
  sortPostsByDate(posts) {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Get recent posts
  async getRecentPosts(count = 3) {
    const posts = await this.getAllPosts();
    return this.sortPostsByDate(posts).slice(0, count);
  }

  // Get release information
  async getReleaseInfo() {
    try {
      const config = await this.fetchProjectDetails();

      if (!config || typeof config !== "object") {
        throw new Error("Invalid project configuration response");
      }

      return {
        current: config.latest_release || null,
        all: config.releases || [],
        projectId: config.id || this.projectId || null,
        projectName: config.name || null,
      };
    } catch (error) {
      if (this.debug) {
        console.error(
          `${prefix} ❌ Error getting release information: ${error.message}`
        );
      }
      throw new Error(`Failed to get release information: ${error.message}`);
    }
  }

  // Handle Cloudflare requests
  async handleCloudflareRequest(request) {
    if (this.debug) {
      console.log(`[RepoMD] Handling Cloudflare request: ${request.url}`);
    }
    // Create a wrapper function that resolves the Promise from getR2MediaUrl
    const getResolvedR2MediaUrl = async (path) => {
      return await this.getR2MediaUrl(path);
    };
    return await handleMediaRequest(request, getResolvedR2MediaUrl);
  }

  /**
   * Creates an OpenAI tool handler that uses this RepoMD instance
   * @returns {Function} - Handler function for OpenAI tool calls
   */
  createOpenAiToolHandler() {
    return createOpenAiToolHandler(this);
  }

  /**
   * Handles an OpenAI API request using this RepoMD instance
   * @param {Object} request - The OpenAI API request
   * @returns {Promise<Object>} - The response to send back to OpenAI
   */
  handleOpenAiRequest(request) {
    return handleOpenAiRequest(request, this);
  }

  /**
   * Lists all source files from the project
   * @param {boolean} useCache - Whether to use cache for the request
   * @returns {Promise<Array>} - Array of source files
   */
  async getSourceFilesList(useCache = true) {
    await this.ensureLatestRev();
    return await this.fetchR2Json("/files-source.json", {
      defaultValue: [],
      useCache,
    });
  }

  /**
   * Lists all distribution files from the project
   * @param {boolean} useCache - Whether to use cache for the request
   * @returns {Promise<Array>} - Array of distribution files
   */
  async getDistFilesList(useCache = true) {
    await this.ensureLatestRev();
    return await this.fetchR2Json("/files-dist.json", {
      defaultValue: [],
      useCache,
    });
  }

  /**
   * Fetches the graph data from the project
   * @param {boolean} useCache - Whether to use cache for the request
   * @returns {Promise<Object>} - The graph data object
   */
  async getGraph(useCache = true) {
    await this.ensureLatestRev();
    return await this.fetchR2Json("/graph.json", {
      defaultValue: {},
      useCache,
    });
  }
}

// Import tool specs for OpenAI
import { OpenAiToolSpec, toolSpecs } from "./openai/OpenAiToolSpec.js";

// Export RepoMD class and OpenAI related tools
export { RepoMD, OpenAiToolSpec, toolSpecs };
