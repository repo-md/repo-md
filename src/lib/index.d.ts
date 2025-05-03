/**
 * RepoMD - A client for interacting with the repo.md API with quick-lru cache
 */

export interface RepoMDOptions {
  org?: string;
  orgSlug?: string;
  orgId?: string | null;
  project?: string;
  projectId?: string;
  projectSlug?: string;
  rev?: string;
  secret?: string | null;
  debug?: boolean;
}

export class RepoMD {
  constructor(options?: RepoMDOptions);
  
  org: string;
  project: string;
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string | null;
  rev: string;
  debug: boolean;
  secret: string | null;
  activeRev: string | null;

  getR2Url(path?: string): string;
  fetchPublicApi(path?: string): Promise<any>;
  fetchProjectDetails(): Promise<any>;
  getActiveProjectRev(): Promise<string>;
  ensureLatestRev(): Promise<void>;
  fetchJson(url: string, opts?: any, debug?: boolean): Promise<any>;
  getSqliteURL(): Promise<string>;
  getR2MediaUrl(path: string): Promise<string>;
  fetchR2Json(path: string, opts?: any): Promise<any>;
  getAllPosts(useCache?: boolean): Promise<any[]>;
  getAllMedia(useCache?: boolean): Promise<any>;
  getMediaItems(useCache?: boolean): Promise<any[]>;
  getPostById(id: string): Promise<any | null>;
  getPostBySlug(slug: string): Promise<any | null>;
  sortPostsByDate(posts: any[]): any[];
  getRecentPosts(count?: number): Promise<any[]>;
  getReleaseInfo(): Promise<any>;
  handleCloudflareRequest(request: Request): Promise<Response | null>;
}

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