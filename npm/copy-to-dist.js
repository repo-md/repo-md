#!/usr/bin/env node

/**
 * This script copies the package.json and README.md from the npm folder
 * to the dist folder after the build is complete.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "terser";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const npmDir = __dirname;
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const cliNpmDir = path.join(npmDir, "cli");
const cliDistDir = path.join(distDir, "cli");

// Files to copy
const files = [
  "package.json", // that's the package.json for the npm package, not the one in the root
  // 'README.md'
];

// Additional root files to copy
const rootFiles = [
  "README.md",
  // "NPM_PUBLISH.md"
];

// Handle minified version if MINIFY environment variable is set
const isMinify = process.env.MINIFY === 'true';

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  console.error(
    "Dist directory does not exist. Make sure to run the build first."
  );
  process.exit(1);
}

// Create cli directory in dist if it doesn't exist
if (!fs.existsSync(cliDistDir)) {
  fs.mkdirSync(cliDistDir, { recursive: true });
  console.log("Created CLI directory in dist folder");
}

// Copy package files to dist
files.forEach((file) => {
  const srcPath = path.join(npmDir, file);
  const destPath = path.join(distDir, file);

  try {
    const content = fs.readFileSync(srcPath, "utf8");
    fs.writeFileSync(destPath, content);
    console.log(`Successfully copied ${file} to dist folder`);
  } catch (error) {
    console.error(`Error copying ${file}:`, error);
    process.exit(1);
  }
});

// Copy root files to dist
rootFiles.forEach((file) => {
  const srcPath = path.join(rootDir, file);
  const destPath = path.join(distDir, file);

  try {
    if (fs.existsSync(srcPath)) {
      const content = fs.readFileSync(srcPath, "utf8");
      fs.writeFileSync(destPath, content);
      console.log(`Successfully copied ${file} to dist folder`);
    } else {
      console.warn(`Warning: ${file} not found in root directory, skipping`);
    }
  } catch (error) {
    console.error(`Error copying ${file}:`, error);
    // Don't exit for optional files
  }
});

// Copy CLI files from npm/cli to dist/cli if they exist
if (fs.existsSync(cliNpmDir)) {
  try {
    // Check if CLI files exist
    const cliFiles = fs.readdirSync(cliNpmDir);

    for (const file of cliFiles) {
      const srcPath = path.join(cliNpmDir, file);
      const destPath = path.join(cliDistDir, file);

      // Check if it's a directory or file
      const stats = fs.statSync(srcPath);

      if (stats.isDirectory()) {
        // Create the directory in dist
        if (!fs.existsSync(destPath)) {
          fs.mkdirSync(destPath, { recursive: true });
        }

        // Copy all files inside the directory
        const dirFiles = fs.readdirSync(srcPath);
        for (const dirFile of dirFiles) {
          const dirSrcPath = path.join(srcPath, dirFile);
          const dirDestPath = path.join(destPath, dirFile);

          if (fs.statSync(dirSrcPath).isFile()) {
            const dirContent = fs.readFileSync(dirSrcPath, "utf8");
            fs.writeFileSync(dirDestPath, dirContent);
          }
        }
      } else {
        // It's a file, copy it
        const content = fs.readFileSync(srcPath, "utf8");

        // For the main CLI file, ensure it has the shebang
        if (file === "repo-md-cli.js") {
          let cliContent = content;
          if (!cliContent.startsWith("#!/usr/bin/env node")) {
            cliContent = "#!/usr/bin/env node\n\n" + cliContent;
          }
          fs.writeFileSync(destPath, cliContent);

          // Make executable
          fs.chmodSync(destPath, "755");
        } else {
          fs.writeFileSync(destPath, content);
        }
      }
    }

    console.log("Successfully copied CLI files to dist/cli folder");
  } catch (error) {
    console.error("Error copying CLI files:", error);
  }
} else {
  console.warn(
    "CLI source directory not found. CLI files will not be included."
  );
}

// Create both non-minified and minified UMD files
try {
  const umdFilePath = path.join(distDir, "repo-md.umd.cjs");
  const minFilePath = path.join(distDir, "repo-md.min.umd.cjs");
  
  if (fs.existsSync(umdFilePath)) {
    // Read the UMD file content
    const code = fs.readFileSync(umdFilePath, 'utf8');
    
    // Minify the code using terser with aggressive optimization settings
    console.log("Minifying UMD file with terser (aggressive optimization)...");
    const minifyOptions = {
      compress: {
        drop_console: true,     // Remove console logs in minified version
        passes: 3,              // Increase optimization passes
        pure_getters: true,     // Optimize property access
        unsafe: true,           // Allow "unsafe" optimizations for better compression
        unsafe_comps: true,     // More aggressive optimizations
        unsafe_math: true,      // Allow math optimizations that may affect precision
        sequences: true,        // Join consecutive statements with the comma operator
        dead_code: true,        // Remove unreachable code
        conditionals: true,     // Optimize if-s and conditional expressions
        booleans: true,         // Optimize boolean expressions
        evaluate: true          // Try to evaluate constant expressions
      },
      mangle: {
        properties: false       // Don't mangle property names to avoid breaking the API
      },
      format: {
        comments: false         // Remove all comments
      }
    };
    
    // Run the minification asynchronously
    const minified = await minify(code, minifyOptions);
    
    // Write the minified code to the output file
    fs.writeFileSync(minFilePath, minified.code);
    
    // Calculate file size reduction
    const originalSize = Buffer.byteLength(code, 'utf8');
    const minifiedSize = Buffer.byteLength(minified.code, 'utf8');
    const reduction = Math.round((1 - minifiedSize / originalSize) * 100);
    
    console.log(`Successfully created minified UMD file (${reduction}% smaller)`);
  }
} catch (error) {
  console.error("Error creating minified UMD file:", error);
  // Fallback to copying if minification fails
  try {
    const umdFilePath = path.join(distDir, "repo-md.umd.cjs");
    const minFilePath = path.join(distDir, "repo-md.min.umd.cjs");
    fs.copyFileSync(umdFilePath, minFilePath);
    console.log("Fallback: Created minified UMD file by copying (minification failed)");
  } catch (fallbackError) {
    console.error("Error in fallback copy:", fallbackError);
  }
}

console.log("All files successfully copied to dist folder");
