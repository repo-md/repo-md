/**
 * SvelteKit integration for RepoMD
 * Provides handle functions for hooks.server.js
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { parseMediaPath, proxyFetch, handleProxyError, createResponseHeaders, debugLog } from '../proxy/nodeUtils.js';

/**
 * Create a SvelteKit handle function for RepoMD media proxy
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Handle configuration options
 * @returns {Function} SvelteKit handle function
 */
export function svelteKitRepoMdHandle(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async ({ event, resolve }) => {
    const mediaPath = parseMediaPath(event.url.pathname, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      // Not a media request, continue with normal handling
      return resolve(event);
    }

    debugLog(config.debug, `SvelteKit proxy: ${event.url.pathname}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      const response = await proxyFetch(targetUrl, {
        method: event.request.method,
        headers: event.request.headers,
      });

      const headers = response.ok 
        ? createResponseHeaders(response.headers, config.getCacheHeaders())
        : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

      // Convert headers object to Headers instance
      const responseHeaders = new Headers();
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
      
      const errorHeaders = new Headers();
      Object.entries(errorResponse.headers).forEach(([key, value]) => {
        errorHeaders.set(key, value);
      });

      return new Response(errorResponse.body, {
        status: errorResponse.status,
        headers: errorHeaders,
      });
    }
  };
}

/**
 * Create a SvelteKit handle function that can be sequenced with other handlers
 * This version returns early for non-media requests to work well with sequence()
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Handle configuration options
 * @returns {Function} SvelteKit handle function for use with sequence()
 */
export function svelteKitRepoMdSequenceHandle(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async ({ event, resolve }) => {
    const mediaPath = parseMediaPath(event.url.pathname, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      // Not a media request, pass through
      return resolve(event);
    }

    // Handle media request
    debugLog(config.debug, `SvelteKit proxy (sequence): ${event.url.pathname}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      const response = await proxyFetch(targetUrl, {
        method: event.request.method,
        headers: event.request.headers,
      });

      const headers = response.ok 
        ? createResponseHeaders(response.headers, config.getCacheHeaders())
        : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

      const responseHeaders = new Headers();
      Object.entries(headers).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
      
      const errorHeaders = new Headers();
      Object.entries(errorResponse.headers).forEach(([key, value]) => {
        errorHeaders.set(key, value);
      });

      return new Response(errorResponse.body, {
        status: errorResponse.status,
        headers: errorHeaders,
      });
    }
  };
}