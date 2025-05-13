/**
 * Alias mechanism for backwards compatibility
 * Provides a way to create function aliases with deprecation warnings
 */

import { LOG_PREFIXES } from "./logger.js";

const prefix = LOG_PREFIXES.REPO_MD || "[RepoMD]";

/**
 * Simple mapping of method aliases to their target methods
 * Each key is the alias name, and the value is the target method name
 */
export const aliases = {
  // Media related aliases
  'getAllMedias': 'getAllMedia',
  
  // Posts related aliases
  'getPostsBySlug': 'getPostBySlug',
  
  // Files related aliases
  'getSourceFiles': 'getSourceFilesList'
  // Add more aliases here as needed
};

/**
 * Creates a wrapper function that calls the target function
 * but logs a deprecation warning
 *
 * @param {Object} instance - The object instance that contains the target function
 * @param {string} aliasName - The name of the alias function
 * @param {string} targetName - The name of the target function to call
 * @returns {Function} - Wrapper function that logs and calls the target
 */
export function createAliasFunction(instance, aliasName, targetName) {
  // Pre-generate the deprecation message using the template
  const message = `'${aliasName}' is an alias of '${targetName}', it might be removed in a future version.`;
  
  return function (...args) {
    console.warn(`${prefix} ⚠️ Deprecated: ${message}`);

    // Call the target function with the same context and arguments
    return instance[targetName].apply(instance, args);
  };
}

/**
 * Applies all configured aliases to an instance
 *
 * @param {Object} instance - The object to apply aliases to
 * @param {boolean} debug - Whether to log debug messages
 */
export function applyAliases(instance, debug = false) {
  if (!instance) return;

  Object.entries(aliases).forEach(([aliasName, targetName]) => {
    // Skip if the target method doesn't exist
    if (typeof instance[targetName] !== "function") {
      if (debug) {
        console.warn(
          `${prefix} ⚠️ Cannot create alias '${aliasName}': target method '${targetName}' not found.`
        );
      }
      return;
    }

    // Skip if the alias would override an existing method
    if (aliasName in instance && aliasName !== targetName) {
      if (debug) {
        console.warn(
          `${prefix} ⚠️ Cannot create alias '${aliasName}': method already exists.`
        );
      }
      return;
    }

    // Create the alias function
    instance[aliasName] = createAliasFunction(instance, aliasName, targetName);

    if (debug) {
      console.log(`${prefix} ℹ️ Created alias '${aliasName}' → '${targetName}'`);
    }
  });
}
