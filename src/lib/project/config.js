/**
 * Project Configuration module for RepoMD
 * Provides functions for handling project configuration and releases
 */

import { LOG_PREFIXES } from '../logger.js';

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a project configuration service
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchProjectDetails - Function to fetch project details
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - Project configuration functions
 */
export function createProjectConfig(config) {
  const { fetchProjectDetails, debug = false } = config;

  /**
   * Get release information
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} - Release information
   */
  async function getReleaseInfo(projectId) {
    try {
      const projectConfig = await fetchProjectDetails();

      if (!projectConfig || typeof projectConfig !== 'object') {
        throw new Error('Invalid project configuration response');
      }

      return {
        current: projectConfig.latest_release || null,
        all: projectConfig.releases || [],
        projectId: projectConfig.id || projectId || null,
        projectName: projectConfig.name || null,
      };
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error getting release information: ${error.message}`
        );
      }
      throw new Error(`Failed to get release information: ${error.message}`);
    }
  }

  /**
   * Get project metadata
   * @returns {Promise<Object>} - Project metadata
   */
  async function getProjectMetadata() {
    try {
      const projectConfig = await fetchProjectDetails();
      
      if (!projectConfig || typeof projectConfig !== 'object') {
        throw new Error('Invalid project configuration response');
      }
      
      return {
        id: projectConfig.id,
        name: projectConfig.name,
        slug: projectConfig.slug,
        description: projectConfig.description,
        owner: projectConfig.owner,
        orgSlug: projectConfig.orgSlug,
        visibility: projectConfig.visibility,
        activeRev: projectConfig.activeRev,
        created: projectConfig.created,
        updated: projectConfig.updated,
      };
    } catch (error) {
      if (debug) {
        console.error(
          `${prefix} ❌ Error getting project metadata: ${error.message}`
        );
      }
      throw new Error(`Failed to get project metadata: ${error.message}`);
    }
  }

  return {
    getReleaseInfo,
    getProjectMetadata,
  };
}