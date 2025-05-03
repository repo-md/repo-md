// Import OpenAI classes - direct imports from the source files
import {
  OpenAiToolHandler,
  createOpenAiToolHandler,
  handleOpenAiRequest,
} from "./openai/OpenAiToolHandler.js";
import { OpenAiToolSpec, toolSpecs } from "./openai/OpenAiToolSpec.js";

// Import RepoMD class for creating new instances if needed
import { RepoMD } from "./RepoMd.js";

// For backward compatibility, create a wrapper for createOpenAiToolHandler
// that handles the parameter order change
const legacyCreateOpenAiToolHandler = (options = {}) => {
  const repoMD = new RepoMD(options);
  return createOpenAiToolHandler(repoMD);
};

// Export all OpenAI classes and the backward compatible createOpenAiToolHandler
export {
  OpenAiToolHandler,
  legacyCreateOpenAiToolHandler as createOpenAiToolHandler,
  handleOpenAiRequest,
  OpenAiToolSpec,
  toolSpecs,
};
