/**
 * Unified proxy configuration system for RepoMD
 * Provides a common interface for all framework proxy implementations
 */

import { LOG_PREFIXES } from '../logger.js';

const prefix = LOG_PREFIXES.REPO_MD;

// Default configuration values
export const REPO_MD_DEFAULTS = {
  mediaUrlPrefix: '/_repo/medias/',
  r2Url: 'https://static.repo.md',
  cacheMaxAge: 31536000, // 1 year in seconds
  debug: false,
  projectPathPrefix: 'projects', // Default path prefix for project resources
};

// Keep internal reference for backward compatibility
const DEFAULTS = REPO_MD_DEFAULTS;

/**
 * Base configuration for all proxy implementations
 */
export class UnifiedProxyConfig {
  constructor({
    projectId,
    mediaUrlPrefix = DEFAULTS.mediaUrlPrefix,
    r2Url = DEFAULTS.r2Url,
    cacheMaxAge = DEFAULTS.cacheMaxAge,
    debug = DEFAULTS.debug,
    projectPathPrefix = DEFAULTS.projectPathPrefix,
  }) {
    if (!projectId) {
      throw new Error('projectId is required for proxy configuration');
    }

    this.projectId = projectId;
    this.mediaUrlPrefix = mediaUrlPrefix;
    this.r2Url = r2Url;
    this.cacheMaxAge = cacheMaxAge;
    this.debug = debug;
    this.projectPathPrefix = projectPathPrefix;

    // Remove trailing slash from URLs
    this.mediaUrlPrefix = this.mediaUrlPrefix.replace(/\/$/, '');
    this.r2Url = this.r2Url.replace(/\/$/, '');
  }

  /**
   * Get the target URL for a given media path
   * @param {string} mediaPath - The media file path
   * @returns {string} The full CDN URL
   */
  getTargetUrl(mediaPath) {
    // Remove leading slash if present
    const cleanPath = mediaPath.replace(/^\//, '');
    return `${this.r2Url}/${this.projectPathPrefix}/${this.projectId}/_shared/medias/${cleanPath}`;
  }

  /**
   * Get the source pattern for matching requests
   * @returns {string} The pattern to match incoming requests
   */
  getSourcePattern() {
    return `${this.mediaUrlPrefix}/:path*`;
  }

  /**
   * Get cache headers for successful responses
   * @returns {Object} Headers object
   */
  getCacheHeaders() {
    return {
      'Cache-Control': `public, max-age=${this.cacheMaxAge}, immutable`,
      'X-Repo-Proxy': 'true',
    };
  }

  /**
   * Get error cache headers
   * @returns {Object} Headers object for error responses
   */
  getErrorCacheHeaders() {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Expires': '0',
      'Pragma': 'no-cache',
    };
  }

  /**
   * Log a debug message if debug mode is enabled
   * @param {string} message - The message to log
   */
  log(message) {
    if (this.debug) {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Create a Vite proxy configuration
   * @returns {Object} Vite proxy config
   */
  toViteConfig() {
    const proxyPath = this.mediaUrlPrefix;
    
    return {
      [proxyPath]: {
        target: this.r2Url,
        changeOrigin: true,
        rewrite: (path) => {
          const rewritten = path.replace(proxyPath, `/projects/${this.projectId}/_shared/medias`);
          this.log(`Vite proxy rewrite: ${path} → ${rewritten}`);
          return rewritten;
        },
        configure: (proxy) => {
          if (this.debug) {
            proxy.on('error', (err, req) => {
              console.error(`${prefix} Vite proxy error:`, err, req.url);
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              this.log(`Vite proxy request: ${req.url} → ${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              this.log(`Vite proxy response: ${proxyRes.statusCode} for ${req.url}`);
            });
          }
        },
      },
    };
  }

  /**
   * Create a Next.js rewrite configuration
   * @returns {Object} Next.js config object
   */
  toNextConfig() {
    return {
      async rewrites() {
        return [
          {
            source: `${this.mediaUrlPrefix}:path*`,
            destination: `${this.r2Url}/projects/${this.projectId}/_shared/medias/:path*`,
          },
        ];
      },
      async headers() {
        return [
          {
            source: `${this.mediaUrlPrefix}:path*`,
            headers: Object.entries(this.getCacheHeaders()).map(([key, value]) => ({
              key,
              value: String(value),
            })),
          },
        ];
      },
    };
  }

  /**
   * Create a Remix loader configuration
   * @returns {Function} Remix loader function
   */
  toRemixLoader() {
    return async ({ request }) => {
      const url = new URL(request.url);
      
      if (!url.pathname.startsWith(this.mediaUrlPrefix)) {
        return null;
      }

      const mediaPath = url.pathname.replace(this.mediaUrlPrefix, '');
      const targetUrl = this.getTargetUrl(mediaPath);

      this.log(`Remix proxy: ${url.pathname} → ${targetUrl}`);

      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
        });

        const headers = new Headers(response.headers);
        
        if (response.ok) {
          for (const [key, value] of Object.entries(this.getCacheHeaders())) {
            headers.set(key, value);
          }
        } else {
          for (const [key, value] of Object.entries(this.getErrorCacheHeaders())) {
            headers.set(key, value);
          }
        }

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (error) {
        if (this.debug) {
          console.error(`${prefix} Remix proxy error:`, error);
        }
        
        const headers = new Headers(this.getErrorCacheHeaders());
        headers.set('Content-Type', 'text/plain');
        
        return new Response('Proxy error', {
          status: 502,
          headers,
        });
      }
    };
  }

  /**
   * Get generic framework configuration instructions
   * @param {string} framework - The framework name
   * @returns {string} Configuration instructions
   */
  getFrameworkInstructions(framework) {
    const instructions = {
      vite: `// vite.config.js
import { defineConfig } from 'vite';
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: '${this.projectId}' });
const proxyConfig = repo.getUnifiedProxyConfig();

export default defineConfig({
  server: {
    proxy: proxyConfig.toViteConfig()
  }
});`,

      nextjs: `// next.config.js
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: '${this.projectId}' });
const proxyConfig = repo.getUnifiedProxyConfig();

export default {
  ...proxyConfig.toNextConfig()
};`,

      remix: `// app/routes/$.tsx
import { RepoMD } from 'repo-md';

const repo = new RepoMD({ projectId: '${this.projectId}' });
const proxyConfig = repo.getUnifiedProxyConfig();

export const loader = proxyConfig.toRemixLoader();`,

      vue: `// vue.config.js
const { RepoMD } = require('repo-md');

const repo = new RepoMD({ projectId: '${this.projectId}' });
const proxyConfig = repo.getUnifiedProxyConfig();

module.exports = {
  devServer: {
    proxy: proxyConfig.toViteConfig()
  }
};`,
    };

    return instructions[framework.toLowerCase()] || 'Framework not supported';
  }
}

/**
 * Factory function to create a unified proxy configuration
 * @param {Object} config - Configuration options
 * @returns {UnifiedProxyConfig} Configured proxy instance
 */
export function createUnifiedProxyConfig(config) {
  return new UnifiedProxyConfig(config);
}