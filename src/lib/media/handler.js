/**
 * Media Handling module for RepoMD
 * Provides functions for media asset retrieval and processing
 */

import { LOG_PREFIXES } from '../logger.js';
import { handleCloudflareRequest as handleMediaRequest } from '../mediaProxy.js';

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a media handling service
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config.getProjectUrl - Function to get project URL
 * @param {Function} config.ensureLatestRev - Function to ensure latest revision is resolved
 * @param {Function} config.getRevisionUrl - Function to get revision URL
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Media handling functions
 */
export function createMediaHandler(config) {
  const { 
    fetchR2Json, 
    getProjectUrl, 
    getRevisionUrl, 
    ensureLatestRev, 
    debug = false 
  } = config;

  /**
   * Get URL for a media asset
   * @param {string} path - Media asset path
   * @returns {Promise<string>} - Full URL to media asset
   */
  async function getMediaUrl(path) {
    const url = getProjectUrl(`/_shared/medias/${path}`);
    
    if (debug) {
      console.log(`${prefix} 🔗 Generated media URL: ${url}`);
    }
    return url;
  }

  /**
   * Get all media data
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} - Media data
   */
  async function getAllMedias(useCache = true) {
    await ensureLatestRev();
    const mediaData = await fetchR2Json('/medias.json', {
      defaultValue: {},
      useCache,
    });

    if (debug) {
      console.log(`${prefix} 📄 Fetched media data`);
    }

    return mediaData;
  }

  /**
   * Legacy alias for getAllMedias
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} - Media data
   */
  async function getAllMedia(useCache = true) {
    return await getAllMedias(useCache);
  }

  /**
   * Get all media items with formatted URLs
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object>} - Media items
   */
  async function getMediaItems(useCache = true) {
    return await getAllMedias(useCache);
  }

  /**
   * Handle a Cloudflare request for media assets
   * @param {Object} request - Cloudflare request object
   * @returns {Promise<Response>} - Response object
   */
  async function handleCloudflareRequest(request) {
    if (debug) {
      console.log(`${prefix} 🖼️ Handling Cloudflare request: ${request.url}`);
    }
    
    // Create a wrapper function that resolves the Promise from getMediaUrl
    const getResolvedMediaUrl = async (path) => {
      return await getMediaUrl(path);
    };
    
    return await handleMediaRequest(request, getResolvedMediaUrl);
  }

  return {
    getMediaUrl,
    getAllMedias,
    getAllMedia,
    getMediaItems,
    handleCloudflareRequest,
  };
}