/**
 * Nuxt 3 module configuration for RepoMD
 * 
 * This file exports configuration and instructions for creating a Nuxt module.
 * Users should create the module in their own nuxt.config.ts file where
 * @nuxt/kit is available.
 * 
 * Usage in nuxt.config.ts:
 * 
 * import { defineNuxtModule, addServerPlugin, createResolver } from '@nuxt/kit'
 * import { nuxtRepoMdModuleConfig } from 'repo-md/integrations/nuxt-module'
 * 
 * const repoMdModule = defineNuxtModule({
 *   ...nuxtRepoMdModuleConfig,
 *   setup(options, nuxt) {
 *     // Module setup logic
 *   }
 * })
 * 
 * export default defineNuxtConfig({
 *   modules: [repoMdModule]
 * })
 */

// Export the module configuration
// Defaults are centralized in UnifiedProxyConfig, so we only need minimal config here
export const nuxtRepoMdModuleConfig = {
  meta: {
    name: 'repo-md',
    configKey: 'repoMd',
  },
  // Only specify what's required - other defaults come from UnifiedProxyConfig
  defaults: {
    projectId: undefined, // User must provide this
  },
};

/**
 * Helper function to create the module setup
 * This returns the setup function to be used with defineNuxtModule
 * 
 * @returns {Function} Setup function for the Nuxt module
 */
export function createNuxtModuleSetup() {
  return function setup(options, nuxt) {
    if (!options.projectId) {
      console.warn('RepoMD: No projectId provided. The module will not work properly.');
      return;
    }

    // Note: These imports should be done in the user's nuxt.config.ts
    // const { createResolver, addServerPlugin } = await import('@nuxt/kit');
    
    // Add runtime config - only pass what's provided, let UnifiedProxyConfig handle defaults
    nuxt.options.runtimeConfig.public.repoMd = options;

    // The user should handle the plugin registration in their config
    console.log('RepoMD: Remember to add the server plugin using addServerPlugin()');
  };
}

/**
 * Example module creation code for documentation
 * Users should copy this to their nuxt.config.ts
 */
export const nuxtModuleExample = `
// In your nuxt.config.ts:
import { defineNuxtModule, addServerPlugin, createResolver } from '@nuxt/kit'
import { nuxtRepoMdModuleConfig } from 'repo-md'

const repoMdModule = defineNuxtModule({
  ...nuxtRepoMdModuleConfig,
  setup(options, nuxt) {
    if (!options.projectId) {
      console.warn('RepoMD: No projectId provided.');
      return;
    }

    const resolver = createResolver(import.meta.url);

    // Add runtime config - only pass what's provided, let UnifiedProxyConfig handle defaults
    nuxt.options.runtimeConfig.public.repoMd = options;

    // Add the server plugin
    addServerPlugin({
      src: resolver.resolve('node_modules/repo-md/dist/integrations/nuxt-plugin.mjs'),
      mode: 'server',
    });
  },
});

export default defineNuxtConfig({
  modules: [repoMdModule],
  repoMd: {
    projectId: 'your-project-id'
  }
})
`;

// For backward compatibility, export a default that logs instructions
export default {
  install() {
    console.log('RepoMD Nuxt Module: Please use the module configuration in your nuxt.config.ts');
    console.log('See the example:', nuxtModuleExample);
  }
};