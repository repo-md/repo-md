/**
 * URL and Path handling module for RepoMD
 * Provides utilities for generating URLs and resolving paths
 */

import { LOG_PREFIXES } from "../logger.js";
import { createViteProxy as frameworkCreateViteProxy } from "../frameworkSnipets.js";

const prefix = LOG_PREFIXES.REPO_MD;

// Constants
const R2_DOMAIN = "https://static.repo.md"; // 

/**
 * Create a URL generator for a specific project
 * @param {Object} config - Configuration object
 * @param {string} config.orgSlug - Organization slug
 * @param {string} config.projectId - Project ID
 * @param {string} config.activeRev - Active revision ID
 * @param {string} config.rev - Requested revision ID
 * @param {Function} config.resolveLatestRev - Function to resolve the latest revision
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - URL generator functions
 */
export function createUrlGenerator(config) {
  const {
    orgSlug,
    projectId,
    activeRev: initialActiveRev, // Rename to make it clear this is initial value
    rev,
    resolveLatestRev,
    debug = false,
  } = config;

  // Create a mutable state variable for the active revision
  let activeRevState = initialActiveRev;

  /**
   * Get URL for a project resource
   * @param {string} path - Resource path
   * @returns {string} - Full URL
   */
  function getProjectUrl(path = "") {
    const url = `${R2_DOMAIN}/${orgSlug}/${projectId}${path}`;
    if (debug) {
      console.log(`${prefix} 🔗 Generated project URL: ${url}`);
    }
    return url;
  }

  /**
   * Get URL for a revision-specific resource, resolving "latest" revision if needed
   * @param {string} path - Resource path
   * @returns {Promise<string>} - Full URL
   */
  async function getRevisionUrl(path = "") {
    // If we have a specific revision (not "latest"), use it directly
    if (rev !== "latest") {
      const url = getProjectUrl("/" + rev + path);
      if (debug) {
        console.log(
          `${prefix} 🔗 Generated revision URL with specific rev: ${url}`
        );
      }
      return url;
    }

    // If we already have the active revision, use it
    if (activeRevState) {
      const url = getProjectUrl("/" + activeRevState + path);
      if (debug) {
        console.log(
          `${prefix} 🔗 Generated revision URL with cached activeRev: ${url}`
        );
      }
      return url;
    }

    // If we need to resolve the latest revision
    if (debug) {
      console.log(`${prefix} 🔄 Resolving latest revision for URL generation`);
    }

    // Call the provided resolver function
    let resolvedRev;
    try {
      resolvedRev = await resolveLatestRev();

      if (!resolvedRev) {
        throw new Error(
          `Failed to resolve latest revision for URL generation - received empty revision`
        );
      }

      // Update our state variable instead of trying to modify the constant parameter
      activeRevState = resolvedRev;
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error resolving revision: ${error.message}`
        );
      }
      throw error;
    }

    const url = getProjectUrl("/" + resolvedRev + path);

    if (debug) {
      console.log(
        `${prefix} 🔗 Generated revision URL with resolved rev (${resolvedRev}): ${url}`
      );
    }

    return url;
  }

  /**
   * Get URL for a media asset
   * @param {string} path - Media path
   * @returns {string} - Full URL
   */
  function getMediaUrl(path) {
    // https://static.repo.md/iplanwebsites/680e97604a0559a192640d2c/_shared/medias/9ad367214fab7207e61dbea46f32e9943d55b7e8cefb55e02f57e06f0db6dd0f-sm.jpeg
    const url = getProjectUrl(`/_shared/medias/${path}`);

    if (debug) {
      console.log(`${prefix} 🔗 Generated media URL: ${url}`);
    }
    return url;
  }
 
  /**
   * Get URL for the SQLite database
   * @returns {Promise<string>} - Full URL
   */
  async function getSqliteUrl() {
    return await getRevisionUrl("/content.sqlite");
  }

  /**
   * Create a Vite proxy configuration for the project
   * @param {string} orgSlug - Organization slug
   * @param {string} projectId - Project ID
   * @param {string} folder - Folder name for proxy path
   * @returns {Object} - Vite proxy configuration
   */
  function createViteProxy(orgSlug, projectId, folder = "_repo") {
    return frameworkCreateViteProxy(orgSlug, projectId, folder);
  }

  /**
   * Get URL for a shared folder resource (not revision-specific)
   * @param {string} path - Resource path within the shared folder
   * @returns {string} - Full URL
   */
  function getSharedFolderUrl(path = "") {
    const url = getProjectUrl(`/_shared${path}`);
    
    if (debug) {
      console.log(`${prefix} 🔗 Generated shared folder URL: ${url}`);
    }
    return url;
  }

  return {
    getProjectUrl,
    getRevisionUrl,
    getMediaUrl,
    getSqliteUrl,
    getSharedFolderUrl,
    createViteProxy,
    // Expose method to get the current active revision
    getActiveRevState: () => activeRevState,
  };
}