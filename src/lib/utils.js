import QuickLRU from "quick-lru";
import { LOG_PREFIXES } from "./logger.js";

// Global cache instance that persists across requests
const lru = new QuickLRU({
  maxSize: 1000, ///tweak depending on worker
  maxAge: 60000 * 60, // 1h
});

const prefix = LOG_PREFIXES.UTILS;

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
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);
    if (debug) {
      console.error(`${prefix} ⚠️ Error fetching: ${url} (${duration}ms)`);
      console.error(`${prefix} ⚠️ ${errorMessage}:`, error);
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
