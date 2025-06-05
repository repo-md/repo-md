/**
 * Posts module barrel export for RepoMD
 */

import { createPostRetrieval } from './retrieval.js';
import { createPostSimilarity } from './similarity.js';
import { createPostSearch } from './search.js';

export {
  createPostRetrieval,
  createPostSimilarity,
  createPostSearch,
};