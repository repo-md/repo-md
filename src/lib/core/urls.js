/**
 * URL and Path handling module for RepoMD
 * Provides utilities for generating URLs and resolving paths
 */

import { LOG_PREFIXES } from '../logger.js';
import { createViteProxy as frameworkCreateViteProxy } from '../frameworkSnipets.js';

const prefix = LOG_PREFIXES.REPO_MD;

// Constants
const R2_DOMAIN = 'https://r2.repo.md';

/**
 * Create a URL generator for a specific project
 * @param {Object} config - Configuration object
 * @param {string} config.orgSlug - Organization slug
 * @param {string} config.projectId - Project ID
 * @param {string} config.activeRev - Active revision ID
 * @param {string} config.rev - Requested revision ID
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - URL generator functions
 */
export function createUrlGenerator(config) {
  const { orgSlug, projectId, activeRev, rev, debug = false } = config;

  /**
   * Get URL for a project resource
   * @param {string} path - Resource path
   * @returns {string} - Full URL
   */
  function getProjectUrl(path = '') {
    const url = `${R2_DOMAIN}/${orgSlug}/${projectId}${path}`;
    if (debug) {
      console.log(`${prefix} 🔗 Generated project URL: ${url}`);
    }
    return url;
  }

  /**
   * Get URL for a revision-specific resource
   * @param {string} path - Resource path
   * @returns {string} - Full URL
   */
  function getRevisionUrl(path = '') {
    const resolvedRev = rev === 'latest' ? activeRev : rev;
    const url = getProjectUrl('/' + resolvedRev + path);
    
    if (debug) {
      console.log(`${prefix} 🔗 Generated revision URL: ${url}`);
    }
    return url;
  }

  /**
   * Get URL for a media asset
   * @param {string} path - Media path
   * @returns {string} - Full URL
   */
  function getMediaUrl(path) {
    // https://r2.repo.md/iplanwebsites/680e97604a0559a192640d2c/_shared/medias/9ad367214fab7207e61dbea46f32e9943d55b7e8cefb55e02f57e06f0db6dd0f-sm.jpeg
    const url = getProjectUrl(`/_shared/medias/${path}`);
    
    if (debug) {
      console.log(`${prefix} 🔗 Generated media URL: ${url}`);
    }
    return url;
  }

  /**
   * Get URL for the SQLite database
   * @returns {string} - Full URL
   */
  function getSqliteUrl() {
    return getRevisionUrl('/content.sqlite');
  }

  /**
   * Create a Vite proxy configuration for the project
   * @param {string} orgSlug - Organization slug
   * @param {string} projectId - Project ID
   * @param {string} folder - Folder name for proxy path
   * @returns {Object} - Vite proxy configuration
   */
  function createViteProxy(orgSlug, projectId, folder = '_repo') {
    return frameworkCreateViteProxy(orgSlug, projectId, folder);
  }

  return {
    getProjectUrl,
    getRevisionUrl,
    getMediaUrl,
    getSqliteUrl,
    createViteProxy,
  };
}