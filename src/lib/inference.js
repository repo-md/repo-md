/**
 * Inference module for RepoMD
 * Handles embedding computations using various models
 */

import { fetchJson } from "./utils.js";

const API_DOMAIN = "api.repo.md";
const API_BASE = `https://${API_DOMAIN}/v1`;

/**
 * Fetch data from the inference API
 * @param {string} path - API path
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @param {boolean} debug - Whether to log debug info
 * @returns {Promise<any>} - Parsed response data
 */
async function fetchInferenceApi(path = "/", options = {}, debug = false) {
  const url = `${API_BASE}${path}`;

  try {
    const result = await fetchJson(
      url,
      {
        errorMessage: "Error fetching inference API route: " + path,
        useCache: false,
        returnErrorObject: true,
        ...options,
      },
      debug
    );

    if (result && result.success === false) {
      throw new Error(result.error || `Failed to fetch data from ${url}`);
    }

    if (result === null || result === undefined) {
      throw new Error(
        `Failed to fetch data from ${url} - please verify your request`
      );
    }

    return result.data;
  } catch (error) {
    const errorMsg = `Inference API Request Failed: ${error.message}`;

    if (debug) {
      console.error(`❌ ${errorMsg}`);
      console.error(`🔍 Failed URL: ${url}`);
    }

    throw new Error(`Failed to access inference API: ${error.message}`);
  }
}

/**
 * Compute text embedding from the inference API
 * @param {string} text - Text to compute embedding for
 * @param {string|null} instruction - Optional instruction for the embedding
 * @param {boolean} debug - Whether to log debug info
 * @returns {Promise<Object>} - Embedding response with metadata
 */
export async function computeTextEmbedding(text, instruction = null, debug = false) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text parameter is required and must be a non-empty string');
  }

  const payload = { text };
  if (instruction) {
    payload.instruction = instruction;
  }

  const response = await fetchInferenceApi('/inference/text-embedding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, debug);

  if (!response.success) {
    throw new Error(response.message || 'Failed to compute text embedding');
  }

  return response.data;
}

/**
 * Compute CLIP text embedding from the inference API
 * @param {string} text - Text to compute CLIP embedding for
 * @param {boolean} debug - Whether to log debug info
 * @returns {Promise<Object>} - CLIP embedding response with metadata
 */
export async function computeClipTextEmbedding(text, debug = false) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text parameter is required and must be a non-empty string');
  }

  const response = await fetchInferenceApi('/inference/clip-by-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }, debug);

  if (!response.success) {
    throw new Error(response.message || 'Failed to compute CLIP text embedding');
  }

  return response.data;
}

/**
 * Compute CLIP image embedding from the inference API
 * @param {string} image - Image input as either a URL or base64-encoded data string
 * @param {boolean} debug - Whether to log debug info
 * @returns {Promise<Object>} - CLIP image embedding response with metadata
 */
export async function computeClipImageEmbedding(image, debug = false) {
  if (!image || typeof image !== 'string' || image.trim().length === 0) {
    throw new Error('Image parameter is required and must be a non-empty string');
  }

  const isUrl = image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:');
  
  const payload = isUrl ? { imageUrl: image } : { imageData: image };

  const response = await fetchInferenceApi('/inference/clip-by-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, debug);

  if (!response.success) {
    throw new Error(response.message || 'Failed to compute CLIP image embedding');
  }

  return response.data;
}