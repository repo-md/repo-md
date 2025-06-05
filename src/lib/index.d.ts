/**
 * RepoMD - A client for interacting with the repo.md API with modular architecture
 */

export interface RepoMDOptions {
  projectId?: string;
  projectSlug?: string;
  rev?: string;
  secret?: string | null;
  debug?: boolean;
  strategy?: 'auto' | 'browser' | 'server';
}

export type AliasesDefinition = Record<string, string>;

export class RepoMD {
  constructor(options?: RepoMDOptions);

  projectId: string;
  projectSlug: string;
  rev: string;
  debug: boolean;
  secret: string | null;
  activeRev: string | null;
  strategy: string;
  
  // Internal properties for services
  urls: any;
  api: any;
  posts: any;
  similarity: any;
  media: any;
  project: any;
  files: any;

  // URL methods
  getR2Url(path?: string): string;
  getR2ProjectUrl(path?: string): string;
  getR2RevUrl(path?: string): string;
  createViteProxy(folder?: string): Record<string, any>;

  // API methods
  fetchPublicApi(path?: string): Promise<any>;
  fetchProjectDetails(): Promise<any>;
  fetchProjectActiveRev(): Promise<string>;
  getActiveProjectRev(): Promise<string>;
  ensureLatestRev(): Promise<void>;
  fetchJson(url: string, opts?: any): Promise<any>;
  fetchR2Json(path: string, opts?: any): Promise<any>;
  _fetchMapData(mapPath: string, defaultValue?: any): Promise<any>;

  // SQLite methods
  getSqliteUrl(): Promise<string>;

  // Client stats
  getClientStats(): any;

  // Shared folder URL
  getR2SharedFolderUrl(path?: string): string;

  // Media methods
  getR2MediaUrl(path: string): Promise<string>;
  getAllMedias(useCache?: boolean): Promise<any>;
  getAllMedia(useCache?: boolean): Promise<any>;
  getMediaItems(useCache?: boolean): Promise<any>;
  handleCloudflareRequest(request: Request): Promise<Response | null>;

  // Media similarity methods
  getMediaEmbeddings(): Promise<any>;
  getMediaSimilarity(): Promise<any>;
  getMediaSimilarityByHashes(hash1: string, hash2: string): Promise<number>;
  getTopSimilarMediaHashes(): Promise<any>;
  getSimilarMediaHashByHash(hash: string, limit?: number): Promise<string[]>;
  getSimilarMediaByHash(hash: string, count?: number): Promise<any[]>;

  // Post retrieval methods
  getAllPosts(useCache?: boolean, forceRefresh?: boolean): Promise<any[]>;
  getPostBySlug(slug: string): Promise<any | null>;
  getPostByHash(hash: string): Promise<any | null>;
  getPostByPath(path: string): Promise<any | null>;
  _augmentPostsByProperty(keys: string[], property: string, options?: any): Promise<any[]>;
  sortPostsByDate(posts: any[]): any[];
  getRecentPosts(count?: number): Promise<any[]>;
  _findPostByProperty(posts: any[], property: string, value: any): any | null;

  // Post similarity methods
  getPostsEmbeddings(): Promise<any>;
  getPostsSimilarity(): Promise<any>;
  getPostsSimilarityByHashes(hash1: string, hash2: string): Promise<number>;
  getTopSimilarPostsHashes(): Promise<any>;
  getSimilarPostsHashByHash(hash: string, limit?: number): Promise<string[]>;
  getSimilarPostsByHash(hash: string, count?: number, options?: any): Promise<any[]>;
  getSimilarPostsSlugBySlug(slug: string, limit?: number): Promise<string[]>;
  getSimilarPostsBySlug(slug: string, count?: number, options?: any): Promise<any[]>;

  // Project configuration methods
  getReleaseInfo(): Promise<any>;
  getProjectMetadata(): Promise<any>;

  // File handling methods
  getSourceFilesList(useCache?: boolean): Promise<any[]>;
  getDistFilesList(useCache?: boolean): Promise<any[]>;
  getGraph(useCache?: boolean): Promise<any>;
  getFileContent(path: string, useCache?: boolean): Promise<any>;

  // OpenAI integrations
  createOpenAiToolHandler(): (toolCall: any) => Promise<any>;
  handleOpenAiRequest(request: any): Promise<any>;
  
  // Instance cleanup method
  destroy(): void;
  
  // Method aliases (with backwards compatibility)
  
  // Media related aliases
  getAllMedias(useCache?: boolean): Promise<any>; // Alias for getAllMedia
  
  // Posts related aliases
  getPostsBySlug(slug: string): Promise<any | null>; // Alias for getPostBySlug
  
  // Files related aliases
  getSourceFiles(useCache?: boolean): Promise<any[]>; // Alias for getSourceFilesList
}

// Logo
export const logo: string;

// OpenAI tools
export function createOpenAiSpecs(): Record<string, any>;
export function createOpenAiToolHandler(repoMD: RepoMD): (toolCall: any) => Promise<any>;
export function handleOpenAiRequest(request: any, repoMD: RepoMD): Promise<any>;

// Alias mechanism
export const aliases: AliasesDefinition;
export function createAliasFunction(instance: any, aliasName: string, targetName: string): Function;
export function applyAliases(instance: any, debug?: boolean): void;

export default RepoMD;

// Framework snippets
export const MEDIA_PATH: string;
export const R2_URL: string;
export const CommonProxy: Record<string, any>;
export const VueDevProxy: Record<string, any>;
export const VueDevServer: Record<string, any>;
export const VueConfig: Record<string, any>;
export const ViteDevProxy: Record<string, any>;
export const ViteConfig: Record<string, any>;
export const ReactDevProxy: Record<string, any>;
export const setupProxyExample: string;
export const reactPackageJsonProxy: Record<string, any>;

// Schema exports
export const repoMdOptionsSchema: any;
export const schemas: Record<string, any>;
export const functionParamMetadata: Record<string, any>;
export function validateFunctionParams(functionName: string, params: any): { 
  success: boolean;
  data: any;
  error?: string;
};
export function applyValidation(instance: any, methodNames?: string[]): void;
export function getMethodDescription(functionName: string): any;
export function getAllMethodDescriptions(): Record<string, any>;
export function getMethodsByCategory(category: string): Record<string, any>;