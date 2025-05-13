/**
 * File Handling module for RepoMD
 * Provides functions for handling source and distribution files
 */

import { LOG_PREFIXES } from "../logger.js";

const prefix = LOG_PREFIXES.REPO_MD;

/**
 * Create a file handling service
 * @param {Object} config - Configuration object
 * @param {Function} config.fetchR2Json - Function to fetch JSON from R2
 * @param {Function} config.ensureLatestRev - Function to ensure latest revision is resolved
 * @param {boolean} config.debug - Whether to log debug info
 * @returns {Object} - File handling functions
 */
export function createFileHandler(config) {
  const { fetchR2Json, ensureLatestRev, debug = false } = config;

  // Configuration for file endpoints
  const fileEndpoints = {
    source: {
      path: "/files-source.json",
      message: "Fetching source files list",
      defaultValue: [],
    },
    dist: {
      path: "/files-dist.json",
      message: "Fetching distribution files list",
      defaultValue: [],
    },
    graph: {
      path: "/graph.json",
      message: "Fetching dependency graph data",
      defaultValue: {},
    },
  };

  // Generic file fetching function
  async function fetchFile(configKey, useCache = true) {
    const config = fileEndpoints[configKey];
    await ensureLatestRev();

    if (debug) {
      console.log(`${prefix} 📡 ${config.message}`);
    }

    return await fetchR2Json(config.path, {
      defaultValue: config.defaultValue,
      useCache,
    });
  }

  async function getSourceFilesList(useCache = true) {
    return await fetchFile("source", useCache);
  }

  async function getDistFilesList(useCache = true) {
    return await fetchFile("dist", useCache);
  }

  async function getGraph(useCache = true) {
    return await fetchFile("graph", useCache);
  }

  /**
   * Get the content of a file by path
   * @param {string} path - File path
   * @param {boolean} useCache - Whether to use cache
   * @returns {Promise<Object|null>} - File content or null
   * @throws {Error} - If path parameter is missing or invalid
   */
  async function getFileContent(path, useCache = true) {
    // Validate path parameter
    if (!path) {
      throw new Error('Path is required for getFileContent operation');
    }

    if (typeof path !== 'string') {
      throw new Error('Path must be a string value');
    }

    await ensureLatestRev();

    if (debug) {
      console.log(`${prefix} 📡 Fetching file content: ${path}`);
    }

    return await fetchR2Json(`/files/${path}`, {
      defaultValue: null,
      useCache,
    });
  }

  return {
    getSourceFilesList,
    getDistFilesList,
    getGraph,
    getFileContent,
  };
}
