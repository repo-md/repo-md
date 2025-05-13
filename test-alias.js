// Test script to verify the alias mechanism
import { RepoMD } from './src/lib/index.js';

// Create an instance with debug enabled to see the deprecation warnings
const repo = new RepoMD({
  debug: true
});

// Test the alias for getSqliteURL
async function testAliases() {
  console.log('\n--- Testing alias mechanism ---\n');
  
  try {
    // This should use the alias and show a deprecation warning
    const url1 = await repo.getSqliteURL();
    console.log('URL from alias method:', url1);
    
    // This should use the primary method without a warning
    const url2 = await repo.getSqliteUrl();
    console.log('URL from primary method:', url2);
    
    console.log('\nBoth URLs should be identical.');
  } catch (error) {
    console.error('Error testing aliases:', error);
  } finally {
    // Clean up
    repo.destroy();
  }
}

testAliases();