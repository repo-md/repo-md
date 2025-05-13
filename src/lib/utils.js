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
  } = opts;

  // Track start time for duration calculation
  const startTime = performance.now();
  
  try {
    if (debug) {
      console.log(`${prefix} 🌐 Fetching JSON from: ${url}`);
    }

    // Check cache first if provided
    if (useCache && lru && lru.has(url)) {
      const cachedData = lru.get(url);
      const duration = (performance.now() - startTime).toFixed(2);
      if (debug) {
        console.log(`${prefix} ✨ Cache hit for: ${url} (${duration}ms)`);
      }
      return cachedData;
    }

    // Check if there's already an in-flight request for this URL
    if (useCache && promiseCache.has(url)) {
      if (debug) {
        console.log(`${prefix} 🔄 Reusing in-flight request for: ${url}`);
      }
      return promiseCache.get(url);
    }

    // Create and store the promise for this request
    const fetchPromise = (async () => {
      try {
        const response = await fetch(url);
        
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
          
          throw new Error(`Invalid JSON response: ${jsonError.message}`);
        }
        
        const duration = (performance.now() - startTime).toFixed(2);
        
        // Log the fetch duration
        if (debug) {
          console.log(`${prefix} ⏱️ Fetched data in ${duration}ms: ${url}`);
        }

        // Store in cache if provided
        if (useCache && lru) {
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
        if (useCache) {
          promiseCache.delete(url);
          if (debug) {
            console.log(`${prefix} 🧹 Removed promise from cache: ${url}`);
          }
        }
      }
    })();
    
    // Store the promise in the cache
    if (useCache) {
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
    if (useCache && promiseCache.has(url)) {
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
