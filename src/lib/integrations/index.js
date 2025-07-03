/**
 * Simplified framework integrations for RepoMD
 * Provides zero-config and minimal-config options for common frameworks
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { RepoMD } from '../RepoMd.js';
import { getProjectIdFromEnv } from '../utils/env.js';

/**
 * Auto-detect the current framework/environment
 * @returns {string|null} The detected framework name
 */
function detectFramework() {
  // Check for framework-specific globals or environment variables
  if (typeof process !== 'undefined' && process.env) {
    // Next.js detection
    if (process.env.NEXT_RUNTIME || process.env.__NEXT_PRIVATE_PREBUNDLED_REACT) {
      return 'nextjs';
    }
    
    // Vite detection
    if (process.env.VITE || typeof import.meta !== 'undefined' && import.meta.env?.VITE) {
      return 'vite';
    }
    
    // Remix detection
    if (process.env.REMIX_DEV_SERVER_WS_PORT) {
      return 'remix';
    }
  }
  
  // Browser-based detection
  if (typeof window !== 'undefined') {
    // Vue detection
    if (window.Vue || window.__VUE__) {
      return 'vue';
    }
    
    // React detection (less reliable, as React doesn't set global markers)
    if (window.React || document.querySelector('[data-reactroot]')) {
      return 'react';
    }
  }
  
  return null;
}


/**
 * Universal proxy configuration getter
 * Works with any framework by returning the appropriate configuration
 * 
 * @param {Object|string} [options] - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {string} [options.framework] - Override auto-detected framework
 * @param {string} [options.mediaUrlPrefix] - Custom media URL prefix
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Object} Framework-specific configuration object
 */
export function repoMdProxy(options = {}) {
  // Allow simple string parameter for project ID
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
  
  const projectId = getProjectIdFromEnv(config.projectId, 'auto-detect proxy');
  const framework = config.framework || detectFramework();
  
  // Create the proxy configuration
  const proxyConfig = new UnifiedProxyConfig({
    projectId,
    mediaUrlPrefix: config.mediaUrlPrefix,
    debug: config.debug,
  });
  
  // Return framework-specific configuration
  switch (framework) {
    case 'vite':
    case 'vue':
      return proxyConfig.toViteConfig();
      
    case 'nextjs':
      // For Next.js, return the config object (not the full next.config.js)
      return proxyConfig.toNextConfig();
      
    case 'remix':
      return proxyConfig.toRemixLoader();
      
    default:
      // Return a generic object with all configurations
      return {
        vite: proxyConfig.toViteConfig(),
        next: proxyConfig.toNextConfig(),
        remix: proxyConfig.toRemixLoader(),
        // Helper to manually get proxy config
        getConfig: () => proxyConfig,
        // Framework detection failed message
        _warning: framework 
          ? `Unknown framework: ${framework}` 
          : 'Could not auto-detect framework. Use config.vite, config.next, or config.remix',
      };
  }
}

/**
 * Vite-specific integration
 * @param {Object|string} [options] - Configuration options or project ID
 * @returns {Object} Vite server proxy configuration
 */
export function viteRepoMdProxy(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Vite proxy');
  const proxyConfig = new UnifiedProxyConfig({
    projectId,
    mediaUrlPrefix: config.mediaUrlPrefix,
    debug: config.debug,
  });
  
  return proxyConfig.toViteConfig();
}

/**
 * Next.js middleware creator
 * @param {Object|string} [options] - Configuration options or project ID
 * @returns {Object} Next.js middleware object with middleware function and config
 */
export function nextRepoMdMiddleware(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Next.js middleware');
  const repo = new RepoMD({ 
    projectId,
    debug: config.debug,
  });
  
  const middleware = repo.createNextMiddleware(config);
  
  // Return both middleware and config
  return {
    middleware,
    config: {
      matcher: config.mediaUrlPrefix 
        ? `${config.mediaUrlPrefix}:path*`
        : '/_repo/:path*'
    }
  };
}

/**
 * Next.js config helper
 * @param {Object|string} [options] - Configuration options or project ID
 * @returns {Object} Next.js configuration object
 */
export function nextRepoMdConfig(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Next.js config');
  const proxyConfig = new UnifiedProxyConfig({
    projectId,
    mediaUrlPrefix: config.mediaUrlPrefix,
    debug: config.debug,
  });
  
  return proxyConfig.toNextConfig();
}

/**
 * Remix loader creator
 * @param {Object|string} [options] - Configuration options or project ID
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
    debug: config.debug,
  });
  
  return proxyConfig.toRemixLoader();
}

/**
 * Create a RepoMD instance with environment-based configuration
 * @param {Object} [options] - Optional configuration overrides
 * @returns {RepoMD} Configured RepoMD instance
 */
export function createRepoMd(options = {}) {
  const projectId = options.projectId || getProjectIdFromEnv();
  
  return new RepoMD({
    projectId,
    ...options,
  });
}


// Re-export the main class for convenience
export { RepoMD };