/**
 * Next.js middleware integration for RepoMD
 * Handles proxying of _repo/medias/* requests to the RepoMD CDN
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';

export class RepoNextMiddleware {
  constructor(options) {
    // Let UnifiedProxyConfig handle all defaults
    this.config = new UnifiedProxyConfig(options);
  }

  /**
   * Handle the middleware request
   * @param {any} request - NextRequest from next/server
   * @returns {Promise<Response | any>}
   */
  async handle(request) {
    const url = request.nextUrl;
    
    // Check if this is a repo media request
    if (!url.pathname.startsWith(this.config.mediaUrlPrefix)) {
      // Try to get NextResponse from global scope (provided by Next.js runtime)
      if (typeof NextResponse !== 'undefined') {
        return NextResponse.next();
      }
      // Fallback for non-Next.js environments
      return new Response(null, { status: 404 });
    }

    // Extract the media path
    const mediaPath = url.pathname.replace(this.config.mediaUrlPrefix, '');
    const targetUrl = this.config.getTargetUrl(mediaPath);
    
    this.config.log(`Next.js middleware proxying: ${url.pathname} → ${targetUrl}`);
    
    try {
      // Proxy the request to the CDN
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
      });
      
      // Create a new response with the proxied content
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      
      // Add appropriate cache headers
      const cacheHeaders = response.ok 
        ? this.config.getCacheHeaders() 
        : this.config.getErrorCacheHeaders();
      
      for (const [key, value] of Object.entries(cacheHeaders)) {
        modifiedResponse.headers.set(key, value);
      }
      
      return modifiedResponse;
    } catch (error) {
      this.config.log(`Next.js middleware proxy error: ${error.message}`);
      
      const headers = new Headers(this.config.getErrorCacheHeaders());
      headers.set('Content-Type', 'text/plain');
      
      return new Response('Proxy error', { 
        status: 502,
        headers,
      });
    }
  }

  /**
   * Get the matcher config for Next.js middleware
   * @param {string} prefix - URL prefix to match
   * @returns {string}
   */
  static getMatcher(prefix = '/_repo') {
    return `${prefix}/:path*`;
  }
}

/**
 * Factory function to create a configured middleware handler
 * @param {Object} config
 * @param {string} config.projectId - The RepoMD project ID
 * @param {string} [config.mediaUrlPrefix] - URL prefix for media requests
 * @param {string} [config.r2Url] - The R2/CDN URL
 * @param {boolean} [config.debug] - Enable debug logging
 * @returns {(request: any) => Promise<Response>}
 */
export function createRepoMiddleware(config) {
  const middleware = new RepoNextMiddleware(config);
  return (request) => middleware.handle(request);
}