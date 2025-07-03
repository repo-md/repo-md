/**
 * Astro integration for RepoMD
 * Provides both middleware and integration approaches
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { parseMediaPath, proxyFetch, handleProxyError, createResponseHeaders, debugLog } from '../proxy/nodeUtils.js';

/**
 * Create an Astro middleware for RepoMD media proxy
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Middleware configuration options
 * @returns {Function} Astro middleware function
 */
export function astroRepoMdMiddleware(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async (context, next) => {
    const { request, url } = context;
    const mediaPath = parseMediaPath(url.pathname, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      // Not a media request, continue to next middleware
      return next();
    }

    debugLog(config.debug, `Astro proxy: ${url.pathname}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      const response = await proxyFetch(targetUrl, {
        method: request.method,
        headers: request.headers,
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
 * Create an Astro integration for RepoMD
 * This adds Vite configuration for dev server support
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Integration configuration options
 * @returns {Object} Astro integration object
 */
export function astroRepoMdIntegration(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return {
    name: 'repo-md-proxy',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        // Add Vite proxy configuration for dev server
        updateConfig({
          vite: {
            server: {
              proxy: config.toViteConfig(),
            },
          },
        });
      },
      'astro:server:setup': ({ server }) => {
        // Log when dev server starts with proxy
        if (config.debug) {
          console.log(`RepoMD proxy enabled for project: ${config.projectId}`);
          console.log(`Media URL prefix: ${config.mediaUrlPrefix}`);
        }
      },
    },
  };
}

/**
 * Create an Astro integration with middleware support
 * This combines both dev server proxy and production middleware
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Integration configuration options
 * @returns {Object} Astro integration object with middleware
 */
export function astroRepoMdFullIntegration(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  const middleware = astroRepoMdMiddleware(projectId, options);

  return {
    name: 'repo-md-proxy-full',
    hooks: {
      'astro:config:setup': ({ updateConfig, injectScript }) => {
        // Add Vite proxy configuration for dev server
        updateConfig({
          vite: {
            server: {
              proxy: config.toViteConfig(),
            },
          },
        });

        // Note: Middleware should be manually added to src/middleware.js
        // as Astro doesn't support injecting middleware via integrations yet
        if (config.debug) {
          console.log('RepoMD: Add the following to your src/middleware.js:');
          console.log(`
import { astroRepoMdMiddleware } from 'repo-md';

export const onRequest = astroRepoMdMiddleware('${config.projectId}');
          `);
        }
      },
    },
  };
}