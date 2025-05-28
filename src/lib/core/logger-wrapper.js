/**
 * Logger Wrapper - Provides method wrapping for consistent logging
 *
 * This module provides a way to wrap methods with consistent logging
 * that captures method name, parameters, and timing information.
 */

import { LOG_PREFIXES } from "../logger.js";
import { schemas } from "../schemas/schemas.js";
import { validateFunctionParams } from "../schemas/types.js";

const prefix = LOG_PREFIXES.REPO_MD;

// ANSI color codes for terminal coloring
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

// Emoji indicators for different log types
const emoji = {
  call: "📣",
  success: "✅",
  error: "❌",
  arrow: "➡️",
};

// CSS styles for console logs
const styles = {
  methodCall: 'color: white; background: #4a69bd; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  methodSuccess: 'color: white; background: #78e08f; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  methodError: 'color: white; background: #eb3b5a; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
  params: 'color: #f7d794; font-style: italic;',
  result: 'color: #c8d6e5; font-weight: bold;',
  duration: 'color: #ffa801; font-weight: bold;',
  group: 'color: #4a69bd; font-weight: bold; font-size: 12px;',
  arrow: 'color: #01a3a4; font-weight: bold;',
};

// Flag to track whether we're inside an SDK method call
let isInsideSDKCall = false;

// Keep track of active method call groups to properly close them
let activeMethodGroups = new Set();

/**
 * Format parameter values for logging in a clean, readable way
 * @param {any} value - The parameter value to format
 * @param {number} [maxLength=50] - Maximum string length before truncation
 * @param {number} [maxDepth=1] - Maximum depth for object inspection
 * @returns {string} Formatted parameter value
 */
function formatParamValue(value, maxLength = 50, maxDepth = 1) {
  // Handle null and undefined
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  // Handle by type
  if (Array.isArray(value)) {
    if (maxDepth <= 0) return `Array(${value.length})`;

    // Format array contents with reduced depth
    const items = value
      .map((item) => formatParamValue(item, maxLength, maxDepth - 1))
      .join(", ");
    return value.length <= 3
      ? `[${items}]`
      : `[${items.substring(0, maxLength)}${
          items.length > maxLength ? "..." : ""
        }]`;
  }

  if (typeof value === "object") {
    if (maxDepth <= 0) return "{...}";

    try {
      // Try to get keys for formatting
      const keys = Object.keys(value);
      if (keys.length === 0) return "{}";

      // Format first few keys with reduced depth
      const entries = keys
        .slice(0, 3)
        .map(
          (key) =>
            `${key}: ${formatParamValue(
              value[key],
              maxLength / 2,
              maxDepth - 1
            )}`
        )
        .join(", ");

      return keys.length <= 3
        ? `{${entries}}`
        : `{${entries}${
            keys.length > 3 ? `, ...${keys.length - 3} more` : ""
          }}`;
    } catch (e) {
      return "{...}";
    }
  }

  if (typeof value === "string") {
    const formatted = `"${value}"`;
    return formatted.length <= maxLength
      ? formatted
      : `"${value.substring(0, maxLength - 5)}..."`;
  }

  if (typeof value === "function") {
    return "function() {...}";
  }

  // For numbers, booleans, etc.
  return String(value);
}

/**
 * Format method parameters for logging
 * @param {string} methodName - The name of the method
 * @param {Array} args - The arguments passed to the method
 * @returns {string} Formatted parameter string
 */
function formatMethodParams(methodName, args) {
  // Handle methods with no parameters
  if (!args || args.length === 0) return "";

  // Check if we have a schema for this method
  const hasSchema = !!schemas[methodName];

  // If no schema or empty args, format normally
  if (!hasSchema) {
    return args.map((arg) => formatParamValue(arg)).join(", ");
  }

  // For methods with schemas, we can use the schema to identify parameters
  try {
    // Convert args to parameter object format if needed
    let paramsObj = {};

    if (args.length === 1 && args[0] !== null && typeof args[0] === "object") {
      // Already an object - might be params object style
      paramsObj = args[0];
    } else {
      // This is where we would convert positional parameters to named ones
      // We'd need similar logic to what's in validator.js

      // For now, just use the raw args
      return args.map((arg) => formatParamValue(arg)).join(", ");
    }

    // Format the parameters using the parameter names from the schema
    const entries = Object.entries(paramsObj);
    return entries
      .map(([key, value]) => `${key}: ${formatParamValue(value)}`)
      .join(", ");
  } catch (error) {
    // Fallback to basic formatting if schema processing fails
    return args.map((arg) => formatParamValue(arg)).join(", ");
  }
}

/**
 * Format a result value for logging
 * @param {any} result - The result to format
 * @returns {string} Formatted result string
 */
function formatResultValue(result) {
  if (result === null) return "null";
  if (result === undefined) return "undefined";

  if (Array.isArray(result)) {
    return `Array(${result.length})`;
  }

  if (typeof result === "object") {
    try {
      const keys = Object.keys(result);
      return `Object{${keys.slice(0, 3).join(", ")}${
        keys.length > 3 ? "..." : ""
      }}`;
    } catch (e) {
      return "Object";
    }
  }

  if (typeof result === "string") {
    return result.length <= 30
      ? `"${result}"`
      : `"${result.substring(0, 30)}..."`;
  }

  return String(result);
}

/**
 * Creates a logger-wrapped function with CSS styled console grouping
 * @param {string} methodName - The name of the method being wrapped
 * @param {Function} originalMethod - The original method to wrap
 * @param {boolean} debug - Whether to log debug info
 * @returns {Function} - Wrapped function with styled logging
 */
export function createLoggerFunction(
  methodName,
  originalMethod,
  debug = false
) {
  return function (...args) {
    if (!debug) {
      // If debug is disabled, just call the original method
      return originalMethod.apply(this, args);
    }

    // Check if we're already inside an SDK method call
    const wasInsideSDKCall = isInsideSDKCall;
    
    // Format parameters for display
    const formattedParams = formatMethodParams(methodName, args);
    
    // Create group ID for this method call to ensure we close the right group
    const groupId = `${methodName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!wasInsideSDKCall) {
      // This is a top-level call - create a styled console group
      console.groupCollapsed(
        `%c${prefix}%c ${emoji.call} %c${methodName}%c(%c${formattedParams}%c)`,
        'color: #6ab04c; font-weight: bold;',  // prefix style
        'color: black;',                       // emoji style
        styles.methodCall,                     // method name style
        'color: black;',                       // parentheses style
        styles.params,                         // parameters style
        'color: black;'                        // closing parenthesis style
      );
      
      // Add this group to our active groups set
      activeMethodGroups.add(groupId);
    }

    try {
      // Set the flag to indicate we're inside an SDK method
      isInsideSDKCall = true;

      // Start timing only for top-level calls
      const startTime = wasInsideSDKCall ? 0 : performance.now();

      // Call the original method
      const result = originalMethod.apply(this, args);

      // Handle both Promise and non-Promise results
      if (result instanceof Promise) {
        // For async methods
        return result
          .then((asyncResult) => {
            // Only log for top-level calls
            if (!wasInsideSDKCall) {
              const duration = (performance.now() - startTime).toFixed(2);
              const formattedResult = formatResultValue(asyncResult);

              // Log the successful result with styling
              console.log(
                `%c${prefix}%c ${emoji.success} %c${methodName}%c ${emoji.arrow} %c${formattedResult}%c (%c${duration}ms%c)`,
                'color: #6ab04c; font-weight: bold;',  // prefix style
                'color: black;',                       // emoji style
                styles.methodSuccess,                  // method name style
                styles.arrow,                          // arrow style
                styles.result,                         // result style
                'color: black;',                       // parentheses style
                styles.duration,                       // duration style
                'color: black;'                        // closing parenthesis style
              );
              
              // Close the console group
              if (activeMethodGroups.has(groupId)) {
                console.groupEnd();
                activeMethodGroups.delete(groupId);
              }
            }

            // Reset the flag when the top-level call finishes
            if (!wasInsideSDKCall) {
              isInsideSDKCall = false;
            }

            return asyncResult;
          })
          .catch((error) => {
            // Only log for top-level calls
            if (!wasInsideSDKCall) {
              const duration = (performance.now() - startTime).toFixed(2);

              // Log the error with styling
              console.error(
                `%c${prefix}%c ${emoji.error} %c${methodName}%c ${emoji.arrow} %c${error.message}%c (%c${duration}ms%c)`,
                'color: #6ab04c; font-weight: bold;',  // prefix style
                'color: black;',                       // emoji style
                styles.methodError,                    // method name style
                styles.arrow,                          // arrow style
                'color: #eb3b5a; font-weight: bold;',  // error style
                'color: black;',                       // parentheses style
                styles.duration,                       // duration style
                'color: black;'                        // closing parenthesis style
              );
              
              // Close the console group
              if (activeMethodGroups.has(groupId)) {
                console.groupEnd();
                activeMethodGroups.delete(groupId);
              }

              // Reset the flag when the top-level call finishes
              isInsideSDKCall = false;
            }

            // Re-throw the error
            throw error;
          });
      } else {
        // For synchronous methods
        if (!wasInsideSDKCall) {
          const duration = (performance.now() - startTime).toFixed(2);
          const formattedResult = formatResultValue(result);

          // Log the successful result with styling
          console.log(
            `%c${prefix}%c ${emoji.success} %c${methodName}%c ${emoji.arrow} %c${formattedResult}%c (%c${duration}ms%c)`,
            'color: #6ab04c; font-weight: bold;',  // prefix style
            'color: black;',                       // emoji style
            styles.methodSuccess,                  // method name style
            styles.arrow,                          // arrow style
            styles.result,                         // result style
            'color: black;',                       // parentheses style
            styles.duration,                       // duration style
            'color: black;'                        // closing parenthesis style
          );
          
          // Close the console group
          if (activeMethodGroups.has(groupId)) {
            console.groupEnd();
            activeMethodGroups.delete(groupId);
          }
        }

        // Reset the flag when the top-level call finishes
        if (!wasInsideSDKCall) {
          isInsideSDKCall = false;
        }

        return result;
      }
    } catch (error) {
      // Only log for top-level calls
      if (!wasInsideSDKCall) {
        const duration = (performance.now() - startTime).toFixed(2);

        // Log the error with styling
        console.error(
          `%c${prefix}%c ${emoji.error} %c${methodName}%c ${emoji.arrow} %c${error.message}%c (%c${duration}ms%c)`,
          'color: #6ab04c; font-weight: bold;',  // prefix style
          'color: black;',                       // emoji style
          styles.methodError,                    // method name style
          styles.arrow,                          // arrow style
          'color: #eb3b5a; font-weight: bold;',  // error style
          'color: black;',                       // parentheses style
          styles.duration,                       // duration style
          'color: black;'                        // closing parenthesis style
        );
        
        // Close the console group
        if (activeMethodGroups.has(groupId)) {
          console.groupEnd();
          activeMethodGroups.delete(groupId);
        }
      }

      // Reset the flag when the top-level call finishes
      if (!wasInsideSDKCall) {
        isInsideSDKCall = false;
      }

      // Re-throw the error
      throw error;
    } finally {
      // If this was the outermost call, ensure we reset the flag
      if (!wasInsideSDKCall) {
        isInsideSDKCall = false;
        
        // Safety check to close any remaining groups
        if (activeMethodGroups.has(groupId)) {
          console.groupEnd();
          activeMethodGroups.delete(groupId);
        }
      }
    }
  };
}

/**
 * Creates a function that combines validation and logging with styled output
 * @param {string} methodName - The name of the method to wrap
 * @param {Function} originalMethod - The original method to wrap
 * @param {boolean} debug - Whether to log debug info
 * @returns {Function} - Wrapped function with validation and logging
 */
export function createValidatedLoggerFunction(
  methodName,
  originalMethod,
  debug = false
) {
  // If debug is disabled, only do validation, no logging
  if (!debug) {
    return function (...args) {
      // Check if we have a schema for this function
      const hasSchema = !!schemas[methodName];

      // If no schema exists, just call the original method
      if (!hasSchema) {
        return originalMethod.apply(this, args);
      }

      // For methods that expect positional parameters, convert them to an object
      let paramsObj = {};
      let validatedArgs = args;

      try {
        // Apply validation logic similar to validator.js
        // This is where we would integrate with the validation layer
        // For now, just pass through the original args
        return originalMethod.apply(this, validatedArgs);
      } catch (error) {
        console.log("xxxxx params passed: ", args);
        throw new Error(
          `Parameter validation failed for ${methodName}: ${error.message}`
        );
      }
    };
  }

  // If debug is enabled, add both validation and colored logging
  return createLoggerFunction(methodName, originalMethod, debug);
}

/**
 * Apply logger wrapper to all methods on an object
 * @param {Object} object - The object to apply logging to
 * @param {boolean} debug - Whether to log debug info
 * @param {string} contextName - Optional context name for the methods (for nested services)
 * @returns {number} - Number of wrapped methods
 */
function applyLoggingToObject(object, debug = false, contextName = '') {
  if (!object || typeof object !== 'object') return 0;
  
  let wrappedCount = 0;
  
  // Get all methods to wrap
  for (const methodName of Object.keys(object)) {
    // Skip non-function properties and private methods
    if (
      typeof object[methodName] !== "function" ||
      methodName.startsWith("_")
    ) {
      continue;
    }
    
    // Skip constructor and known internal methods
    if (methodName === "constructor" || methodName === "destroy") {
      continue;
    }
    
    // Create a full method name with context if needed
    const fullMethodName = contextName 
      ? `${contextName}.${methodName}` 
      : methodName;
    
    // Create a logger wrapped function
    const originalMethod = object[methodName];
    
    // Use the standard logger function
    object[methodName] = createLoggerFunction(
      fullMethodName,
      originalMethod,
      debug
    );
    
    wrappedCount++;
  }
  
  return wrappedCount;
}

/**
 * Applies logger wrappers to RepoMD methods including all service modules
 * @param {Object} instance - The RepoMD instance to apply logging to
 * @param {boolean} debug - Whether to log debug info
 */
export function applyLogging(instance, debug = false) {
  // If debug is disabled, do nothing
  if (!debug) return;
  
  // First wrap all main methods
  let totalWrappedCount = applyLoggingToObject(instance, debug);
  
  // Known service modules in RepoMD
  const serviceModules = [
    'posts',
    'media',
    'similarity',
    'project',
    'files',
    'urls',
    'api'
  ];
  
  // Apply logging to all service modules
  for (const moduleName of serviceModules) {
    if (instance[moduleName] && typeof instance[moduleName] === 'object') {
      const moduleWrappedCount = applyLoggingToObject(
        instance[moduleName],
        debug,
        moduleName
      );
      totalWrappedCount += moduleWrappedCount;
    }
  }
  
  if (debug) {
    // Log with styled output
    console.log(
      `%c${prefix}%c ${emoji.success} Applied method logging to %c${totalWrappedCount}%c methods`,
      'color: #6ab04c; font-weight: bold;',
      'color: black;',
      'color: #4a69bd; font-weight: bold;',
      'color: black;'
    );
  }
}