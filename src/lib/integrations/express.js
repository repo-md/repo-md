/**
 * Express integration for RepoMD
 * Provides middleware for Express applications
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { parseMediaPath, proxyFetch, handleProxyError, createResponseHeaders, debugLog } from '../proxy/nodeUtils.js';

/**
 * Create an Express middleware for RepoMD media proxy
 * @param {string} projectId - The RepoMD project ID
 * @param {Object} options - Middleware configuration options
 * @returns {Function} Express middleware function (req, res, next)
 */
export function expressRepoMdMiddleware(projectId, options = {}) {
  const config = new UnifiedProxyConfig({
    projectId,
    ...options,
  });

  return async (req, res, next) => {
    const mediaPath = parseMediaPath(req.url, config.mediaUrlPrefix);
    
    if (!mediaPath) {
      // Not a media request, continue to next middleware
      return next();
    }

    debugLog(config.debug, `Express proxy: ${req.url}`);

    try {
      const targetUrl = config.getTargetUrl(mediaPath);
      
      // Create headers object from request
      const requestHeaders = {};
      Object.entries(req.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'host') {
          requestHeaders[key] = value;
        }
      });

      const response = await proxyFetch(targetUrl, {
        method: req.method,
        headers: requestHeaders,
      });

      const headers = response.ok 
        ? createResponseHeaders(response.headers, config.getCacheHeaders())
        : createResponseHeaders(response.headers, config.getErrorCacheHeaders());

      // Set response headers
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Set status code
      res.status(response.status);

      // Stream the response
      if (response.body) {
        // For Node.js 18+, response.body is a web stream
        // We need to convert it to a Node.js stream
        const reader = response.body.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            res.write(value);
          }
        } finally {
          reader.releaseLock();
        }
        
        res.end();
      } else {
        res.end();
      }
    } catch (error) {
      const errorResponse = handleProxyError(error, config.getErrorCacheHeaders(), config.debug);
      
      Object.entries(errorResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      res.status(errorResponse.status).send(errorResponse.body);
    }
  };
}

/**
 * Create an Express error-handling middleware for RepoMD
 * This can be used after the main middleware to handle any proxy errors
 * @param {Object} options - Error handler configuration options
 * @returns {Function} Express error middleware function (err, req, res, next)
 */
export function expressRepoMdErrorHandler(options = {}) {
  const { debug = false } = options;

  return (err, req, res, next) => {
    // Only handle errors for media requests
    if (!req.url.includes('/_repo/medias/')) {
      return next(err);
    }

    debugLog(debug, 'Express proxy error handler:', err);

    res.status(502).json({
      error: 'Proxy error',
      message: debug ? err.message : 'Failed to fetch media resource',
    });
  };
}