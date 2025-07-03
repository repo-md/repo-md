/**
 * Nuxt 3 integration for RepoMD
 * Provides both Nitro plugin and Nuxt module approaches
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { parseMediaPath, proxyFetch, handleProxyError, createResponseHeaders, debugLog } from '../proxy/nodeUtils.js';

/**
 * Create a Nuxt/Nitro plugin for RepoMD media proxy
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Plugin configuration options
 * @returns {Function} Nitro plugin function
 */
export function nuxtRepoMdPlugin(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return (nitroApp) => {
    nitroApp.hooks.hook('request', async (event) => {
      const mediaPath = parseMediaPath(event.node.req.url, config.mediaUrlPrefix);
      
      if (!mediaPath) {
        return; // Not a media request, continue normally
      }

      debugLog(config.debug, `Nuxt proxy: ${event.node.req.url}`);

      try {
        const targetUrl = config.getTargetUrl(mediaPath);
        const response = await proxyFetch(targetUrl, {
          method: event.node.req.method,
          headers: event.node.req.headers,
        });

        const headers = response.ok 
          ? createResponseHeaders(response.headers, config.getCacheHeaders())
          : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

        // Set response headers
        Object.entries(headers).forEach(([key, value]) => {
          event.node.res.setHeader(key, value);
        });

        // Set status code
        event.node.res.statusCode = response.status;

        // Stream the response body
        if (response.body) {
          const reader = response.body.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              event.node.res.write(value);
            }
          } finally {
            reader.releaseLock();
          }
        }

        event.node.res.end();
      } catch (error) {
        const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
        
        Object.entries(errorResponse.headers).forEach(([key, value]) => {
          event.node.res.setHeader(key, value);
        });
        
        event.node.res.statusCode = errorResponse.status;
        event.node.res.end(errorResponse.body);
      }
    });
  };
}

/**
 * Create a cached event handler for Nuxt/Nitro
 * This provides edge caching support
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Handler configuration options
 * @returns {Function} Cached event handler
 */
export function nuxtRepoMdCachedHandler(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  // This function should be wrapped with defineCachedEventHandler in user's code
  const handler =
    async (event) => {
      const mediaPath = parseMediaPath(event.node.req.url, config.mediaUrlPrefix);
      
      if (!mediaPath) {
        return null; // Not a media request
      }

      const targetUrl = config.getTargetUrl(mediaPath);
      
      try {
        const response = await proxyFetch(targetUrl, {
          method: event.node.req.method,
          headers: event.node.req.headers,
        });

        const body = await response.arrayBuffer();
        
        return {
          status: response.status,
          headers: response.ok 
            ? config.getCacheHeaders()
            : config.getErrorCacheHeaders(),
          body: Buffer.from(body),
        };
      } catch (error) {
        const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
        return errorResponse;
      }
    };
  
  // Return handler with cache configuration
  return {
    handler,
    options: {
      maxAge: config.cacheMaxAge,
      name: 'repo-md-media',
      getKey: (event) => event.node.req.url,
    }
  };
}