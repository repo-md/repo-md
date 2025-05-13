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
 * @param {Function} config.getProjectUrl - Function to get project URLs (not revision-specific)
 * @param {Function} config.getSharedFolderUrl - Function to get shared folder URLs
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config.fetchJson - Function to fetch JSON from any URL
 * @param {Function} config._fetchMapData - Function to fetch map data
 * @param {Object} config.stats - Stats object for tracking usage metrics
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Post retrieval functions
 */
export function createPostRetrieval(config) {
  const { getRevisionUrl, getProjectUrl, getSharedFolderUrl, fetchR2Json, fetchJson, _fetchMapData, stats, debug = false } = config;
  
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
      
      // Update stats for memory cache usage
      if (stats) {
        stats.posts.byMethod.memoryCache++;
        stats.posts.lastUpdated = Date.now();
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
      
      // Update stats for all posts loaded
      if (stats) {
        stats.posts.totalLoaded += posts.length;
        stats.posts.byMethod.allPosts++;
        stats.posts.allPostsLoaded = true;
        stats.posts.lastUpdated = Date.now();
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
      const post = await fetchR2Json(path, {
        defaultValue: null,
        useCache: true,
      });
      
      if (post && stats) {
        stats.posts.totalLoaded++;
        stats.posts.byMethod.directPath++;
        stats.posts.individualLoads++;
        stats.posts.lastUpdated = Date.now();
      }
      
      return post;
    } catch (error) {
      if (debug) {
        console.error(`${prefix} ❌ Error fetching post at path ${path}:`, error);
      }
      return null;
    }
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
        
        // Update stats for memory cache usage
        if (stats) {
          stats.posts.byMethod.memoryCache++;
          stats.posts.lastUpdated = Date.now();
        }
        
        return post;
      }
    }

    // Try to directly load the post by its slug from the individual JSON file
    const slugPath = `/_posts/slug/${slug}.json`;
    if (debug) {
      console.log(
        `${prefix} 🔍 Trying to load individual post file directly: ${slugPath}`
      );
    }
    
    try {
      const post = await fetchR2Json(slugPath, {
        defaultValue: null,
        useCache: true,
      });
      
      if (post) {
        lookupMethod = 'direct-slug-file';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post directly from slug file in ${duration}ms`
          );
        }
        
        // Update stats for direct slug file usage
        if (stats) {
          stats.posts.totalLoaded++;
          stats.posts.byMethod.directSlugFile++;
          stats.posts.individualLoads++;
          stats.posts.lastUpdated = Date.now();
          
          // Check if we should side-load all posts
          if (!postsCache && stats.posts.individualLoads >= 5 && !stats.posts.allPostsLoaded) {
            if (debug) {
              console.log(
                `${prefix} 🔄 Individual post loads threshold reached (${stats.posts.individualLoads}), side-loading all posts for better performance`
              );
            }
            
            // Side-load all posts in the background (don't await)
            getAllPosts().then(posts => {
              if (debug) {
                console.log(
                  `${prefix} ✅ Side-loaded ${posts.length} posts after threshold reached`
                );
              }
            }).catch(error => {
              if (debug) {
                console.error(
                  `${prefix} ❌ Error side-loading all posts: ${error.message}`
                );
              }
            });
          }
        }
        
        return post;
      }
    } catch (error) {
      if (debug) {
        console.log(
          `${prefix} ⚠️ Could not load post directly from slug file: ${error.message}`
        );
      }
      // Continue to fallback options
    }

    // Fallback: Try to get post hash from slug map
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
        
        // Stats are already updated by getPostByHash, no need to update here
        
        return post;
      }
    }

    // Last resort: Fall back to loading all posts and filtering
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
      
      // Update stats for all posts usage (if not already updated by getAllPosts)
      if (stats && !stats.posts.allPostsLoaded) {
        stats.posts.byMethod.allPosts++;
        stats.posts.allPostsLoaded = true;
        stats.posts.lastUpdated = Date.now();
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
        
        // Update stats for memory cache usage
        if (stats) {
          stats.posts.byMethod.memoryCache++;
          stats.posts.lastUpdated = Date.now();
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

    // Try to directly load the post by its hash from the shared folder
    // This path is in the shared folder and doesn't need a revision number
    const hashPath = `/posts/${hash}.json`;
    if (debug) {
      console.log(
        `${prefix} 🔍 Trying to load individual post file directly from shared folder: ${hashPath}`
      );
    }
    
    try {
      // Get the URL using the shared folder URL generator
      const url = getSharedFolderUrl(hashPath);
      
      if (debug) {
        console.log(`${prefix} 🔗 Loading from shared URL: ${url}`);
      }
      
      const post = await fetchJson(url, {
        defaultValue: null,
        useCache: true,
      });
      
      if (post) {
        lookupMethod = 'direct-hash-file';
        const duration = (performance.now() - startTime).toFixed(2);
        if (debug) {
          console.log(
            `${prefix} ✅ Successfully loaded post directly from hash file in ${duration}ms`
          );
        }
        
        // Update stats for direct hash file usage
        if (stats) {
          stats.posts.totalLoaded++;
          stats.posts.byMethod.directHashFile++;
          stats.posts.individualLoads++;
          stats.posts.lastUpdated = Date.now();
          
          // Check if we should side-load all posts
          if (!postsCache && stats.posts.individualLoads >= 5 && !stats.posts.allPostsLoaded) {
            if (debug) {
              console.log(
                `${prefix} 🔄 Individual post loads threshold reached (${stats.posts.individualLoads}), side-loading all posts for better performance`
              );
            }
            
            // Side-load all posts in the background (don't await)
            getAllPosts().then(posts => {
              if (debug) {
                console.log(
                  `${prefix} ✅ Side-loaded ${posts.length} posts after threshold reached`
                );
              }
            }).catch(error => {
              if (debug) {
                console.error(
                  `${prefix} ❌ Error side-loading all posts: ${error.message}`
                );
              }
            });
          }
        }
        
        return post;
      }
    } catch (error) {
      if (debug) {
        console.log(
          `${prefix} ⚠️ Could not load post directly from hash file: ${error.message}`
        );
      }
      // Continue to fallback options
    }

    // Fallback: Try to get post path from path map
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
        
        // Update stats for path map usage
        if (stats) {
          stats.posts.totalLoaded++;
          stats.posts.byMethod.pathMap++;
          stats.posts.lastUpdated = Date.now();
        }
        
        return post;
      }
    }

    // Last resort: Fall back to loading all posts and filtering
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
      
      // Update stats for all posts usage (if not already updated by getAllPosts)
      if (stats && !stats.posts.allPostsLoaded) {
        stats.posts.byMethod.allPosts++;
        stats.posts.allPostsLoaded = true;
        stats.posts.lastUpdated = Date.now();
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
          : null;
          
      // If we don't have a getter method for this property (like 'id'), use general lookup
      if (!getterMethod) {
        if (debug) {
          console.log(`${prefix} ⚠️ No direct getter for property '${property}', using all posts lookup`);
        }
        const allPosts = await getAllPosts();
        const posts = targetKeys
          .map(key => _findPostByProperty(allPosts, property, key))
          .filter(Boolean);
        return posts;
      }

      // Fetch all posts in parallel using the appropriate getter
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
    getPostBySlug,
    getPostByHash,
    augmentPostsByProperty,
    sortPostsByDate,
    getRecentPosts,
    _findPostByProperty,
  };
}