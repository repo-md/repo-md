/**
 * Main barrel export file for RepoMD
 */

// Core exports
import { RepoMD, logo, createOpenAiSpecs } from './RepoMd.js';
import { createOpenAiToolHandler, handleOpenAiRequest } from './openai/index.js';

// Module exports for direct access if needed
import * as coreModule from './core/index.js';
import * as postsModule from './posts/index.js';
import * as mediaModule from './media/index.js';
import * as projectModule from './project/index.js';
import * as filesModule from './files/index.js';
import * as openaiModule from './openai/index.js';

// Import alias mechanism
import { aliases, createAliasFunction, applyAliases } from './aliases.js';

// Import schema/validation utilities
import { 
  repoMdOptionsSchema,
  schemas, 
  validateFunctionParams, 
  functionParamMetadata,
  applyValidation,
  getMethodDescription,
  getAllMethodDescriptions,
  getMethodsByCategory
} from './schemas/index.js';

// Re-export all public APIs
export {
  // Main classes and utilities
  RepoMD,
  logo,
  createOpenAiSpecs,
  createOpenAiToolHandler,
  handleOpenAiRequest,

  // Modules for direct access
  coreModule,
  postsModule,
  mediaModule,
  projectModule,
  filesModule,
  openaiModule,
  
  // Alias mechanism for extending and compatibility
  aliases,
  createAliasFunction,
  applyAliases,
  
  // Schema and validation exports
  repoMdOptionsSchema,
  schemas,
  validateFunctionParams,
  functionParamMetadata,
  applyValidation,
  getMethodDescription,
  getAllMethodDescriptions,
  getMethodsByCategory
};

// Default export
export default RepoMD;

// Legacy exports
export * from './frameworkSnipets.js';
export * from './logger.js';
