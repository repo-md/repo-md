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
 * @param {string} config.projectId - Project ID
 * @param {string} config.activeRev - Active revision ID
 * @param {string} config.rev - Requested revision ID
 * @param {Function} config.resolveLatestRev - Function to resolve the latest revision
 * @param {boolean} config.debug - Whether to log debug info
 * @param {number} config.revCacheExpirySeconds - Revision cache expiry time in seconds
 * @param {boolean} config.debug_rev_caching - Whether to log revision caching debug info
 * @returns {Object} - URL generator functions
 */
export function createUrlGenerator(config) {
  const {
    projectId,
    activeRev: initialActiveRev, // Rename to make it clear this is initial value
    rev,
    resolveLatestRev,
    debug = false,
    revCacheExpirySeconds = 300,
    debug_rev_caching = false,
  } = config;

  // Create a mutable state variable for the active revision
  let activeRevState = initialActiveRev;

  // Calculate expiry time in milliseconds
  const REV_EXPIRY_MS = revCacheExpirySeconds * 1000;

  // Revision cache state for "latest" revision expiry tracking
  let revisionCacheState = {
    value: initialActiveRev,
    timestamp: initialActiveRev ? Date.now() : 0,
    latestRevCacheExpiry: () => {
      // Only check expiry for "latest" revision
      if (rev !== "latest") return false;
      return Date.now() - revisionCacheState.timestamp > REV_EXPIRY_MS;
    },
  };

  if (debug_rev_caching) {
    console.log(
      `${prefix} 🕐🕐🕐🕐🕐 URL Generator revision cache configured for ${revCacheExpirySeconds} seconds (${REV_EXPIRY_MS}ms) - checks on R2 requests only`
    );
    console.log(`${prefix} 🕐🕐🕐🕐🕐 Received revCacheExpirySeconds parameter: ${revCacheExpirySeconds} (from config)`);
  }

  /**
   * Get URL for a project resource
   * @param {string} path - Resource path
   * @returns {string} - Full URL
   */
  function getProjectUrl(path = "") {
    const url = `${R2_DOMAIN}/projects/${projectId}${path}`;
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
      if (debug_rev_caching) {
        console.log(
          `${prefix} 🕐🕐🕐🕐🕐 Using specific revision: ${rev} (no cache expiry for R2 URL)`
        );
      }
      const url = getProjectUrl(`/${rev}${path}`);
      if (debug) {
        console.log(
          `${prefix} 🔗 Generated revision URL with specific rev: ${url}`
        );
      }
      return url;
    }

    // For "latest" revision, check if we have a cached value and if it's expired
    if (activeRevState && revisionCacheState.value) {
      // Check if the cached revision is expired
      if (revisionCacheState.latestRevCacheExpiry()) {
        if (debug_rev_caching) {
          console.log(
            `${prefix} 🕐🕐🕐🕐🕐 Cached "latest" revision expired for R2 URL, triggering background revalidation (stale: ${activeRevState})`
          );
        }

        // Store the old revision to compare for cache invalidation
        const oldRev = activeRevState;

        // Trigger background revalidation (don't await it)
        resolveLatestRev()
          .then((newRev) => {
            if (newRev && newRev !== oldRev) {
              // Update both state variables
              activeRevState = newRev;
              revisionCacheState = {
                value: newRev,
                timestamp: Date.now(),
                latestRevCacheExpiry: () => {
                  if (rev !== "latest") return false;
                  return (
                    Date.now() - revisionCacheState.timestamp > REV_EXPIRY_MS
                  );
                },
              };

              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Background revalidation complete for R2 URLs, new rev: ${newRev}`
                );
              }

              // If revision changed, log cache invalidation warning
              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Revision changed from ${oldRev} to ${newRev} - R2 JSON files cached with old revision may be stale`
                );
              }
            } else if (newRev === oldRev) {
              // Same revision, just update the timestamp
              revisionCacheState.timestamp = Date.now();
              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Background revalidation complete for R2 URLs, revision unchanged: ${newRev}`
                );
              }
            }
          })
          .catch((err) => {
            if (debug_rev_caching) {
              console.error(
                `${prefix} 🕐🕐🕐🕐🕐 Background revalidation error for R2 URLs: ${err.message}`
              );
            }
          });

        // Return URL with stale revision for this request (stale-while-revalidate)
        const url = getProjectUrl(`/${activeRevState}${path}`);
        if (debug) {
          console.log(
            `${prefix} 🔗 Generated revision URL with stale activeRev (revalidating in bg): ${url}`
          );
        }
        return url;
      }

      // Not expired, use cached revision
      if (debug_rev_caching) {
        console.log(
          `${prefix} 🕐🕐🕐🕐🕐 Using cached "latest" revision for R2 URL (not expired): ${activeRevState}`
        );
      }
      const url = getProjectUrl(`/${activeRevState}${path}`);
      if (debug) {
        console.log(
          `${prefix} 🔗 Generated revision URL with cached activeRev: ${url}`
        );
      }
      return url;
    }

    // No cached revision, need to resolve it
    if (debug_rev_caching) {
      console.log(
        `${prefix} 🕐🕐🕐🕐🕐 No cached "latest" revision for R2 URL, resolving now`
      );
    }
    if (debug) {
      console.log(`${prefix} 🔄 Resolving latest revision for URL generation`);
    }

    // Call the provided resolver function
    let resolvedRev;
    try {
      resolvedRev = await resolveLatestRev();

      if (!resolvedRev) {
        throw new Error(
          "Failed to resolve latest revision for URL generation - received empty revision"
        );
      }

      // Update both state variables
      activeRevState = resolvedRev;
      revisionCacheState = {
        value: resolvedRev,
        timestamp: Date.now(),
        latestRevCacheExpiry: () => {
          if (rev !== "latest") return false;
          return Date.now() - revisionCacheState.timestamp > REV_EXPIRY_MS;
        },
      };

      if (debug_rev_caching) {
        console.log(
          `${prefix} 🕐🕐🕐🕐🕐 Resolved and cached "latest" revision for R2 URLs: ${resolvedRev}`
        );
      }
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error resolving revision: ${error.message}`
        );
      }
      throw error;
    }

    const url = getProjectUrl(`/${resolvedRev}${path}`);

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
    // https://static.repo.md/projects/680e97604a0559a192640d2c/_shared/medias/9ad367214fab7207e61dbea46f32e9943d55b7e8cefb55e02f57e06f0db6dd0f-sm.jpeg
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
   * @param {string} projectId - Project ID
   * @param {string} folder - Folder name for proxy path
   * @returns {Object} - Vite proxy configuration
   */
  function createViteProxy(projectId, folder = "_repo") {
    return frameworkCreateViteProxy(projectId, folder);
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
    // Expose method to get revision cache stats
    getRevisionCacheStats: () => {
      const isExpired = rev === "latest" ? revisionCacheState.latestRevCacheExpiry() : false;
      
      // If cache is expired and we have a cached value, trigger background revalidation
      if (isExpired && activeRevState && revisionCacheState.value && rev === "latest") {
        if (debug_rev_caching) {
          console.log(
            `${prefix} 🕐🕐🕐🕐🕐 Cache expired detected in stats check, triggering background revalidation`
          );
        }
        
        // Store the old revision to compare for cache invalidation
        const oldRev = activeRevState;

        // Trigger background revalidation (don't await it)
        resolveLatestRev()
          .then((newRev) => {
            if (newRev && newRev !== oldRev) {
              // Update both state variables
              activeRevState = newRev;
              revisionCacheState = {
                value: newRev,
                timestamp: Date.now(),
                latestRevCacheExpiry: () => {
                  if (rev !== "latest") return false;
                  return (
                    Date.now() - revisionCacheState.timestamp > REV_EXPIRY_MS
                  );
                },
              };

              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Background revalidation complete from stats check, new rev: ${newRev}`
                );
              }

              // If revision changed, log cache invalidation warning
              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Revision changed from ${oldRev} to ${newRev} - R2 JSON files cached with old revision may be stale`
                );
              }
            } else if (newRev === oldRev) {
              // Same revision, just update the timestamp
              revisionCacheState.timestamp = Date.now();
              if (debug_rev_caching) {
                console.log(
                  `${prefix} 🕐🕐🕐🕐🕐 Background revalidation complete from stats check, revision unchanged: ${newRev}`
                );
              }
            }
          })
          .catch((err) => {
            if (debug_rev_caching) {
              console.error(
                `${prefix} 🕐🕐🕐🕐🕐 Background revalidation error from stats check: ${err.message}`
              );
            }
          });
      }
      
      return {
        activeRevState,
        revisionType: rev,
        expiryMs: REV_EXPIRY_MS,
        expirySeconds: revCacheExpirySeconds,
        cacheValue: revisionCacheState.value,
        cacheTimestamp: revisionCacheState.timestamp,
        isExpired,
        msUntilExpiry:
          rev === "latest" && revisionCacheState.timestamp
            ? Math.max(
                0,
                REV_EXPIRY_MS - (Date.now() - revisionCacheState.timestamp)
              )
            : null,
      };
    },
  };
}
