// Simple test script to verify logger wrapper functionality

import { RepoMD } from './src/lib/RepoMd.js';

// Create a RepoMD instance with debug enabled
const repo = new RepoMD({
  debug: true,
  rev: 'latest',
  projectId: '680e97604a0559a192640d2c',
});

// Test different method types
async function runTests() {
  try {
    // Test async method
    console.log('\n--- Testing async method ---');
    const recentPosts = await repo.getRecentPosts(2);
    console.log('Recent posts count:', recentPosts.length);
    
    // Test sync method
    console.log('\n--- Testing sync method ---');
    const stats = repo.getClientStats();
    console.log('Got stats:', stats.posts.totalLoaded);
    
    // Test method that might throw error
    console.log('\n--- Testing error handling ---');
    try {
      await repo.getPostBySlug(); // Should throw due to missing parameter
    } catch (error) {
      console.log('Expected error caught:', error.message);
    }
    
    console.log('\n--- All tests completed ---');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Clean up
    repo.destroy();
  }
}

// Run the tests
runTests();