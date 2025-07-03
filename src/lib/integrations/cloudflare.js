/**
 * Cloudflare Workers integration for RepoMD
 * Provides request handlers for edge deployments
 */

import { RepoMD } from '../RepoMd.js';
import { getProjectIdFromEnv } from '../utils/env.js';

/**
 * Create a Cloudflare Workers request handler for RepoMD
 * @param {Object|string} options - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {boolean} [options.debug] - Enable debug logging
 * @param {boolean} [options.returnNull] - Return null for non-media requests
 * @returns {Function} Cloudflare Workers request handler
 */
export function cloudflareRepoMdHandler(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Cloudflare Workers');
  const repo = new RepoMD({ 
    projectId,
    debug: config.debug,
  });
  
  // Return a handler function that Cloudflare Workers can use
  return async (request) => {
    const response = await repo.handleCloudflareRequest(request);
    if (response) {
      return response;
    }
    
    // If not a media request
    if (config.returnNull) {
      return null; // Let other handlers process it
    }
    
    return new Response('Not Found', { status: 404 });
  };
}

/**
 * Create a Cloudflare Workers fetch handler with additional features
 * @param {Object} options - Configuration options
 * @returns {Object} Object with fetch and scheduled handlers
 */
export function cloudflareRepoMdWorker(options = {}) {
  const handler = cloudflareRepoMdHandler(options);
  
  return {
    // Main fetch handler
    async fetch(request, env, ctx) {
      // Could use env for dynamic configuration
      if (env.REPO_MD_PROJECT_ID && !options.projectId) {
        options.projectId = env.REPO_MD_PROJECT_ID;
      }
      
      return handler(request);
    },
    
    // Scheduled handler for cache warming (future feature)
    async scheduled(event, env, ctx) {
      // Could implement cache warming logic here
      if (options.debug) {
        console.log('RepoMD: Scheduled event triggered');
      }
    },
  };
}

/**
 * Create a Cloudflare Pages function for RepoMD
 * @param {Object|string} options - Configuration options or project ID string
 * @returns {Function} Cloudflare Pages function
 */
export function cloudflareRepoMdPagesFunction(options = {}) {
  const handler = cloudflareRepoMdHandler(options);
  
  // Pages Functions have a different signature
  return async (context) => {
    const { request, env, params, waitUntil, next, data } = context;
    
    // Try RepoMD handler first
    const response = await handler(request);
    if (response) {
      return response;
    }
    
    // If not handled, pass to next middleware
    return next();
  };
}