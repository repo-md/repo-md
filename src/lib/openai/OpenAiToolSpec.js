/**
 * OpenAI Tool Specification for RepoMD
 * This file defines the tool specifications in OpenAI's format for the RepoMD API client
 */

// Define the OpenAI Tool Specifications
export const OpenAiToolSpec = {
  type: "function",
  functions: [
    {
      name: "getAllPosts",
      description: "Fetch all blog posts from the RepoMD repository",
      parameters: {
        type: "object",
        properties: {
          useCache: {
            type: "boolean",
            description: "Whether to use cached posts if available",
            default: true,
          },
          forceRefresh: {
            type: "boolean",
            description: "Force refresh posts from R2 even if cached",
            default: false,
          },
        },
        required: [],
      },
    },
    {
      name: "getPostBySlug",
      description: "Get a single blog post by its slug",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The slug of the post to retrieve",
          },
        },
        required: ["slug"],
      },
    },
    {
      name: "getPostByHash",
      description: "Get a single blog post by its hash",
      parameters: {
        type: "object",
        properties: {
          hash: {
            type: "string",
            description: "The hash of the post to retrieve",
          },
        },
        required: ["hash"],
      },
    },
    {
      name: "getRecentPosts",
      description: "Get recent blog posts sorted by date (newest first)",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "integer",
            description: "Number of recent posts to retrieve",
            default: 3,
          },
        },
        required: [],
      },
    },
    {
      name: "getSimilarPostsBySlug",
      description: "Get similar posts for a given post slug",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The slug of the post to find similar posts for",
          },
          count: {
            type: "integer",
            description: "Number of similar posts to retrieve",
            default: 5,
          },
          loadIndividually: {
            type: "integer",
            description: "Threshold for switching to bulk loading",
            default: 3,
          },
        },
        required: ["slug"],
      },
    },
    {
      name: "getSimilarPostsByHash",
      description: "Get similar posts for a given post hash",
      parameters: {
        type: "object",
        properties: {
          hash: {
            type: "string",
            description: "The hash of the post to find similar posts for",
          },
          count: {
            type: "integer",
            description: "Number of similar posts to retrieve",
            default: 5,
          },
          loadIndividually: {
            type: "integer",
            description: "Threshold for switching to bulk loading",
            default: 3,
          },
        },
        required: ["hash"],
      },
    },
    {
      name: "getMediaItems",
      description: "Get all media items with formatted URLs",
      parameters: {
        type: "object",
        properties: {
          useCache: {
            type: "boolean",
            description: "Whether to use cached media data if available",
            default: true,
          },
        },
        required: [],
      },
    },
    {
      name: "getReleaseInfo",
      description: "Get release information for the project",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  ],
};

// Export individual tool specs for potential separate usage
export const toolSpecs = OpenAiToolSpec.functions.reduce((acc, tool) => {
  acc[tool.name] = {
    type: "function",
    function: tool,
  };
  return acc;
}, {});
