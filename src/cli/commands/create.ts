import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, cpSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

// Default template URL if none provided
const DEFAULT_TEMPLATE = 'https://github.com/repo-md/starter-template';

interface CreateOptions {
  template?: string;
}

/**
 * Create a new RepoMD project
 */
export async function create(directory: string, options: CreateOptions): Promise<void> {
  const targetDir = path.resolve(process.cwd(), directory);
  
  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>(resolve => {
      rl.question(`Directory ${directory} already exists. Do you want to overwrite it? (y/N): `, resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborting.');
      return;
    }
    
    // If user confirms, remove the directory
    rmSync(targetDir, { recursive: true, force: true });
  }

  // Create the target directory
  mkdirSync(targetDir, { recursive: true });
  
  // Determine the template source
  let templateUrl = options.template || DEFAULT_TEMPLATE;
  if (!templateUrl.startsWith('http://') && !templateUrl.startsWith('https://')) {
    // If not a URL, assume it's a template name
    templateUrl = `https://github.com/repo-md/${templateUrl}-template`;
  }

  console.log(`Creating new RepoMD project in ${targetDir}...`);
  console.log(`Using template: ${templateUrl}`);
  
  // Create a temporary directory for the template
  const tempDir = path.join(targetDir, '.temp-template');
  mkdirSync(tempDir, { recursive: true });
  
  try {
    // Download the template
    console.log('Downloading template...');
    execSync(`git clone ${templateUrl} ${tempDir}`, { stdio: 'inherit' });
    
    // Remove git information
    const gitDir = path.join(tempDir, '.git');
    if (fs.existsSync(gitDir)) {
      rmSync(gitDir, { recursive: true, force: true });
    }
    
    // Copy all template files to the target directory
    console.log('Copying template files...');
    const templateFiles = fs.readdirSync(tempDir);
    
    for (const file of templateFiles) {
      const srcPath = path.join(tempDir, file);
      const destPath = path.join(targetDir, file);
      
      if (file !== '.git' && file !== '.temp-template') {
        cpSync(srcPath, destPath, { recursive: true });
      }
    }
    
    // Initialize a new git repository
    console.log('Initializing git repository...');
    execSync('git init', { cwd: targetDir, stdio: 'inherit' });
    
    // Create initial commit
    execSync('git add .', { cwd: targetDir, stdio: 'inherit' });
    execSync('git commit -m "repo.md initial commit"', { cwd: targetDir, stdio: 'inherit' });
    
    // Clean up - remove temporary directory
    rmSync(tempDir, { recursive: true, force: true });
    
    console.log('\nProject created successfully! 🎉');
    console.log(`\nNext steps:`);
    console.log(`  cd ${directory}`);
    console.log('  npm install');
    console.log('  npm run dev');
  } catch (error) {
    console.error('Error creating project:', error);
    // Clean up on error
    if (fs.existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}