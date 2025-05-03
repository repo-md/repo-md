/**
 * OpenAI Tool Handler for RepoMD
 * This file defines the handler that connects OpenAI tool calls to the RepoMD API client
 */

/**
 * Creates a handler for OpenAI tool calls that connects to the RepoMD client
 * @param {Object} repoMD - An instance of the RepoMD client
 * @param {Object} options - Additional options (unused, kept for backward compatibility)
 * @returns {Function} - Handler function for OpenAI tool calls
 */
export const createOpenAiToolHandler = (repoMD, options = {}) => {
  if (!repoMD) {
    throw new Error('RepoMD instance is required for OpenAiToolHandler');
  }

  /**
   * Handler for OpenAI tool calls
   * @param {Object} toolCall - The tool call from OpenAI
   * @returns {Promise<any>} - Result of the tool call
   */
  return async function OpenAiToolHandler(toolCall) {
    const { name, arguments: args } = toolCall;
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;

    try {
      // Route the tool call to the appropriate RepoMD method
      switch (name) {
        case "getAllPosts":
          return await repoMD.getAllPosts(
            parsedArgs.useCache !== undefined ? parsedArgs.useCache : true,
            parsedArgs.forceRefresh || false
          );

        case "getPostById":
          return await repoMD.getPostById(parsedArgs.id);

        case "getPostBySlug":
          return await repoMD.getPostBySlug(parsedArgs.slug);

        case "getPostByHash":
          return await repoMD.getPostByHash(parsedArgs.hash);

        case "getRecentPosts":
          return await repoMD.getRecentPosts(parsedArgs.count || 3);

        case "getSimilarPostsBySlug":
          return await repoMD.getSimilarPostsBySlug(
            parsedArgs.slug,
            parsedArgs.count || 5,
            {
              loadIndividually: parsedArgs.loadIndividually || 3,
            }
          );

        case "getSimilarPostsByHash":
          return await repoMD.getSimilarPostsByHash(
            parsedArgs.hash,
            parsedArgs.count || 5,
            {
              loadIndividually: parsedArgs.loadIndividually || 3,
            }
          );

        case "getMediaItems":
          return await repoMD.getMediaItems(
            parsedArgs.useCache !== undefined ? parsedArgs.useCache : true
          );

        case "getReleaseInfo":
          return await repoMD.getReleaseInfo();

        default:
          throw new Error(`Unknown tool name: ${name}`);
      }
    } catch (error) {
      console.error(`[OpenAiToolHandler] Error executing tool ${name}:`, error);
      throw error;
    }
  };
};

// Import the RepoMD to maintain backward compatibility
import { RepoMD } from "../index.js";

/**
 * Example usage of the OpenAI Tool Handler with the RepoMD client
 * Maintained for backward compatibility
 */
export const OpenAiToolHandler = (() => {
  const repoMD = new RepoMD({
    org: "iplanwebsites",
    orgSlug: "iplanwebsites",
    project: "tbd",
    projectId: "680e97604a0559a192640d2c",
    projectSlug: "undefined-project-slug",
    rev: "latest",
    debug: false,
  });
  return createOpenAiToolHandler(repoMD);
})();

/**
 * Integrated function to handle OpenAI API requests with the RepoMD tools
 * @param {Object} request - The OpenAI API request
 * @param {Object} repoMD - An instance of RepoMD (if not provided, one will be created with the given options)
 * @param {Object} options - Configuration options for creating a new RepoMD client (used only if repoMD is not provided)
 * @returns {Promise<Object>} - The response to send back to OpenAI
 */
export const handleOpenAiRequest = async (request, repoMD = null, options = {}) => {
  // If repoMD instance is not provided, create one using the options
  const repoMDInstance = repoMD || new RepoMD(options);
  
  const toolHandler = createOpenAiToolHandler(repoMDInstance);

  // Extract tool calls from the request
  const toolCalls =
    request.messages?.[request.messages.length - 1]?.tool_calls || [];

  // Process all tool calls in parallel
  const toolCallResults = await Promise.all(
    toolCalls.map(async (toolCall) => {
      try {
        const result = await toolHandler(toolCall);
        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify(result),
        };
      } catch (error) {
        return {
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: error.message }),
        };
      }
    })
  );

  // Return the results in the format expected by OpenAI
  return {
    tool_outputs: toolCallResults,
  };
};

export default OpenAiToolHandler;
