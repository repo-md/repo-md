/**
 * Media module barrel export for RepoMD
 */

import { createMediaHandler } from './handler.js';
import { handleCloudflareRequest } from '../mediaProxy.js';

export {
  createMediaHandler,
  handleCloudflareRequest,
};