/**
 * Post Retrieval module for RepoMD
 * Provides functions for fetching and retrieving blog posts
 */

import { LOG_PREFIXES } from '../logger.js';
import cache from '../core/cache.js';

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a post retrieval service
 * @param {Object} config - Configuration object
 * @param {Function} config.getRevisionUrl - Function to get revision-specific URLs (async)
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config._fetchMapData - Function to fetch map data
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Post retrieval functions
 */
export function createPostRetrieval(config) {
  const { getRevisionUrl, fetchR2Json, _fetchMapData, debug = false } = config;
  
  // Local post cache reference
  let postsCache = null;
  
  /**
   * Helper function to find post in array by property
   * @param {Array} posts - Array of posts
   * @param {string} property - Property name to match
   * @param {any} value - Value to match
   * @returns {Object|null} - Found post or null
   */
  function _findPostByProperty(posts, property, value) {
    return posts?.find((post) => post[property] === value) || null;
  }
  
  /**
   * Get all blog posts
   * @param {boolean} useCache - Whether to use cache
   * @param {boolean} forceRefresh - Whether to force refresh from R2
   * @returns {Promise<Array>} - Array of posts
   */
  async function getAllPosts(useCache = true, forceRefresh = false) {
    const startTime = performance.now();

    // Return cached posts if available and refresh not forced
    if (useCache && postsCache && !forceRefresh) {
      const duration = (performance.now() - startTime).toFixed(2);
      if (debug) {
        console.log(
          `${prefix} 💾 Using cached posts array (${postsCache.length} posts) in ${duration}ms`
        );
      }
      return postsCache;
    }

    // Fetch posts from R2
    const posts = await fetchR2Json("/posts.json", {
      defaultValue: [],
      useCache,
    });

    // Cache the posts for future use
    if (useCache) {
      postsCache = posts;
      const duration = (performance.now() - startTime).toFixed(2);
      if (debug) {
        console.log(
          `${prefix} 📄 Cached ${posts.length} posts in memory in ${duration}ms`
        );
      }
    }

    return posts;
  }

  /**
   * Get a post by its direct path
   * @param {string} path - Post path
   * @returns {Promise<Object|null>} - Post object or null
   * @throws {Error} - If path parameter is missing or invalid
   */
  async function getPostByPath(path) {
    // Validate path parameter
    if (!path) {
      throw new Error('Path is required for getPostByPath operation');
    }

    if (typeof path !== 'string') {
      throw new Error('Path must be a string value');
    }

    if (debug) {
      console.log(`${prefix} 📡 Fetching post by path: ${path}`);
    }

    try {
      return await fetchR2Json(path, {
        defaultValue: null,
        useCache: true,
      });
    } catch (error) {
      if (debug) {
        console.error(`${prefix} ❌ Error fetching post at path ${path}:`, error);
      }
      return null;
    }
  }

  /**
   * Get a single blog post by ID
   * @param {string} id - Post ID
   * @returns {Promise<Object|null>} - Post object or null
   */
  async function getPostById(id) {
    const startTime = performance.now();
    let lookupMethod = 'unknown';

    if (debug) {
      console.log(`${prefix} 📡 Fetching post with ID: ${id}`);
    }

    // First check if we already have posts in memory
    if (postsCache) {
      if (debug) {
        console.log(`${prefix} 💾 Searching for ID in cached posts array`);
      }
      const post = _findPostByProperty(postsCache, 'id', id);
      if (post) {
        lookupMethod = 'memory-cache';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
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
    if (debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find ID: ${id}`
      );
    }
    const posts = await getAllPosts();
    const post = _findPostByProperty(posts, 'id', id);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = 'all-posts';
      if (debug) {
        console.log(
          `${prefix} ✅ Found post by ID in full posts list in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (debug) {
        console.log(
          `${prefix} ❓ Post with ID not found even after loading all posts (search took ${duration}ms)`
        );
      }
    }

    return post;
  }

  /**
   * Get a single blog post by slug
   * @param {string} slug - Post slug
   * @returns {Promise<Object|null>} - Post object or null
   * @throws {Error} - If slug parameter is missing or invalid
   */
  async function getPostBySlug(slug) {
    // Validate slug parameter
    if (!slug) {
      throw new Error('Slug is required for getPostBySlug operation');
    }

    if (typeof slug !== 'string') {
      throw new Error('Slug must be a string value');
    }

    const startTime = performance.now();
    let lookupMethod = 'unknown';

    if (debug) {
      console.log(`${prefix} 📡 Fetching post with slug: ${slug}`);
    }

    // First check if we already have posts in memory
    if (postsCache) {
      if (debug) {
        console.log(`${prefix} 💾 Searching for slug in cached posts array`);
      }
      const post = _findPostByProperty(postsCache, 'slug', slug);
      if (post) {
        lookupMethod = 'memory-cache';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
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
    const slugMap = await _fetchMapData('/posts-slug-map.json');

    if (slugMap && slugMap[slug]) {
      // If we have a hash, use getPostByHash
      if (debug) {
        console.log(
          `${prefix} 🔍 Found hash for slug in slugMap: ${slugMap[slug]}`
        );
      }
      const post = await getPostByHash(slugMap[slug]);
      if (post) {
        lookupMethod = 'slug-map';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post via hash from slug mapping in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Fall back to loading all posts and filtering
    if (debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find slug: ${slug}`
      );
    }
    const posts = await getAllPosts();
    const post = _findPostByProperty(posts, 'slug', slug);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = 'all-posts';
      if (debug) {
        console.log(
          `${prefix} ✅ Found post by slug in full posts list in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (debug) {
        console.log(
          `${prefix} ❓ Post with slug not found even after loading all posts (search took ${duration}ms)`
        );
      }
    }

    return post;
  }

  /**
   * Get a single blog post by hash
   * @param {string} hash - Post hash
   * @returns {Promise<Object|null>} - Post object or null
   * @throws {Error} - If hash parameter is missing or invalid
   */
  async function getPostByHash(hash) {
    // Validate hash parameter
    if (!hash) {
      throw new Error('Hash is required for getPostByHash operation');
    }

    if (typeof hash !== 'string') {
      throw new Error('Hash must be a string value');
    }

    const startTime = performance.now();
    let lookupMethod = 'unknown';

    if (debug) {
      console.log(`${prefix} 📡 Fetching post with hash: ${hash}`);
    }

    // First check if we already have posts in memory
    if (postsCache) {
      if (debug) {
        console.log(`${prefix} 💾 Searching for hash in cached posts array`);
      }
      const post = _findPostByProperty(postsCache, 'hash', hash);
      if (post) {
        lookupMethod = 'memory-cache';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
          console.log(
            `${prefix} ✅ Found post in cache by hash: ${
              post.title || hash
            } in ${duration}ms`
          );
        }
        return post;
      } else {
        if (debug) {
          console.log(
            `${prefix} ❓ Post with hash not found in cache: ${hash}`
          );
        }
      }
    }

    // Try to get post path from path map
    const pathMap = await _fetchMapData('/posts-path-map.json');

    if (pathMap && pathMap[hash]) {
      // If we have a path, use getPostByPath
      if (debug) {
        console.log(
          `${prefix} 🔍 Found path for hash in pathMap: ${pathMap[hash]}`
        );
      }
      const post = await getPostByPath(pathMap[hash]);
      if (post) {
        lookupMethod = 'path-map';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post by path from hash mapping in ${duration}ms`
          );
        }
        return post;
      }
    }

    // Fall back to loading all posts and filtering
    if (debug) {
      console.log(
        `${prefix} 📡 Falling back to loading all posts to find hash: ${hash}`
      );
    }
    const posts = await getAllPosts();
    const post = _findPostByProperty(posts, 'hash', hash);

    const duration = (performance.now() - startTime).toFixed(2);
    if (post) {
      lookupMethod = 'all-posts';
      if (debug) {
        console.log(
          `${prefix} ✅ Found post by hash in full posts list: ${
            post.title || hash
          } in ${duration}ms using ${lookupMethod}`
        );
      }
    } else {
      if (debug) {
        console.log(
          `${prefix} ❓ Post with hash not found even after loading all posts: ${hash} (search took ${duration}ms)`
        );
      }
    }
    return post;
  }

  /**
   * Helper to augment an array of keys with their corresponding posts
   * @param {Array<string>} keys - Array of keys
   * @param {string} property - Property to match (hash, slug, id)
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Array of posts
   */
  async function augmentPostsByProperty(keys, property, options = {}) {
    if (!keys || !keys.length) return [];

    const {
      loadIndividually = 3, // Threshold for switching to bulk loading
      count = keys.length, // How many posts to return
      useCache = true, // Whether to use cache
    } = options;

    // Slice to requested count
    const targetKeys = keys.slice(0, count);

    if (debug) {
      console.log(
        `${prefix} 📡 Augmenting ${targetKeys.length} posts by ${property}`
      );
    }

    // For small number of posts (<= loadIndividually), load individually
    if (targetKeys.length <= loadIndividually) {
      if (debug) {
        console.log(`${prefix} 📡 Loading ${targetKeys.length} posts individually`);
      }

      // Use the appropriate getter method based on property
      const getterMethod =
        property === 'hash'
          ? getPostByHash
          : property === 'slug'
          ? getPostBySlug
          : getPostById;

      // Fetch all posts in parallel
      const posts = await Promise.all(
        targetKeys.map((key) => getterMethod(key))
      );

      return posts.filter(Boolean); // Filter out null values
    }

    // For larger sets, check if posts are already cached
    if (useCache && postsCache) {
      if (debug) {
        console.log(`${prefix} 💾 Using cached posts for bulk augmentation`);
      }

      // Create a lookup map for efficient filtering
      const postsMap = {};
      postsCache.forEach((post) => {
        if (post[property]) {
          postsMap[post[property]] = post;
        }
      });

      // Map keys to full post objects
      return targetKeys.map((key) => postsMap[key]).filter(Boolean);
    }

    // Otherwise load all posts and filter
    if (debug) {
      console.log(`${prefix} 📡 Loading all posts for bulk augmentation`);
    }

    const allPosts = await getAllPosts(useCache);
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

  /**
   * Sort posts by date (newest first)
   * @param {Array} posts - Array of posts
   * @returns {Array} - Sorted posts
   */
  function sortPostsByDate(posts) {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Get recent posts
   * @param {number} count - Number of posts to retrieve
   * @returns {Promise<Array>} - Array of recent posts
   */
  async function getRecentPosts(count = 3) {
    const posts = await getAllPosts();
    return sortPostsByDate(posts).slice(0, count);
  }

  return {
    getAllPosts,
    getPostByPath,
    getPostById,
    getPostBySlug,
    getPostByHash,
    augmentPostsByProperty,
    sortPostsByDate,
    getRecentPosts,
    _findPostByProperty,
  };
}