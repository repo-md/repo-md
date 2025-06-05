/**
 * RepoMD Logger Test
 * 
 * This script demonstrates the enhanced logging functionality in RepoMD.
 * It creates a RepoMD instance with debug enabled and calls various methods
 * to show how the parameters and results are logged.
 */

import { RepoMD } from '../src/lib/index.js';

// Create a RepoMD instance with debug enabled
const repoMd = new RepoMD({ 
  projectId: "680e97604a0559a192640d2c",
  debug: true,
});

async function testLogging() {
  console.log('Testing method calls with various parameter types...\n');
  
  // Simple method with string parameter
  await repoMd.getPostBySlug('example-post');
  
  // Method with object parameter
  await repoMd.getPostBySlug({ slug: 'example-post-2' });
  
  // Method with multiple parameters including options object
  await repoMd.getSimilarPostsBySlug('post-with-similar', 5, { includeContent: true });
  
  // Method with complex parameter
  await repoMd.fetchPublicApi('/complex/path');
  
  // Method with optional parameters that have default values
  await repoMd.getAllPosts(true, false);
  
  // Method with no parameters
  await repoMd.getPostsEmbeddings();
  
  console.log('\nTesting completed! Check the logs above to see the formatted output.');
}

// Run the test
testLogging().catch(error => {
  console.error('Test failed:', error);
});