/**
 * Media Similarity module for RepoMD
 * Provides functions for computing and retrieving media similarities
 */

import { similarity as computeCosineSimilarity } from "compute-cosine-similarity";
import { LOG_PREFIXES } from "../logger.js";
import cache from "../core/cache.js";

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a media similarity service
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config._fetchMapData - Function to fetch map data
 * @param {Function} config.getAllMedia - Function to get all media
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Media similarity functions
 */
export function createMediaSimilarity(config) {
  const {
    fetchR2Json,
    _fetchMapData,
    getAllMedia,
    debug = false,
  } = config;

  // Local caches for similarity data
  let similarityData = null;
  let similarMediaHashes = null;
  const similarityCache = {}; // Memory cache for similarity scores

  /**
   * Get pre-computed media similarities
   * @returns {Promise<Object>} - Similarity data
   */
  async function getMediaSimilarity() {
    if (!similarityData) {
      if (debug) {
        console.log(`${prefix} 📡 Loading pre-computed media similarity data`);
      }
      similarityData = await _fetchMapData("/media-similarity.json", {});
    }
    return similarityData;
  }

  /**
   * Get media embeddings map
   * @returns {Promise<Object>} - Embeddings map
   */
  async function getMediaEmbeddings() {
    if (debug) {
      console.log(`${prefix} 📡 Fetching media embeddings map`);
    }

    return await _fetchMapData("/media-embedding-hash-map.json");
  }

  /**
   * Calculate similarity between two media items by hash
   * @param {string} hash1 - First media hash
   * @param {string} hash2 - Second media hash
   * @returns {Promise<number>} - Similarity score (0-1)
   * @throws {Error} - If hash parameters are missing or invalid
   */
  async function getMediaSimilarityByHashes(hash1, hash2) {
    // Validate hash1 parameter
    if (!hash1) {
      throw new Error('Hash1 is required for getMediaSimilarityByHashes operation');
    }

    if (typeof hash1 !== 'string') {
      throw new Error('Hash1 must be a string value');
    }

    // Validate hash2 parameter
    if (!hash2) {
      throw new Error('Hash2 is required for getMediaSimilarityByHashes operation');
    }

    if (typeof hash2 !== 'string') {
      throw new Error('Hash2 must be a string value');
    }

    if (hash1 === hash2) return 1.0; // Same media has perfect similarity

    // Create a cache key (ordered alphabetically for consistency)
    const cacheKey = [hash1, hash2].sort().join("-");

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
    const similarityDataMap = await getMediaSimilarity();

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
    const embeddingsMap = await getMediaEmbeddings();

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
   * Get pre-computed similar media hashes
   * @returns {Promise<Object>} - Similar media hashes map
   */
  async function getTopSimilarMediaHashes() {
    if (!similarMediaHashes) {
      if (debug) {
        console.log(`${prefix} 📡 Loading pre-computed similar media hashes`);
      }
      similarMediaHashes = await _fetchMapData("/media-similar-hash.json", {});
    }
    return similarMediaHashes;
  }

  /**
   * Get similar media hashes by hash
   * @param {string} hash - Media hash
   * @param {number} limit - Maximum number of similar hashes to return
   * @returns {Promise<Array<string>>} - Array of similar media hashes
   * @throws {Error} - If hash parameter is missing or invalid
   */
  async function getSimilarMediaHashByHash(hash, limit = 10) {
    // Validate hash parameter
    if (!hash) {
      throw new Error('Hash is required for getSimilarMediaHashByHash operation');
    }

    if (typeof hash !== 'string') {
      throw new Error('Hash must be a string value');
    }

    // Validate limit parameter
    if (limit !== undefined && (typeof limit !== 'number' || limit < 0)) {
      throw new Error('Limit must be a positive number or zero');
    }

    if (debug) {
      console.log(
        `${prefix} 📡 Fetching similar media hashes for hash: ${hash}`
      );
    }

    // Try to get from pre-computed similar hashes map first
    const similarHashesMap = await getTopSimilarMediaHashes();

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
    const embeddingsMap = await getMediaEmbeddings();

    // If no pre-computed similar media, compute similarities on the fly
    if (debug) {
      console.log(`${prefix} 🧮 Computing similarities for ${hash} on the fly`);
    }

    // Get all media hashes from the embeddings map
    const allHashes = Object.keys(embeddingsMap);

    // Skip if the target hash is not in the embeddings map
    if (!allHashes.includes(hash)) {
      if (debug) {
        console.log(
          `${prefix} ❌ No embedding found for media with hash: ${hash}`
        );
      }
      return [];
    }

    // Calculate similarities for all media
    const similarities = [];

    for (const otherHash of allHashes) {
      if (otherHash === hash) continue; // Skip the target media
      const similarity = await getMediaSimilarityByHashes(hash, otherHash);
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
   * Get similar media by hash
   * @param {string} hash - Media hash
   * @param {number} count - Maximum number of similar media to return
   * @returns {Promise<Array<Object>>} - Array of similar media
   * @throws {Error} - If hash parameter is missing or invalid
   */
  async function getSimilarMediaByHash(hash, count = 5) {
    // Validate hash parameter
    if (!hash) {
      throw new Error('Hash is required for getSimilarMediaByHash operation');
    }

    if (typeof hash !== 'string') {
      throw new Error('Hash must be a string value');
    }

    // Validate count parameter
    if (count !== undefined && (typeof count !== 'number' || count < 0)) {
      throw new Error('Count must be a positive number or zero');
    }

    if (debug) {
      console.log(`${prefix} 📡 Fetching similar media for hash: ${hash}`);
    }

    // Get array of similar media hashes
    const similarHashes = await getSimilarMediaHashByHash(hash, count);

    if (!similarHashes.length) {
      // Fall back to all media if no similar media found
      return await getAllMedia();
    }

    // Get all media and filter by the similar hashes
    const allMedia = await getAllMedia();
    return allMedia.filter(media => similarHashes.includes(media.hash)).slice(0, count);
  }

  return {
    getMediaEmbeddings,
    getMediaSimilarity,
    getMediaSimilarityByHashes,
    getTopSimilarMediaHashes,
    getSimilarMediaHashByHash,
    getSimilarMediaByHash,
  };
} 