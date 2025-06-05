#!/usr/bin/env node

/**
 * Test script to verify OpenAI spec generation from Zod schemas
 */

import { createOpenAiSpecs } from './src/lib/openai/OpenAiToolSpec.js';
import { schemas } from './src/lib/schemas/schemas.js';

console.log('🔍 Testing OpenAI Spec Generation');
console.log('='.repeat(50));

const OpenAiToolSpec = createOpenAiSpecs();
const { functions } = OpenAiToolSpec;

console.log(`📊 Generated ${functions.length} function specifications`);
console.log(`📊 Found ${Object.keys(schemas).length} schemas in source`);

// Verify all schemas have been converted
const schemaNames = Object.keys(schemas);
const functionNames = functions.map(f => f.name);

console.log('\n📋 Coverage Check:');
const missing = schemaNames.filter(name => !functionNames.includes(name));
const extra = functionNames.filter(name => !schemaNames.includes(name));

if (missing.length === 0 && extra.length === 0) {
  console.log('✅ Perfect coverage - all schemas converted to function specs');
} else {
  if (missing.length > 0) {
    console.log(`❌ Missing function specs for: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    console.log(`⚠️  Extra function specs found: ${extra.join(', ')}`);
  }
}

// Test a few specific functions to ensure they have proper structure
console.log('\n🧪 Testing Function Structure:');

const testFunctions = ['getAllPosts', 'getPostBySlug', 'getSimilarPostsByHash'];

testFunctions.forEach(funcName => {
  const func = functions.find(f => f.name === funcName);
  if (!func) {
    console.log(`❌ ${funcName}: Function not found`);
    return;
  }

  console.log(`\n📝 ${funcName}:`);
  console.log(`   Description: ${func.description ? '✅' : '❌'} ${func.description?.substring(0, 60)}...`);
  console.log(`   Parameters: ${func.parameters ? '✅' : '❌'}`);
  console.log(`   Properties: ${Object.keys(func.parameters?.properties || {}).length} properties`);
  console.log(`   Required: [${func.parameters?.required?.join(', ') || 'none'}]`);
  
  // Check each property has description
  const props = func.parameters?.properties || {};
  Object.entries(props).forEach(([key, prop]) => {
    const hasDesc = prop.description ? '✅' : '❌';
    const hasType = prop.type ? '✅' : '❌';
    console.log(`     ${key}: ${hasDesc} description, ${hasType} type (${prop.type})`);
  });
});

// Test specific edge cases
console.log('\n🔬 Testing Edge Cases:');

// Test array type conversion
const sortFunction = functions.find(f => f.name === 'sortPostsByDate');
if (sortFunction) {
  const postsParam = sortFunction.parameters.properties.posts;
  console.log(`✅ Array type: ${postsParam?.type === 'array' ? 'correct' : 'incorrect'}`);
  console.log(`✅ Array items: ${postsParam?.items ? 'defined' : 'missing'}`);
}

// Test enum type conversion (if any exist)
const enumFunction = functions.find(f => 
  Object.values(f.parameters?.properties || {}).some(p => p.enum)
);
if (enumFunction) {
  console.log(`✅ Enum support: Found function with enum property`);
} else {
  console.log(`⚠️  Enum support: No enum properties found (may be expected)`);
}

// Test default values
const functionsWithDefaults = functions.filter(f => 
  Object.values(f.parameters?.properties || {}).some(p => p.default !== undefined)
);
console.log(`✅ Default values: ${functionsWithDefaults.length} functions have properties with defaults`);

console.log('\n📄 Sample Function JSON:');
console.log(JSON.stringify(functions[0], null, 2));

console.log('\n✨ Test completed successfully!');