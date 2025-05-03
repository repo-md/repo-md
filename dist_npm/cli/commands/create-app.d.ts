interface CreateAppOptions {
    template: string;
}
/**
 * Create a new app from a template
 */
export declare function createApp(directory: string, options: CreateAppOptions): Promise<void>;
export {};
