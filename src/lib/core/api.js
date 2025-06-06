/**
 * API request module for RepoMD
 * Handles communication with the repo.md backend API
 */

import { LOG_PREFIXES } from "../logger.js";
import { fetchJson } from "../utils.js";

const prefix = LOG_PREFIXES.REPO_MD;
const API_DOMAIN = "api.repo.md";
const API_BASE = `https://${API_DOMAIN}/v1`;
const REV_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Create an API client for the repo.md API
 * @param {Object} config - Configuration object
 * @param {string} config.projectId - Project ID
 * @param {string} config.projectSlug - Project slug
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - API client functions
 */
export function createApiClient(config) {
  const { projectId, projectSlug, debug = false } = config;

  // Simple in-memory storage for active revision with expiry tracking
  let revisionState = {
    value: null,
    timestamp: 0,
    isExpired: () => Date.now() - revisionState.timestamp > REV_EXPIRY_MS,
  };

  // Store the in-flight promise for getActiveProjectRev to prevent duplicate calls
  let currentRevisionPromise = null;

  /**
   * Generate the base project path used for API calls
   * @param {string} [suffix=''] - Optional suffix to append to the path
   * @returns {string} - The project path for API calls
   * @throws {Error} - If no valid projectId is provided
   */
  function getProjectBasePath(suffix = "") {
    // Check if we have a valid projectId
    if (projectId && projectId !== "undefined-project-id") {
      const path = `/project-id/${projectId}${suffix}`;
      if (debug) {
        console.log(`${prefix} 🔍 Using project ID path: ${path}`);
      }
      return path;
    } else {
      // If no valid projectId is available, throw an error
      throw new Error("No valid projectId provided for API request");
    }
  }

  /**
   * Fetch data from the public API
   * @param {string} path - API path
   * @param {Object} options - Fetch options (method, body, headers, etc.)
   * @returns {Promise<any>} - Parsed response data
   */
  async function fetchPublicApi(path = "/", options = {}) {
    const url = `${API_BASE}${path}`;

    try {
      const result = await fetchJson(
        url,
        {
          errorMessage: "Error fetching public API route: " + path,
          useCache: true,
          returnErrorObject: true,
          ...options,
        },
        debug
      );

      // Check if we got an error object back
      if (result && result.success === false) {
        throw new Error(result.error || `Failed to fetch data from ${url}`);
      }

      // If the result is null or undefined, it likely means there was an error
      if (result === null || result === undefined) {
        throw new Error(
          `Failed to fetch data from ${url} - please verify your project credentials`
        );
      }

      return result.data;
    } catch (error) {
      const errorMsg = `API Request Failed: ${error.message}`;

      if (debug) {
        console.error(`${prefix} ❌ ${errorMsg}`);
        console.error(`${prefix} 🔍 Failed URL: ${url}`);
      }

      // Provide a user-friendly message that includes project information
      const projectInfo = projectId
        ? `project ID: ${projectId}`
        : projectSlug
        ? `project slug: ${projectSlug}`
        : "unknown project";

      throw new Error(`Failed to access ${projectInfo}: ${error.message}`);
    }
  }

  /**
   * Fetch project details
   * @returns {Promise<Object>} - Project details
   */
  async function fetchProjectDetails() {
    // Get the base path for this project
    const path = getProjectBasePath();

    // EX: https://api.repo.md/v1/projects-id/680e97604a0559a192640d2c
    const project = await fetchPublicApi(path);
    return project;
  }

  /**
   * Fetch project active revision directly from the /rev endpoint
   * @returns {Promise<string>} - Active revision ID
   */
  async function fetchProjectActiveRev() {
    try {
      // Get the base path with /rev suffix
      const path = getProjectBasePath("/rev");

      const response = await fetchPublicApi(path);

      if (!response) {
        throw new Error(
          `Empty response from /rev endpoint for project ${
            projectId || projectSlug
          }`
        );
      }

      if (debug) {
        console.log(
          `${prefix} ✅ Successfully fetched revision: ${response} from /rev endpoint`,
          response
        );
      }

      return response;
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error fetching revision from /rev endpoint: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Get the active project revision ID
   * @param {boolean} forceRefresh - Whether to force a refresh from the server
   * @param {boolean} skipDetails - Whether to skip fetching project details as fallback
   * @returns {Promise<string>} - Active revision ID
   */
  async function getActiveProjectRev(
    forceRefresh = false,
    skipDetails = false
  ) {
    // Return the ongoing promise if there's already a request in progress
    if (currentRevisionPromise && !forceRefresh) {
      return currentRevisionPromise;
    }

    // Check in-memory state if not forcing refresh
    if (!forceRefresh && revisionState.value && !revisionState.isExpired()) {
      return revisionState.value;
    }

    try {
      // Create a new promise for this request
      currentRevisionPromise = (async () => {
        let activeRev;

        try {
          // Try the faster /rev endpoint first
          activeRev = await fetchProjectActiveRev();
        } catch (error) {
          if (skipDetails) {
            // If we're explicitly told to skip fetching project details, just propagate the error
            throw error;
          }

          if (debug) {
            console.warn(
              `${prefix} ⚠️ Failed to get revision from /rev endpoint, falling back to project details: ${error.message}`
            );
          }

          // Fall back to the original method if /rev fails and we're not skipping details
          const projectDetails = await fetchProjectDetails();

          if (!projectDetails || typeof projectDetails !== "object") {
            throw new Error("Invalid project details response format");
          }

          activeRev = projectDetails.activeRev;
        }

        if (!activeRev) {
          throw new Error(
            `No active revision found for project ${projectId || projectSlug}`
          );
        }

        // Update the local state
        revisionState = {
          value: activeRev,
          timestamp: Date.now(),
          isExpired: () => Date.now() - revisionState.timestamp > REV_EXPIRY_MS,
        };

        return activeRev;
      })();

      // Wait for the result
      const result = await currentRevisionPromise;
      return result;
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error getting active project revision: ${error.message}`
        );
      }
      throw new Error(
        `Failed to get active project revision: ${error.message}`
      );
    } finally {
      // Clear the current promise to allow new requests
      currentRevisionPromise = null;
    }
  }

  /// Ensure latest revision is resolved using stale-while-revalidate pattern
  async function ensureLatestRev(rev, activeRev) {
    try {
      // If we have a specific revision, just return it
      if (rev !== "latest") {
        return rev;
      }

      // If activeRev is provided, use it directly
      if (activeRev) {
        return activeRev;
      }

      // Use stored revision if available
      if (revisionState.value) {
        // If the stored value is expired, trigger a background refresh
        if (revisionState.isExpired()) {
          if (debug) {
            console.log(
              `${prefix} 🔄 Stored revision expired, revalidating in background`
            );
          }

          // Schedule background refresh using the faster /rev endpoint, don't await it
          // This will update the revisionState for future calls
          fetchProjectActiveRev()
            .then((rev) => {
              revisionState = {
                value: rev,
                timestamp: Date.now(),
                isExpired: () =>
                  Date.now() - revisionState.timestamp > REV_EXPIRY_MS,
              };
              if (debug) {
                console.log(
                  `${prefix} ✅ Background refresh complete, new rev: ${rev}`
                );
              }
            })
            .catch((err) => {
              if (debug) {
                console.error(
                  `${prefix} ⚠️ Background revalidation error: ${err.message}`
                );
              }
            });

          // Still return the stale value for this request
          return revisionState.value;
        }

        // Return the stored value if it's not expired
        return revisionState.value;
      }

      // If no stored value, we need to fetch it now
      if (debug) {
        console.log(
          `${prefix} 🔄 Resolving latest revision for project ${
            projectId || projectSlug
          }`
        );
      }

      // Call getActiveProjectRev but tell it to skip the project details fallback
      // since ensureLatestRev will handle that fallback if needed
      try {
        const latestId = await getActiveProjectRev(false, true);

        if (debug) {
          console.log(
            `${prefix} ✅ Resolved 'latest' to revision: ${latestId} (from /rev endpoint)`
          );
        }

        return latestId;
      } catch (error) {
        if (debug) {
          console.warn(
            `${prefix} ⚠️ Failed to get revision from /rev endpoint, falling back to project details: ${error.message}`
          );
        }

        // Try fetching project details directly as a last resort
        try {
          const projectDetails = await fetchProjectDetails();

          if (!projectDetails || typeof projectDetails !== "object") {
            throw new Error("Invalid project details response format");
          }

          const latestId = projectDetails.activeRev;

          if (!latestId) {
            throw new Error(`No active revision found in project details`);
          }

          // Update the cache
          revisionState = {
            value: latestId,
            timestamp: Date.now(),
            isExpired: () =>
              Date.now() - revisionState.timestamp > REV_EXPIRY_MS,
          };

          if (debug) {
            console.log(
              `${prefix} ✅ Resolved 'latest' to revision: ${latestId} (from project details)`
            );
          }

          return latestId;
        } catch (detailsError) {
          throw new Error(
            `Could not determine latest revision ID. /rev endpoint error: ${error.message}, project details error: ${detailsError.message}`
          );
        }
      }
    } catch (error) {
      const errorMessage = `Failed to resolve latest revision: ${error.message}`;
      if (debug) {
        console.error(`${prefix} ❌ ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }
  }


  return {
    fetchPublicApi,
    fetchProjectDetails,
    fetchProjectActiveRev,
    getActiveProjectRev,
    ensureLatestRev,
  };
}
