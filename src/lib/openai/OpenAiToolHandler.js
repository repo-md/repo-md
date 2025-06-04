/**
 * OpenAI Tool Handler for RepoMD
 * This file defines the handler that connects OpenAI tool calls to the RepoMD API client
 * 
 * ## Usage Guide
 * 
 * This handler processes OpenAI function calls with the official JSON Schema format
 * and automatically maps them to RepoMD instance methods using schema validation.
 * 
 * ### OpenAI Function Call Format (Official JSON Schema)
 * ```json
 * {
 *   "name": "getAllPosts",
 *   "description": "Retrieve all blog posts from the repository",
 *   "parameters": {
 *     "type": "object",
 *     "properties": {
 *       "useCache": {
 *         "type": "boolean", 
 *         "description": "Use cached data if available",
 *         "default": true
 *       },
 *       "forceRefresh": {
 *         "type": "boolean",
 *         "description": "Force refresh from storage", 
 *         "default": false
 *       }
 *     },
 *     "required": []
 *   }
 * }
 * ```
 * 
 * ### OpenAI API Response Example
 * ```json
 * {
 *   "choices": [{
 *     "message": {
 *       "tool_calls": [{
 *         "id": "call_123",
 *         "type": "function", 
 *         "function": {
 *           "name": "getAllPosts",
 *           "arguments": "{\"useCache\": false, \"forceRefresh\": true}"
 *         }
 *       }]
 *     }
 *   }]
 * }
 * ```
 * 
 * ### Handler Usage
 * ```javascript
 * import { createOpenAiToolHandler } from './OpenAiToolHandler.js';
 * import RepoMD from './RepoMD.js';
 * 
 * const repoMD = new RepoMD({ projectId: 'your-project' });
 * const handler = createOpenAiToolHandler(repoMD);
 * 
 * // Process OpenAI tool call
 * const toolCall = {
 *   name: 'getAllPosts',
 *   arguments: { useCache: false, forceRefresh: true }
 * };
 * 
 * const result = await handler(toolCall);
 * // Calls: repoMD.getAllPosts(false, true)
 * ```
 * 
 * ### Key Features
 * - **Schema-Based**: Uses Zod schemas as single source of truth for parameter mapping
 * - **Auto-Validation**: Parameters are validated and defaults applied automatically  
 * - **Dynamic Routing**: Supports all 51+ RepoMD methods without hardcoding
 * - **Type Safety**: Invalid parameters are caught before method execution
 * - **OpenAI Compatible**: Works with OpenAI's function calling API format
 */

import { schemas } from "../schemas/schemas.js";

/**
 * Convert OpenAI parameters object to method arguments array using schema definitions
 * @param {string} methodName - The method name being called
 * @param {Object} parameters - The parameters object from OpenAI
 * @returns {Array} - Array of arguments to pass to the method
 */
function convertParametersToArgs(methodName, parameters) {
  const schema = schemas[methodName];
  
  if (!schema) {
    throw new Error(`No schema found for method: ${methodName}`);
  }

  // Handle methods with no parameters
  if (!parameters || Object.keys(parameters).length === 0) {
    return [];
  }

  // Parse and validate parameters using the schema
  const parsedParams = schema.parse(parameters);
  
  // Extract the parameter names from the schema shape
  const shapeRaw = schema._def.shape;
  const shape = typeof shapeRaw === "function" ? shapeRaw() : shapeRaw;
  
  if (!shape || typeof shape !== "object") {
    return [];
  }

  // Convert parameters to ordered arguments based on schema definition
  const args = [];
  const paramKeys = Object.keys(shape);
  
  for (const key of paramKeys) {
    if (Object.prototype.hasOwnProperty.call(parsedParams, key)) {
      args.push(parsedParams[key]);
    }
  }

  return args;
}

/**
 * Creates a handler for OpenAI tool calls that connects to the RepoMD client
 * @param {Object} repoMD - An instance of the RepoMD client
 * @returns {Function} - Handler function for OpenAI tool calls
 */
export const createOpenAiToolHandler = (repoMD) => {
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
      // Check if the method exists on the RepoMD instance
      if (typeof repoMD[name] !== 'function') {
        throw new Error(`Method ${name} not found on RepoMD instance`);
      }

      // Convert parameters object to array of arguments
      const methodArgs = convertParametersToArgs(name, parsedArgs);
      
      // Call the method dynamically with spread arguments
      return await repoMD[name](...methodArgs);
    } catch (error) {
      console.error(`[OpenAiToolHandler] Error executing tool ${name}:`, error);
      throw error;
    }
  };
};

/**
 * Integrated function to handle OpenAI API requests with the RepoMD tools
 * @param {Object} request - The OpenAI API request
 * @param {Object} repoMD - An instance of RepoMD
 * @returns {Promise<Object>} - The response to send back to OpenAI
 */
export const handleOpenAiRequest = async (request, repoMD) => {
  if (!repoMD) {
    throw new Error('RepoMD instance is required for handleOpenAiRequest');
  }
  
  const toolHandler = createOpenAiToolHandler(repoMD);

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

// Export the createOpenAiToolHandler as the default export
export default createOpenAiToolHandler;
