/**
 * Environment variable utilities shared across RepoMD
 */

/**
 * Get project ID from environment variables
 * @param {string} [projectId] - Optional project ID override
 * @param {string} [context] - Context for better error messages
 * @returns {string} The project ID
 * @throws {Error} If no project ID is found
 */
export function getProjectIdFromEnv(projectId, context = '') {
  // If projectId is provided, use it
  if (projectId) {
    return projectId;
  }

  // Check if we're in a browser environment
  if (typeof process === 'undefined' || !process.env) {
    return null;
  }

  // Try multiple common environment variable names
  const envVars = {
    'REPO_MD_PROJECT_ID': process.env.REPO_MD_PROJECT_ID,
    'REPOMD_PROJECT_ID': process.env.REPOMD_PROJECT_ID,
    'NEXT_PUBLIC_REPO_MD_PROJECT_ID': process.env.NEXT_PUBLIC_REPO_MD_PROJECT_ID,
    'VITE_REPO_MD_PROJECT_ID': process.env.VITE_REPO_MD_PROJECT_ID,
    'REACT_APP_REPO_MD_PROJECT_ID': process.env.REACT_APP_REPO_MD_PROJECT_ID,
  };
  
  // Find the first defined env var
  const envProjectId = Object.values(envVars).find(val => val);
  
  if (!envProjectId) {
    const contextMsg = context ? ` in your ${context} config` : '';
    const envVarsList = Object.keys(envVars).map(key => `  ${key}=your-project-id`).join('\n');
    
    throw new Error(
      `\n🚨 RepoMD Project ID Missing!\n\n` +
      `The REPO_MD_PROJECT_ID environment variable needs to be configured, or passed directly${contextMsg}.\n\n` +
      `Option 1: Set an environment variable (recommended):\n${envVarsList}\n\n` +
      `Option 2: Pass it directly${contextMsg}:\n` +
      `  ${getExampleForContext(context)}\n\n` +
      `Learn more: https://docs.repo.md/configuration`
    );
  }
  
  return envProjectId;
}

/**
 * Get context-specific example for error messages
 * @param {string} context - The context string
 * @returns {string} Example code snippet
 */
function getExampleForContext(context) {
  const examples = {
    'Next.js middleware': `nextRepoMdMiddleware({ projectId: 'your-project-id' })`,
    'Next.js config': `nextRepoMdConfig({ projectId: 'your-project-id' })`,
    'Vite proxy': `viteRepoMdProxy({ projectId: 'your-project-id' })`,
    'Remix loader': `remixRepoMdLoader({ projectId: 'your-project-id' })`,
    'RepoMD constructor': `new RepoMD({ projectId: 'your-project-id' })`,
    '': `{ projectId: 'your-project-id' }`,
  };
  
  return examples[context] || examples[''];
}