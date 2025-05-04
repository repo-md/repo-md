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
    if (!response.ok) {
      throw new Error(`${errorMessage}: ${response.statusText}`);
    }

    const data = await response.json();
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
    return defaultValue;
  }
}
