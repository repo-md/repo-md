interface CreateOptions {
    template?: string;
}
/**
 * Create a new RepoMD project
 */
export declare function create(directory: string, options: CreateOptions): Promise<void>;
export {};
