/**
 * Next.js integration for RepoMD
 * Provides middleware and configuration options
 */

import { UnifiedProxyConfig } from '../proxy/UnifiedProxyConfig.js';
import { RepoMD } from '../RepoMd.js';
import { getProjectIdFromEnv } from '../utils/env.js';

/**
 * Create a Next.js middleware handler for RepoMD
 * @param {Object|string} options - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {string} [options.mediaUrlPrefix] - Custom media URL prefix
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Object} Object containing middleware function and config
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
  
  // createNextMiddleware returns both middleware and config
  return repo.createNextMiddleware(config);
}

/**
 * Create a Next.js configuration object for RepoMD
 * @param {Object|string} options - Configuration options or project ID string
 * @param {string} [options.projectId] - RepoMD project ID
 * @param {string} [options.mediaUrlPrefix] - Custom media URL prefix
 * @param {string} [options.r2Url] - Custom R2 URL
 * @param {number} [options.cacheMaxAge] - Cache max age in seconds
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Object} Next.js configuration object with rewrites and headers
 */
export function nextRepoMdConfig(options = {}) {
  const config = typeof options === 'string' 
    ? { projectId: options }
    : options;
    
  const projectId = getProjectIdFromEnv(config.projectId, 'Next.js config');
  const proxyConfig = new UnifiedProxyConfig({
    projectId,
    mediaUrlPrefix: config.mediaUrlPrefix,
    r2Url: config.r2Url,
    cacheMaxAge: config.cacheMaxAge,
    debug: config.debug,
  });
  
  return proxyConfig.toNextConfig();
}

/**
 * Create a complete Next.js configuration with RepoMD proxy
 * This merges RepoMD config with existing Next.js config
 * @param {Object} existingConfig - Existing Next.js configuration
 * @param {Object|string} repoMdOptions - RepoMD options or project ID
 * @returns {Object} Merged Next.js configuration
 */
export function withRepoMd(existingConfig = {}, repoMdOptions = {}) {
  const repoMdConfig = nextRepoMdConfig(repoMdOptions);
  
  return {
    ...existingConfig,
    async rewrites() {
      const existingRewrites = await (existingConfig.rewrites?.() || []);
      const repoMdRewrites = await repoMdConfig.rewrites();
      
      return [
        ...existingRewrites,
        ...repoMdRewrites,
      ];
    },
    async headers() {
      const existingHeaders = await (existingConfig.headers?.() || []);
      const repoMdHeaders = await repoMdConfig.headers();
      
      return [
        ...existingHeaders,
        ...repoMdHeaders,
      ];
    },
  };
}