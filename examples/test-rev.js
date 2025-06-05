// Test file to verify RepoMD works with a specific revision

import { RepoMD } from '../dist/repo-md.js';

// Test with a specific revision 
const repomd = new RepoMD({ 
  projectId: '680e97604a0559a192640d2c',
  rev: 'abc123', // Specific revision instead of 'latest'
  debug: true
});

// Fetch a resource - this will test if the URL generator works correctly
repomd.getR2Url('/test.json')
  .then(url => {
    console.log('Successfully generated URL:', url);
    console.log('Test successful!');
  })
  .catch(error => {
    console.error('Error during test:', error);
  });