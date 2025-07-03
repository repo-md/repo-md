/**
 * Remix integration for RepoMD
 * Provides loader functions for resource routes
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { getProjectIdFromEnv } from '../utils/env.js';

/**
 * Create a Remix loader for RepoMD media proxy
 * @param {Object|string} options - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {string} [options.mediaUrlPrefix] - Custom media URL prefix
 * @param {string} [options.r2Url] - Custom R2 URL
 * @param {number} [options.cacheMaxAge] - Cache max age in seconds
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Function} Remix loader function
 */
export function remixRepoMdLoader(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Remix loader');
  const proxyConfig = new UnifiedProxyConfig({
    projectId,
    mediaUrlPrefix: config.mediaUrlPrefix,
    r2Url: config.r2Url,
    cacheMaxAge: config.cacheMaxAge,
    debug: config.debug,
  });
  
  return proxyConfig.toRemixLoader();
}

/**
 * Create a Remix action for RepoMD (for future POST/PUT support)
 * @param {Object|string} options - Configuration options or project ID string
 * @returns {Function} Remix action function
 */
export function remixRepoMdAction(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Remix action');
  
  return async ({ request }) => {
    // For now, just return method not allowed
    // Future: could handle file uploads to R2
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Allow': 'GET, HEAD'
      }
    });
  };
}

/**
 * Create a complete Remix route module for RepoMD
 * This exports both loader and meta functions
 * @param {Object|string} options - Configuration options or project ID string
 * @returns {Object} Remix route module exports
 */
export function remixRepoMdRoute(options = {}) {
  return {
    loader: remixRepoMdLoader(options),
    // Meta function to prevent indexing of media routes
    meta: () => [
      { name: 'robots', content: 'noindex, nofollow' }
    ],
  };
}