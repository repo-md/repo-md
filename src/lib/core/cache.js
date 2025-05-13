/**
 * Core caching implementation for RepoMD
 * Provides a central caching mechanism used across all modules
 */

import QuickLRU from 'quick-lru';
import { LOG_PREFIXES } from '../logger.js';

const prefix = LOG_PREFIXES.UTILS;

// Default cache configuration
const DEFAULT_CACHE_CONFIG = {
  maxSize: 1000,
  maxAge: 60000 * 60, // 1 hour
};

// Create namespaced cache instances to avoid key collisions
const caches = {
  default: createCache(DEFAULT_CACHE_CONFIG),
  posts: createCache(DEFAULT_CACHE_CONFIG),
  media: createCache(DEFAULT_CACHE_CONFIG),
  urls: createCache(DEFAULT_CACHE_CONFIG),
  similarity: createCache(DEFAULT_CACHE_CONFIG),
};

/**
 * Create a QuickLRU cache with the given config
 */
function createCache(config = {}) {
  return new QuickLRU({
    maxSize: config.maxSize || DEFAULT_CACHE_CONFIG.maxSize,
    maxAge: config.maxAge || DEFAULT_CACHE_CONFIG.maxAge,
  });
}

/**
 * Get a value from cache by key
 * @param {string} key - Cache key
 * @param {string} namespace - Cache namespace
 * @param {boolean} debug - Whether to log debug info
 * @returns {any} - Cached value or undefined if not found
 */
export function getCached(key, namespace = 'default', debug = false) {
  const cache = caches[namespace] || caches.default;
  
  if (cache.has(key)) {
    if (debug) {
      console.log(`${prefix} ✨ Cache hit for ${namespace}:${key}`);
    }
    return cache.get(key);
  }
  
  if (debug) {
    console.log(`${prefix} 🔍 Cache miss for ${namespace}:${key}`);
  }
  
  return undefined;
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {string} namespace - Cache namespace
 * @param {boolean} debug - Whether to log debug info
 */
export function setCached(key, value, namespace = 'default', debug = false) {
  const cache = caches[namespace] || caches.default;
  cache.set(key, value);
  
  if (debug) {
    console.log(`${prefix} 💽 Cached data for ${namespace}:${key} (cache size: ${cache.size})`);
  }
}

/**
 * Clear a specific cache namespace
 * @param {string} namespace - Cache namespace to clear
 * @param {boolean} debug - Whether to log debug info
 */
export function clearCache(namespace = 'default', debug = false) {
  if (caches[namespace]) {
    caches[namespace].clear();
    if (debug) {
      console.log(`${prefix} 🧹 Cleared cache for namespace: ${namespace}`);
    }
  }
}

/**
 * Clear all caches
 * @param {boolean} debug - Whether to log debug info
 */
export function clearAllCaches(debug = false) {
  Object.keys(caches).forEach(namespace => {
    caches[namespace].clear();
  });
  
  if (debug) {
    console.log(`${prefix} 🧹 Cleared all caches`);
  }
}

/**
 * Configure a specific cache namespace
 * @param {string} namespace - Cache namespace
 * @param {Object} config - Cache configuration
 * @param {boolean} debug - Whether to log debug info
 */
export function configureCache(namespace, config = {}, debug = false) {
  if (!caches[namespace]) {
    caches[namespace] = createCache(config);
    if (debug) {
      console.log(`${prefix} 🔧 Created new cache namespace: ${namespace}`);
    }
  } else {
    // Resize existing cache if needed
    if (config.maxSize && config.maxSize !== caches[namespace].maxSize) {
      caches[namespace].resize(config.maxSize);
      if (debug) {
        console.log(`${prefix} 🔧 Resized cache for namespace: ${namespace}`);
      }
    }
  }
}

/**
 * Get cache statistics for all namespaces
 * @returns {Object} - Object with cache statistics by namespace
 */
export function getCacheStats() {
  const stats = {};
  
  Object.keys(caches).forEach(namespace => {
    stats[namespace] = {
      size: caches[namespace].size,
      maxSize: caches[namespace].maxSize,
    };
  });
  
  return stats;
}

export default {
  get: getCached,
  set: setCached,
  clear: clearCache,
  clearAll: clearAllCaches,
  configure: configureCache,
  stats: getCacheStats,
};