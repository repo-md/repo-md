/**
 * RepoMD - A client for interacting with the repo.md API with modular architecture
 */

export interface RepoMDOptions {
  org?: string;
  orgSlug?: string;
  orgId?: string | null;
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

  org: string;
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string | null;
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
  getActiveProjectRev(): Promise<string>;
  ensureLatestRev(): Promise<void>;
  fetchJson(url: string, opts?: any): Promise<any>;
  fetchR2Json(path: string, opts?: any): Promise<any>;
  _fetchMapData(mapPath: string, defaultValue?: any): Promise<any>;

  // SQLite methods
  getSqliteURL(): Promise<string>;

  // Media methods
  getR2MediaUrl(path: string): Promise<string>;
  getAllMedias(useCache?: boolean): Promise<any>;
  getAllMedia(useCache?: boolean): Promise<any>;
  getMediaItems(useCache?: boolean): Promise<any>;
  handleCloudflareRequest(request: Request): Promise<Response | null>;

  // Post retrieval methods
  getAllPosts(useCache?: boolean, forceRefresh?: boolean): Promise<any[]>;
  getPostBySlug(slug: string): Promise<any | null>;
  getPostByHash(hash: string): Promise<any | null>;
  getPostByPath(path: string): Promise<any | null>;
  augmentPostsByProperty(keys: string[], property: string, options?: any): Promise<any[]>;
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
export const OpenAiToolSpec: Record<string, any>;
export const toolSpecs: Record<string, any>;

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