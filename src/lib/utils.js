import QuickLRU from "quick-lru";
import { LOG_PREFIXES } from "./logger.js";

// Global cache instance that persists across requests
const lru = new QuickLRU({
  maxSize: 1000, ///tweak depending on worker
  maxAge: 60000 * 60, // 1h
});

// Cache for active fetch promises to prevent duplicate requests
const promiseCache = new Map();

const prefix = LOG_PREFIXES.UTILS;

// Check if we're in a Node.js server environment
const isNodeEnv = typeof process !== 'undefined' && process.versions && process.versions.node;

// Trusted repo.md domains - these are first-party domains we control
const TRUSTED_REPOMD_DOMAINS = ['api.repo.md', 'static.repo.md', 'repo.md'];

/**
 * Check if URL is a trusted repo.md domain
 */
function isTrustedRepoMdDomain(url) {
  try {
    const urlObj = new URL(url);
    return TRUSTED_REPOMD_DOMAINS.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

/**
 * Enhanced fetch wrapper that handles SSL certificate issues gracefully
 * For trusted repo.md domains, uses environment variable override if available
 */
async function robustFetch(url, options) {
  try {
    // Use native fetch (available in Node 18+, all browsers)
    return await globalThis.fetch(url, options);
  } catch (error) {
    // Check if this is an SSL/network error
    const isSSLOrNetworkError = error.message && (
      error.message.includes('certificate') ||
      error.message.includes('SSL') ||
      error.message.includes('TLS') ||
      error.message.includes('self signed') ||
      error.message.includes('unable to verify') ||
      error.message.includes('fetch failed') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    );

    if (isSSLOrNetworkError && isNodeEnv) {
      const urlObj = new URL(url);
      const isTrustedDomain = isTrustedRepoMdDomain(url);

      // Log the error
      console.error(
        `${prefix} ⚠️  Network/SSL error accessing ${urlObj.hostname}:`,
        error.message
      );

      // Provide helpful guidance
      if (isTrustedDomain) {
        console.error(
          `${prefix} 💡 This is a trusted repo.md domain. ` +
          `If SSL validation is failing in your environment, set: ` +
          `NODE_TLS_REJECT_UNAUTHORIZED=0 (environment variable)`
        );
      } else if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `${prefix} 💡 Development tip: If this is a trusted domain with SSL issues, ` +
          `you can set NODE_TLS_REJECT_UNAUTHORIZED=0 in development (NOT recommended for production)`
        );
      }
    }

    // Re-throw the original error with added context
    throw error;
  }
}

/**
 * Clear a URL from both the data cache and promise cache
 * @param {string} url - The URL to clear from caches
 * @param {boolean} debug - Whether to log debug information
 * @returns {boolean} - Whether the URL was found in either cache
 */
export function clearUrlFromCache(url, debug = false) {
  let found = false;
  
  if (lru && lru.has(url)) {
    lru.delete(url);
    found = true;
    if (debug) {
      console.log(`${prefix} 🗑️ Cleared URL from data cache: ${url}`);
    }
  }
  
  if (promiseCache.has(url)) {
    promiseCache.delete(url);
    found = true;
    if (debug) {
      console.log(`${prefix} 🗑️ Cleared URL from promise cache: ${url}`);
    }
  }
  
  return found;
}

// Helper function to fetch JSON with error handling and duration measurement
export async function fetchJson(url, opts = {}, debug = false) {
  // Deconstruct options with sensible defaults
  const {
    errorMessage = "Error fetching data",
    defaultValue = null,
    useCache = true,
    method = "GET",
    headers = {},
    body = null,
  } = opts;

  // Create fetch options
  const fetchOptions = {
    method,
    headers: {
      ...headers,
    },
  };

  // Add body for POST requests
  if (body && method !== "GET") {
    fetchOptions.body = body;
  }

  // For POST requests, don't use cache by default
  const shouldUseCache = useCache && method === "GET";

  // Track start time for duration calculation
  const startTime = performance.now();
  
  try {
    if (debug) {
      console.log(`${prefix} 🌐 Fetching JSON from: ${url} (${method})`);
      if (method !== "GET" && body) {
        console.log(`${prefix} 📤 Request body:`, body.substring(0, 200) + (body.length > 200 ? '...' : ''));
      }
    }

    // Check cache first if provided (only for GET requests)
    if (shouldUseCache && lru && lru.has(url)) {
      const cachedData = lru.get(url);
      const duration = (performance.now() - startTime).toFixed(2);
      if (debug) {
        console.log(`${prefix} ✨ Cache hit for: ${url} (${duration}ms)`);
      }
      return cachedData;
    }

    // Check if there's already an in-flight request for this URL (only for GET requests)
    if (shouldUseCache && promiseCache.has(url)) {
      if (debug) {
        console.log(`${prefix} 🔄 Reusing in-flight request for: ${url}`);
      }
      return promiseCache.get(url);
    }

    // Create and store the promise for this request
    const fetchPromise = (async () => {
      try {
        const response = await robustFetch(url, fetchOptions);
        
        // Log the full response for debugging
        if (debug) {
          console.log(`${prefix} 📡 Response status: ${response.status} ${response.statusText}`);
          console.log(`${prefix} 🔍 Response URL: ${response.url}`);
          
          // Log response headers
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          console.log(`${prefix} 📝 Response headers:`, headers);
        }
        
        // Handle different HTTP error status codes with specific messages
        if (!response.ok) {
          let userMessage;
          
          switch (response.status) {
            case 404:
              userMessage = `Resource not found (404): ${url.split('/').slice(-2).join('/')}`;
              break;
            case 401:
              userMessage = "Authentication required: Please check your credentials";
              break;
            case 403:
              userMessage = "Access forbidden: You don't have permission to access this resource";
              break;
            case 429:
              userMessage = "Too many requests: Please try again later";
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              userMessage = `Server error (${response.status}): The server encountered an issue`;
              break;
            default:
              userMessage = `${errorMessage}: ${response.statusText} (${response.status})`;
          }
          
          if (debug) {
            console.error(`${prefix} ❌ ${userMessage}`);
          }
          
          throw new Error(userMessage);
        }

        // First clone the response since we might need to read the body twice
        const clonedResponse = response.clone();
        
        // Parse JSON safely
        let data;
        try {
          data = await response.json();
          
          // Log the parsed response data when in debug mode
          if (debug) {
            console.log(`${prefix} 📦 Response data:`, JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
          }
        } catch (jsonError) {
          // In case of a JSON parsing error, try to get the raw text to help with debugging
          try {
            const responseText = await clonedResponse.text();
            if (debug) {
              console.error(`${prefix} ❌ Failed to parse JSON response:`, jsonError);
              console.error(`${prefix} 📃 Raw response text (first 500 chars):`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
            }
          } catch (textError) {
            if (debug) {
              console.error(`${prefix} ❌ Failed to parse JSON response:`, jsonError);
              console.error(`${prefix} ❌ Also failed to read raw response text:`, textError);
            }
          }
          
          throw new Error(`Invalid JSON response from ${url}: ${jsonError.message}`);
        }
        
        const duration = (performance.now() - startTime).toFixed(2);
        
        // Log the fetch duration
        if (debug) {
          console.log(`${prefix} ⏱️ Fetched data in ${duration}ms: ${url}`);
        }

        // Store in cache if provided (only for GET requests)
        if (shouldUseCache && lru) {
          lru.set(url, data);
          if (debug) {
            console.log(
              `${prefix} 💽 Cached data for: ${url} (cache size: ${lru.size})`
            );
          }
        }

        return data;
      } finally {
        // Remove this URL from the promise cache when done
        if (shouldUseCache) {
          promiseCache.delete(url);
          if (debug) {
            console.log(`${prefix} 🧹 Removed promise from cache: ${url}`);
          }
        }
      }
    })();
    
    // Store the promise in the cache
    if (shouldUseCache) {
      promiseCache.set(url, fetchPromise);
      if (debug) {
        console.log(`${prefix} 📥 Cached promise for: ${url}`);
      }
    }
    
    return fetchPromise;
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    if (debug) {
      console.error(`${prefix} ⚠️ Error fetching: ${url} (${duration}ms)`);
      console.error(`${prefix} ⚠️ ${errorMessage}:`, error);
    }
    
    // Clean up the promise cache if there was an error outside of the fetch operation
    if (shouldUseCache && promiseCache.has(url)) {
      promiseCache.delete(url);
      if (debug) {
        console.log(`${prefix} 🧹 Removed failed promise from cache: ${url}`);
      }
    }
    
    // Return a more structured error object that can be checked
    if (opts.returnErrorObject) {
      return {
        success: false,
        error: error.message || "Unknown error",
        data: defaultValue
      };
    }
    
    return defaultValue;
  }
}
