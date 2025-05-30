#!/usr/bin/env node

/**
 * Test to ensure all exposed RepoMD methods have corresponding Zod schemas
 * This test helps maintain consistency between the API surface and validation layer
 */

// Import schemas directly to avoid CommonJS import issues
import { schemas } from './src/lib/schemas/schemas.js';

// Import the RepoMD class definition to get method names
// We'll read the index.d.ts file to get method signatures instead of importing the class
import { readFileSync } from 'fs';

// ANSI color codes for pretty output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

/**
 * Get all public methods from RepoMD by parsing the TypeScript definition file
 * @returns {string[]} Array of method names
 */
function getRepoMDMethods() {
  try {
    // Read the TypeScript definition file
    const dtsContent = readFileSync('./src/lib/index.d.ts', 'utf8');
    
    // Extract method names from the RepoMD class definition
    const methods = [];
    const lines = dtsContent.split('\n');
    let insideRepoMDClass = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering the RepoMD class
      if (trimmedLine.includes('export class RepoMD') || trimmedLine.includes('class RepoMD')) {
        insideRepoMDClass = true;
        continue;
      }
      
      // Check if we're exiting the class
      if (insideRepoMDClass && trimmedLine === '}') {
        break;
      }
      
      // Extract method signatures inside the class
      if (insideRepoMDClass && trimmedLine.includes('(') && trimmedLine.includes(')')) {
        // Match method signatures like: methodName(...): returnType;
        const methodMatch = trimmedLine.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\(/);
        if (methodMatch) {
          const methodName = methodMatch[1];
          // Exclude constructor and private methods
          if (methodName !== 'constructor' && !methodName.startsWith('_')) {
            methods.push(methodName);
          }
        }
      }
    }
    
    return methods.sort();
  } catch (error) {
    console.warn(`Warning: Could not read TypeScript definitions: ${error.message}`);
    console.warn('Falling back to known method list...');
    
    // Fallback to a known list of methods (update this as needed)
    return [
      'fetchProjectDetails',
      'getAllPosts',
      'getAllMedia',
      'getRecentPosts',
      'getPostBySlug',
      'getPostByHash',
      'getPostByPath',
      'getSimilarPostsBySlug',
      'getSimilarPostsByHash',
      'getSimilarPostsHashByHash',
      'getFileContent',
      'getPostsSimilarityByHashes',
      'getGraph',
      'getR2Url',
      'getR2ProjectUrl',
      'getR2RevUrl',
      'createViteProxy',
      'fetchPublicApi',
      'getActiveProjectRev',
      'getMediaItems',
      'getPostsEmbeddings',
      'getPostsSimilarity',
      'getTopSimilarPostsHashes',
      'getSqliteUrl',
      'getClientStats',
      'fetchProjectActiveRev',
      'handleOpenAiRequest',
      'createOpenAiToolHandler',
      'fetchR2Json',
      'fetchJson',
      'getReleaseInfo',
      'getProjectMetadata'
    ].sort();
  }
}

/**
 * Get all available schema names
 * @returns {string[]} Array of schema names
 */
function getSchemaNames() {
  return Object.keys(schemas).sort();
}

/**
 * Analyze schema coverage and report results
 */
function analyzeSchemaProfile() {
  const repoMethods = getRepoMDMethods();
  const schemaNames = getSchemaNames();
  
  // Find methods without schemas
  const methodsWithoutSchemas = repoMethods.filter(method => !schemaNames.includes(method));
  
  // Find schemas without corresponding methods (might be aliases or deprecated)
  const schemasWithoutMethods = schemaNames.filter(schema => !repoMethods.includes(schema));
  
  // Calculate coverage percentage
  const methodsWithSchemas = repoMethods.filter(method => schemaNames.includes(method));
  const coveragePercentage = Math.round((methodsWithSchemas.length / repoMethods.length) * 100);
  
  // Print results
  console.log(`${colors.bold}${colors.blue}=== RepoMD Schema Coverage Analysis ===${colors.reset}\n`);
  
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total RepoMD methods: ${repoMethods.length}`);
  console.log(`  Total schemas: ${schemaNames.length}`);
  console.log(`  Methods with schemas: ${methodsWithSchemas.length}`);
  console.log(`  Coverage: ${coveragePercentage >= 90 ? colors.green : coveragePercentage >= 75 ? colors.yellow : colors.red}${coveragePercentage}%${colors.reset}\n`);
  
  if (methodsWithoutSchemas.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Methods without schemas (${methodsWithoutSchemas.length}):${colors.reset}`);
    for (const method of methodsWithoutSchemas) {
      console.log(`  ${colors.red}• ${method}${colors.reset}`);
    }
    console.log();
  } else {
    console.log(`${colors.green}${colors.bold}✅ All methods have schemas!${colors.reset}\n`);
  }
  
  if (schemasWithoutMethods.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  Schemas without corresponding methods (${schemasWithoutMethods.length}):${colors.reset}`);
    console.log(`${colors.yellow}   (These might be aliases, deprecated, or internal schemas)${colors.reset}`);
    for (const schema of schemasWithoutMethods) {
      console.log(`  ${colors.yellow}• ${schema}${colors.reset}`);
    }
    console.log();
  }
  
  if (methodsWithSchemas.length > 0) {
    console.log(`${colors.green}${colors.bold}✅ Methods with schemas (${methodsWithSchemas.length}):${colors.reset}`);
    for (const method of methodsWithSchemas) {
      console.log(`  ${colors.green}• ${method}${colors.reset}`);
    }
    console.log();
  }
  
  // Return test result
  return {
    passed: methodsWithoutSchemas.length === 0,
    coverage: coveragePercentage,
    methodsWithoutSchemas,
    schemasWithoutMethods,
    totalMethods: repoMethods.length,
    totalSchemas: schemaNames.length
  };
}

/**
 * Validate that all schemas are properly formed
 */
function validateSchemaStructure() {
  console.log(`${colors.bold}${colors.blue}=== Schema Structure Validation ===${colors.reset}\n`);
  
  const schemaNames = getSchemaNames();
  const invalidSchemas = [];
  
  for (const schemaName of schemaNames) {
    const schema = schemas[schemaName];
    try {
      // Check if schema has the expected Zod structure
      if (!schema || !schema._def || typeof schema._def.shape !== 'function') {
        invalidSchemas.push({
          name: schemaName,
          error: 'Invalid schema structure - missing _def or shape function'
        });
        continue;
      }
      
      // Try to get the shape to validate it's accessible
      const shape = schema._def.shape();
      if (!shape || typeof shape !== 'object') {
        invalidSchemas.push({
          name: schemaName,
          error: 'Invalid schema shape - shape() did not return an object'
        });
        continue;
      }
      
      // Test basic parsing with empty object (should either succeed or fail with validation error)
      try {
        schema.parse({});
      } catch (error) {
        // This is expected for schemas with required fields
        if (!error.name || error.name !== 'ZodError') {
          invalidSchemas.push({
            name: schemaName,
            error: `Schema parsing failed with unexpected error: ${error.message}`
          });
        }
      }
      
    } catch (error) {
      invalidSchemas.push({
        name: schemaName,
        error: `Schema validation failed: ${error.message}`
      });
    }
  }
  
  if (invalidSchemas.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Invalid schemas (${invalidSchemas.length}):${colors.reset}`);
    for (const { name, error } of invalidSchemas) {
      console.log(`  ${colors.red}• ${name}: ${error}${colors.reset}`);
    }
    console.log();
  } else {
    console.log(`${colors.green}${colors.bold}✅ All schemas are properly structured!${colors.reset}\n`);
  }
  
  return {
    passed: invalidSchemas.length === 0,
    invalidSchemas
  };
}

/**
 * Main test function
 */
function main() {
  console.log(`${colors.bold}Running RepoMD Schema Coverage Test...${colors.reset}\n`);
  
  try {
    // Run schema structure validation
    const structureResults = validateSchemaStructure();
    
    // Run coverage analysis
    const coverageResults = analyzeSchemaProfile();
    
    // Print final results
    console.log(`${colors.bold}${colors.blue}=== Test Results ===${colors.reset}`);
    
    if (structureResults.passed && coverageResults.passed) {
      console.log(`${colors.green}${colors.bold}🎉 ALL TESTS PASSED!${colors.reset}`);
      console.log(`${colors.green}✅ Schema structure: Valid${colors.reset}`);
      console.log(`${colors.green}✅ Schema coverage: 100% (${coverageResults.totalMethods}/${coverageResults.totalMethods} methods)${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bold}❌ TESTS FAILED!${colors.reset}`);
      
      if (!structureResults.passed) {
        console.log(`${colors.red}❌ Schema structure: ${structureResults.invalidSchemas.length} invalid schemas${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Schema structure: Valid${colors.reset}`);
      }
      
      if (!coverageResults.passed) {
        console.log(`${colors.red}❌ Schema coverage: ${coverageResults.coverage}% (${coverageResults.methodsWithoutSchemas.length} methods missing schemas)${colors.reset}`);
      } else {
        console.log(`${colors.green}✅ Schema coverage: 100%${colors.reset}`);
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Test execution failed:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeSchemaProfile, validateSchemaStructure };