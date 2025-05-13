/**
 * Main barrel export file for RepoMD
 */

// Core exports
import { RepoMD, logo, OpenAiToolSpec, toolSpecs } from './RepoMd.js';

// Module exports for direct access if needed
import * as coreModule from './core/index.js';
import * as postsModule from './posts/index.js';
import * as mediaModule from './media/index.js';
import * as projectModule from './project/index.js';
import * as filesModule from './files/index.js';
import * as openaiModule from './openai/index.js';

// Re-export all public APIs
export {
  // Main classes and utilities
  RepoMD,
  logo,
  OpenAiToolSpec,
  toolSpecs,

  // Modules for direct access
  coreModule,
  postsModule,
  mediaModule,
  projectModule,
  filesModule,
  openaiModule,
};

// Default export
export default RepoMD;

// Legacy exports
export * from './frameworkSnipets.js';
export * from './logger.js';
