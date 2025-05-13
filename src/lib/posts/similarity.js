/**
 * Post Similarity module for RepoMD
 * Provides functions for computing and retrieving post similarities
 */

import { similarity as computeCosineSimilarity } from 'compute-cosine-similarity';
import { LOG_PREFIXES } from '../logger.js';
import cache from '../core/cache.js';

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a post similarity service
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config._fetchMapData - Function to fetch map data
 * @param {Function} config.getRecentPosts - Function to get recent posts
 * @param {Function} config.getPostBySlug - Function to get a post by slug
 * @param {Function} config.augmentPostsByProperty - Function to augment posts by property
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Post similarity functions
 */
export function createPostSimilarity(config) {
  const { 
    fetchR2Json, 
    _fetchMapData, 
    getRecentPosts,
    getPostBySlug,
    augmentPostsByProperty,
    debug = false 
  } = config;
  
  // Local caches for similarity data
  let similarityData = null;
  let similarPostsHashes = null;
  const similarityCache = {}; // Memory cache for similarity scores

  /**
   * Get pre-computed post similarities
   * @returns {Promise<Object>} - Similarity data
   */
  async function getPostsSimilarity() {
    if (!similarityData) {
      if (debug) {
        console.log(`${prefix} 📡 Loading pre-computed post similarity data`);
      }
      similarityData = await _fetchMapData(
        '/posts-similarity.json',
        {}
      );
    }
    return similarityData;
  }

  /**
   * Get posts embeddings map
   * @returns {Promise<Object>} - Embeddings map
   */
  async function getPostsEmbeddings() {
    if (debug) {
      console.log(`${prefix} 📡 Fetching posts embeddings map`);
    }

    return await _fetchMapData('/posts-embedding-hash-map.json');
  }

  /**
   * Calculate similarity between two posts by hash
   * @param {string} hash1 - First post hash
   * @param {string} hash2 - Second post hash
   * @returns {Promise<number>} - Similarity score (0-1)
   */
  async function getPostsSimilarityByHashes(hash1, hash2) {
    if (hash1 === hash2) return 1.0; // Same post has perfect similarity

    // Create a cache key (ordered alphabetically for consistency)
    const cacheKey = [hash1, hash2].sort().join('-');

    // Check in-memory cache first
    if (similarityCache[cacheKey] !== undefined) {
      if (debug) {
        console.log(
          `${prefix} 💾 Using memory-cached similarity for ${hash1} and ${hash2}`
        );
      }
      return similarityCache[cacheKey];
    }

    // Try to get from pre-computed similarity data
    const similarityDataMap = await getPostsSimilarity();

    if (similarityDataMap && similarityDataMap[cacheKey] !== undefined) {
      const similarity = similarityDataMap[cacheKey];

      // Cache the result in memory
      similarityCache[cacheKey] = similarity;

      if (debug) {
        console.log(
          `${prefix} 💾 Using pre-computed similarity ${similarity.toFixed(
            4
          )} for ${hash1} and ${hash2}`
        );
      }

      return similarity;
    }

    // Fall back to computing on the fly if no pre-computed data available
    if (debug) {
      console.log(
        `${prefix} ⚠️ No pre-computed similarity found for ${cacheKey}, computing on the fly`
      );
    }

    // Get embeddings map
    const embeddingsMap = await getPostsEmbeddings();

    // Ensure we have both embeddings
    if (!embeddingsMap[hash1] || !embeddingsMap[hash2]) {
      if (debug) {
        console.log(
          `${prefix} ❌ Missing embedding for hash: ${
            !embeddingsMap[hash1] ? hash1 : hash2
          }`
        );
      }
      return 0; // No similarity if we don't have the embeddings
    }

    // Calculate similarity
    const similarity = computeCosineSimilarity(
      embeddingsMap[hash1],
      embeddingsMap[hash2]
    );

    // Cache the result
    similarityCache[cacheKey] = similarity;

    if (debug) {
      console.log(
        `${prefix} 🧮 Calculated similarity ${similarity.toFixed(
          4
        )} for ${hash1} and ${hash2}`
      );
    }

    return similarity;
  }

  /**
   * Get pre-computed similar post hashes
   * @returns {Promise<Object>} - Similar posts hashes map
   */
  async function getTopSimilarPostsHashes() {
    if (!similarPostsHashes) {
      if (debug) {
        console.log(`${prefix} 📡 Loading pre-computed similar post hashes`);
      }
      similarPostsHashes = await _fetchMapData(
        '/posts-similar-hash.json',
        {}
      );
    }
    return similarPostsHashes;
  }

  /**
   * Get similar post hashes by hash
   * @param {string} hash - Post hash
   * @param {number} limit - Maximum number of similar hashes to return
   * @returns {Promise<Array<string>>} - Array of similar post hashes
   */
  async function getSimilarPostsHashByHash(hash, limit = 10) {
    if (debug) {
      console.log(
        `${prefix} 📡 Fetching similar post hashes for hash: ${hash}`
      );
    }

    // Try to get from pre-computed similar hashes map first
    const similarHashesMap = await getTopSimilarPostsHashes();

    // If we have pre-computed similar hashes, use them
    if (similarHashesMap && similarHashesMap[hash]) {
      if (debug) {
        console.log(
          `${prefix} 💾 Using pre-computed similar hashes for ${hash}`
        );
      }
      return similarHashesMap[hash].slice(0, limit);
    }

    // Fall back to the old implementation if no pre-computed data available
    if (debug) {
      console.log(
        `${prefix} ⚠️ No pre-computed similar hashes found for ${hash}, falling back to on-the-fly computation`
      );
    }

    // First try to get from the pre-computed embeddings map
    const embeddingsMap = await getPostsEmbeddings();

    // If no pre-computed similar posts, compute similarities on the fly
    if (debug) {
      console.log(`${prefix} 🧮 Computing similarities for ${hash} on the fly`);
    }

    // Get all post hashes from the embeddings map
    const allHashes = Object.keys(embeddingsMap);

    // Skip if the target hash is not in the embeddings map
    if (!allHashes.includes(hash)) {
      if (debug) {
        console.log(
          `${prefix} ❌ No embedding found for post with hash: ${hash}`
        );
      }
      return [];
    }

    // Calculate similarities for all posts
    const similarities = [];

    for (const otherHash of allHashes) {
      if (otherHash === hash) continue; // Skip the target post
      const similarity = await getPostsSimilarityByHashes(hash, otherHash);
      similarities.push({
        hash: otherHash,
        similarity,
      });
    }

    // Sort by similarity (highest first) and take the top 'limit'
    const sortedSimilarities = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // Return just the hashes
    return sortedSimilarities.map((item) => item.hash);
  }

  /**
   * Get similar posts by hash
   * @param {string} hash - Post hash
   * @param {number} count - Maximum number of similar posts to return
   * @param {Object} options - Options for augmentation
   * @returns {Promise<Array<Object>>} - Array of similar posts
   */
  async function getSimilarPostsByHash(hash, count = 5, options = {}) {
    if (debug) {
      console.log(`${prefix} 📡 Fetching similar posts for hash: ${hash}`);
    }

    // Get array of similar post hashes
    const similarHashes = await getSimilarPostsHashByHash(hash, count);

    if (!similarHashes.length) {
      // Fall back to recent posts if no similar posts found
      return await getRecentPosts(count);
    }

    // Use augmentation helper to get full post objects
    return await augmentPostsByProperty(similarHashes, 'hash', {
      count,
      ...options,
    });
  }

  /**
   * Get similar post slugs by slug
   * @param {string} slug - Post slug
   * @param {number} limit - Maximum number of similar slugs to return
   * @returns {Promise<Array<string>>} - Array of similar post slugs
   */
  async function getSimilarPostsSlugBySlug(slug, limit = 10) {
    if (debug) {
      console.log(`${prefix} 📡 Fetching similar post slugs for slug: ${slug}`);
    }

    const embeddingsMap = await _fetchMapData(
      '/posts-embedding-slug-map.json'
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

  /**
   * Get similar posts by slug
   * @param {string} slug - Post slug
   * @param {number} count - Maximum number of similar posts to return
   * @param {Object} options - Options for augmentation
   * @returns {Promise<Array<Object>>} - Array of similar posts
   */
  async function getSimilarPostsBySlug(slug, count = 5, options = {}) {
    if (debug) {
      console.log(`${prefix} 📡 Fetching similar posts for slug: ${slug}`);
    }

    // Get array of similar post slugs
    const similarSlugs = await getSimilarPostsSlugBySlug(slug, count);

    if (similarSlugs.length > 0) {
      // Use augmentation helper to get full post objects
      return await augmentPostsByProperty(similarSlugs, 'slug', {
        count,
        ...options,
      });
    }

    // Try to get the post hash and find similar posts by hash if no similar posts by slug
    try {
      const post = await getPostBySlug(slug);
      if (post && post.hash) {
        return await getSimilarPostsByHash(post.hash, count, options);
      }
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error getting similar posts by hash for slug ${slug}:`,
          error
        );
      }
    }

    // Fall back to recent posts if no similar posts found
    return await getRecentPosts(count);
  }

  return {
    getPostsEmbeddings,
    getPostsSimilarity,
    getPostsSimilarityByHashes,
    getTopSimilarPostsHashes,
    getSimilarPostsHashByHash,
    getSimilarPostsByHash,
    getSimilarPostsSlugBySlug,
    getSimilarPostsBySlug,
  };
}