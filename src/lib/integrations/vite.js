/**
 * Vite integration for RepoMD
 * Provides proxy configuration for Vite dev server
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { getProjectIdFromEnv } from '../utils/env.js';

/**
 * Create a Vite proxy configuration for RepoMD
 * @param {Object|string} options - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {string} [options.mediaUrlPrefix] - Custom media URL prefix
 * @param {string} [options.r2Url] - Custom R2 URL
 * @param {number} [options.cacheMaxAge] - Cache max age in seconds
 * @param {boolean} [options.debug] - Enable debug logging
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
    r2Url: config.r2Url,
    cacheMaxAge: config.cacheMaxAge,
    debug: config.debug,
  });
  
  return proxyConfig.toViteConfig();
}

/**
 * Create a Vite plugin for RepoMD (future enhancement)
 * This could provide additional features beyond just proxy
 * @param {Object|string} options - Configuration options or project ID string
 * @returns {Object} Vite plugin object
 */
export function viteRepoMdPlugin(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Vite plugin');
  
  return {
    name: 'vite-plugin-repo-md',
    configureServer(server) {
      // Could add custom middleware here if needed
      if (config.debug) {
        console.log(`RepoMD: Vite plugin loaded for project ${projectId}`);
      }
    },
    config() {
      // Return Vite config with proxy
      const proxyConfig = new UnifiedProxyConfig({
        projectId,
        mediaUrlPrefix: config.mediaUrlPrefix,
        r2Url: config.r2Url,
        cacheMaxAge: config.cacheMaxAge,
        debug: config.debug,
      });
      
      return {
        server: {
          proxy: proxyConfig.toViteConfig()
        }
      };
    }
  };
}