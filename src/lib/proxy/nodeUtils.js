/**
 * Shared utilities for Node.js framework integrations
 */

import { LOG_PREFIXES } from '../logger.js';

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Parse request URL to extract media path
 * @param {string} url - The request URL
 * @param {string} mediaUrlPrefix - The media URL prefix
 * @returns {string|null} The media path or null if not a media request
 */
export function parseMediaPath(url, mediaUrlPrefix) {
  try {
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    
    if (!pathname.startsWith(mediaUrlPrefix)) {
      return null;
    }
    
    return pathname.slice(mediaUrlPrefix.length);
  } catch (error) {
    return null;
  }
}

/**
 * Create response headers with caching
 * @param {Headers|Object} originalHeaders - Original response headers
 * @param {Object} cacheHeaders - Cache headers to apply
 * @returns {Object} Combined headers object
 */
export function createResponseHeaders(originalHeaders, cacheHeaders) {
  const headers = {};
  
  // Copy original headers
  if (originalHeaders instanceof Headers) {
    originalHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (originalHeaders) {
    Object.assign(headers, originalHeaders);
  }
  
  // Apply cache headers
  Object.assign(headers, cacheHeaders);
  
  return headers;
}

/**
 * Handle proxy error response
 * @param {Error} error - The error that occurred
 * @param {Object} errorCacheHeaders - Error cache headers
 * @param {boolean} debug - Debug mode flag
 * @returns {Object} Error response object with status, headers, and body
 */
export function handleProxyError(error, errorCacheHeaders, debug) {
  if (debug) {
    console.error(`${prefix} Proxy error:`, error);
  }
  
  const headers = {
    ...errorCacheHeaders,
    'Content-Type': 'text/plain',
  };
  
  return {
    status: 502,
    headers,
    body: 'Proxy error',
  };
}

/**
 * Stream response body for better performance
 * @param {Response} response - The fetch response
 * @param {Object} targetResponse - The target response object (varies by framework)
 * @param {string} framework - The framework name for specific handling
 */
export async function streamResponse(response, targetResponse, framework) {
  if (!response.body) {
    return;
  }
  
  switch (framework) {
    case 'express':
      // Express: pipe directly
      response.body.pipe(targetResponse);
      break;
      
    case 'fastify':
      // Fastify: use reply.send with stream
      targetResponse.send(response.body);
      break;
      
    case 'koa':
      // Koa: set body to stream
      targetResponse.body = response.body;
      break;
      
    default: {
      // Generic: read and write chunks
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          if (typeof targetResponse.write === 'function') {
            targetResponse.write(value);
          }
        }
      } finally {
        reader.releaseLock();
        if (typeof targetResponse.end === 'function') {
          targetResponse.end();
        }
      }
    }
  }
}

/**
 * Check if the request is for a media file
 * @param {string} url - The request URL
 * @param {string} mediaUrlPrefix - The media URL prefix
 * @returns {boolean} True if it's a media request
 */
export function isMediaRequest(url, mediaUrlPrefix) {
  return parseMediaPath(url, mediaUrlPrefix) !== null;
}

/**
 * Create a fetch request for proxying
 * @param {string} targetUrl - The target URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export async function proxyFetch(targetUrl, options = {}) {
  const fetchOptions = {
    method: options.method || 'GET',
    headers: options.headers || {},
    redirect: 'follow',
  };
  
  // Remove host header to avoid conflicts
  const cleanHeaders = { ...fetchOptions.headers };
  if ('host' in cleanHeaders) {
    cleanHeaders.host = undefined;
  }
  fetchOptions.headers = cleanHeaders;
  
  return await fetch(targetUrl, fetchOptions);
}

/**
 * Log debug information if debug mode is enabled
 * @param {boolean} debug - Debug mode flag
 * @param {string} message - The message to log
 * @param {...any} args - Additional arguments to log
 */
export function debugLog(debug, message, ...args) {
  if (debug) {
    console.log(`${prefix} ${message}`, ...args);
  }
}