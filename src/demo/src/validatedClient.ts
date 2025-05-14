import { RepoMD } from '../../lib/index.js';
import { validateFunctionParams, RepoMdOptions, FunctionParams } from './zodTypes.js';
import { schemas } from './schemas.js';

/**
 * ValidatedRepoMD is a wrapper around RepoMD that validates parameters
 * using Zod schemas before calling the actual methods.
 */
export class ValidatedRepoMD {
  private client: RepoMD;
  
  constructor(options: RepoMdOptions) {
    this.client = new RepoMD(options);
  }
  
  /**
   * Generic method to validate parameters and execute RepoMD functions
   */
  private async execute<T extends keyof FunctionParams>(
    methodName: T,
    params: Partial<FunctionParams[T]> = {}
  ): Promise<any> {
    // Validate parameters using Zod
    const validation = validateFunctionParams(methodName as keyof typeof schemas, params);
    
    if (!validation.success) {
      throw new Error(`Parameter validation failed: ${validation.error}`);
    }
    
    const validParams = validation.data;
    const method = this.client[methodName as string] as Function;
    
    if (!method) {
      throw new Error(`Method ${String(methodName)} not found on RepoMD instance`);
    }
    
    // Use type assertion to handle different param shapes
    const typedParams = validParams as any;
    
    // Handle special method parameter patterns
    switch(methodName) {
      case 'getRecentPosts':
        return method.call(this.client, typedParams.count);
        
      case 'getPostBySlug':
        return method.call(this.client, typedParams.slug);
        
      case 'getPostByHash':
        return method.call(this.client, typedParams.hash);
        
      case 'getPostByPath':
        return method.call(this.client, typedParams.path);
        
      case 'getFileContent':
        return method.call(this.client, typedParams.path, typedParams.useCache);
        
      case 'getPostsSimilarityByHashes':
        return method.call(this.client, typedParams.hash1, typedParams.hash2);
        
      case 'getSimilarPostsByHash':
        return method.call(this.client, typedParams.hash, typedParams.count, typedParams.options);
        
      case 'getSimilarPostsBySlug':
        return method.call(this.client, typedParams.slug, typedParams.count, typedParams.options);
        
      case 'getSimilarPostsHashByHash':
        return method.call(this.client, typedParams.hash, typedParams.limit);
        
      default:
        // Default case: pass all parameters
        return method.call(this.client, validParams);
    }
  }
  
  // Create wrapper methods for common operations with type safety
  async getAllPosts(params?: Partial<FunctionParams['getAllPosts']>) {
    return this.execute('getAllPosts', params);
  }
  
  async getPostBySlug(params: FunctionParams['getPostBySlug']) {
    return this.execute('getPostBySlug', params);
  }
  
  async getPostByHash(params: FunctionParams['getPostByHash']) {
    return this.execute('getPostByHash', params);
  }
  
  async getPostByPath(params: FunctionParams['getPostByPath']) {
    return this.execute('getPostByPath', params);
  }
  
  async getRecentPosts(params?: Partial<FunctionParams['getRecentPosts']>) {
    return this.execute('getRecentPosts', params);
  }
  
  async getAllMedia(params?: Partial<FunctionParams['getAllMedia']>) {
    return this.execute('getAllMedia', params);
  }
  
  async getFileContent(params: FunctionParams['getFileContent']) {
    return this.execute('getFileContent', params);
  }
  
  async getSimilarPostsByHash(params: FunctionParams['getSimilarPostsByHash']) {
    return this.execute('getSimilarPostsByHash', params);
  }
  
  async getSimilarPostsBySlug(params: FunctionParams['getSimilarPostsBySlug']) {
    return this.execute('getSimilarPostsBySlug', params);
  }
  
  // Pass through access to the underlying instance
  get instance(): RepoMD {
    return this.client;
  }
  
  // Cleanup method
  destroy() {
    if (typeof this.client.destroy === 'function') {
      this.client.destroy();
    }
  }
}