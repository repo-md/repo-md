/**
 * Nuxt 3 server plugin template for RepoMD
 * 
 * This file should be copied to the user's server/plugins directory
 * or auto-loaded by the Nuxt module.
 * 
 * Since this will run in the Nitro context where defineNitroPlugin
 * and useRuntimeConfig are available, we provide this as a template.
 */

// This is a template that users should copy to their server/plugins directory
export const nuxtPluginTemplate = `
// server/plugins/repo-md.ts
import { nuxtRepoMdPlugin } from 'repo-md';

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();
  const repoMdConfig = config.public.repoMd;

  if (!repoMdConfig?.projectId) {
    console.warn('RepoMD: No projectId found in runtime config');
    return;
  }

  // Create and apply the plugin - pass the entire config object
  // UnifiedProxyConfig will handle the defaults
  const plugin = nuxtRepoMdPlugin(repoMdConfig.projectId, repoMdConfig);

  // The plugin function expects nitroApp to be passed
  return plugin(nitroApp);
});
`;

// Export a placeholder default
export default {
  install() {
    console.log('This is a template file. Copy the following to your server/plugins/repo-md.ts:');
    console.log(nuxtPluginTemplate);
  }
};