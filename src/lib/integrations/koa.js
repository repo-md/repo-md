/**
 * Koa integration for RepoMD
 * Provides middleware for Koa applications
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { parseMediaPath, proxyFetch, handleProxyError, createResponseHeaders, debugLog } from '../proxy/nodeUtils.js';

/**
 * Create a Koa middleware for RepoMD media proxy
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Middleware configuration options
 * @returns {Function} Koa middleware function
 */
export function koaRepoMdMiddleware(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async (ctx, next) => {
    const mediaPath = parseMediaPath(ctx.url, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      // Not a media request, continue to next middleware
      await next();
      return;
    }

    debugLog(config.debug, `Koa proxy: ${ctx.url}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      
      // Create headers object from request
      const requestHeaders = {};
      for (const [key, value] of Object.entries(ctx.headers)) {
        if (key.toLowerCase() !== 'host') {
          requestHeaders[key] = value;
        }
      }

      const response = await proxyFetch(targetUrl, {
        method: ctx.method,
        headers: requestHeaders,
      });

      const headers = response.ok 
        ? createResponseHeaders(response.headers, config.getCacheHeaders())
        : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

      // Set response headers
      for (const [key, value] of Object.entries(headers)) {
        ctx.set(key, value);
      }

      // Set status code
      ctx.status = response.status;

      // Stream the response
      if (response.body) {
        // For Node.js 18+, response.body is a web stream
        // We need to convert it to a readable buffer
        const reader = response.body.getReader();
        const chunks = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          // Set body as buffer
          ctx.body = Buffer.concat(chunks);
        } finally {
          reader.releaseLock();
        }
      } else {
        ctx.body = null;
      }
    } catch (error) {
      const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
      
      for (const [key, value] of Object.entries(errorResponse.headers)) {
        ctx.set(key, value);
      }
      
      ctx.status = errorResponse.status;
      ctx.body = errorResponse.body;
    }
  };
}

/**
 * Create a Koa middleware that supports streaming responses
 * This version is more efficient for large files
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Middleware configuration options
 * @returns {Function} Koa middleware function with streaming support
 */
export function koaRepoMdStreamingMiddleware(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async (ctx, next) => {
    const mediaPath = parseMediaPath(ctx.url, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      await next();
      return;
    }

    debugLog(config.debug, `Koa proxy (streaming): ${ctx.url}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      
      // Create headers object from request
      const requestHeaders = {};
      for (const [key, value] of Object.entries(ctx.headers)) {
        if (key.toLowerCase() !== 'host') {
          requestHeaders[key] = value;
        }
      }

      const response = await proxyFetch(targetUrl, {
        method: ctx.method,
        headers: requestHeaders,
      });

      const headers = response.ok 
        ? createResponseHeaders(response.headers, config.getCacheHeaders())
        : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

      // Set response headers
      for (const [key, value] of Object.entries(headers)) {
        ctx.set(key, value);
      }

      // Set status code
      ctx.status = response.status;

      // For streaming, we need to create a Node.js readable stream
      if (response.body) {
        const { Readable } = await import('node:stream');
        const reader = response.body.getReader();
        
        ctx.body = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
                reader.releaseLock();
              } else {
                this.push(Buffer.from(value));
              }
            } catch (error) {
              this.destroy(error);
              reader.releaseLock();
            }
          }
        });
      } else {
        ctx.body = null;
      }
    } catch (error) {
      const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
      
      for (const [key, value] of Object.entries(errorResponse.headers)) {
        ctx.set(key, value);
      }
      
      ctx.status = errorResponse.status;
      ctx.body = errorResponse.body;
    }
  };
}