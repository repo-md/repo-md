export interface ContentItem {
  slug: string;
  title: string;
  content: string;
  created: string;
}

export interface RepoClient {
  listSlugs: () => Promise<string[]>;
  load: (slug: string) => Promise<ContentItem>;
}

export interface RepoOptions {
  baseUrl: string;
}

export function createRepo(options: RepoOptions): RepoClient;
export default createRepo;