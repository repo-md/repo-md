// Test the inference method schemas

import { validateFunctionParams, getMethodDescription } from './src/lib/schemas/types.js';

console.log('Testing inference method schemas...\n');

// Test computeTextEmbedding schema
console.log('=== Testing computeTextEmbedding Schema ===');

// Valid case
const validTextParams = { text: "Hello world", instruction: "Represent the document:" };
const textResult = validateFunctionParams('computeTextEmbedding', validTextParams);
console.log('✓ Valid text embedding params:', textResult.success);

// Invalid case - empty text
const invalidTextParams = { text: "" };
const invalidTextResult = validateFunctionParams('computeTextEmbedding', invalidTextParams);
console.log('✓ Invalid text embedding params (empty text):', !invalidTextResult.success);
console.log('  Error:', invalidTextResult.error);

// Test computeClipTextEmbedding schema
console.log('\n=== Testing computeClipTextEmbedding Schema ===');

// Valid case
const validClipTextParams = { text: "A beautiful sunset" };
const clipTextResult = validateFunctionParams('computeClipTextEmbedding', validClipTextParams);
console.log('✓ Valid CLIP text embedding params:', clipTextResult.success);

// Invalid case - empty text
const invalidClipTextParams = { text: "" };
const invalidClipTextResult = validateFunctionParams('computeClipTextEmbedding', invalidClipTextParams);
console.log('✓ Invalid CLIP text embedding params (empty text):', !invalidClipTextResult.success);

// Test computeClipImageEmbedding schema
console.log('\n=== Testing computeClipImageEmbedding Schema ===');

// Valid case - with URL
const validImageUrlParams = { image: "https://example.com/image.jpg" };
const imageUrlResult = validateFunctionParams('computeClipImageEmbedding', validImageUrlParams);
console.log('✓ Valid CLIP image embedding params (URL):', imageUrlResult.success);

// Valid case - with base64 data
const validImageDataParams = { image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" };
const imageDataResult = validateFunctionParams('computeClipImageEmbedding', validImageDataParams);
console.log('✓ Valid CLIP image embedding params (base64):', imageDataResult.success);

// Invalid case - empty string
const invalidEmptyParams = { image: "" };
const invalidEmptyResult = validateFunctionParams('computeClipImageEmbedding', invalidEmptyParams);
console.log('✓ Invalid CLIP image embedding params (empty string):', !invalidEmptyResult.success);
console.log('  Error:', invalidEmptyResult.error);

// Invalid case - missing parameter
const invalidMissingParams = {};
const invalidMissingResult = validateFunctionParams('computeClipImageEmbedding', invalidMissingParams);
console.log('✓ Invalid CLIP image embedding params (missing parameter):', !invalidMissingResult.success);

// Test method descriptions
console.log('\n=== Testing Method Descriptions ===');

const textDesc = getMethodDescription('computeTextEmbedding');
console.log('✓ computeTextEmbedding description:', textDesc.description.substring(0, 50) + '...');
console.log('✓ computeTextEmbedding category:', textDesc.category);

const clipTextDesc = getMethodDescription('computeClipTextEmbedding');
console.log('✓ computeClipTextEmbedding description:', clipTextDesc.description.substring(0, 50) + '...');
console.log('✓ computeClipTextEmbedding category:', clipTextDesc.category);

const clipImageDesc = getMethodDescription('computeClipImageEmbedding');
console.log('✓ computeClipImageEmbedding description:', clipImageDesc.description.substring(0, 50) + '...');
console.log('✓ computeClipImageEmbedding category:', clipImageDesc.category);

console.log('\n🎉 Schema validation tests completed!');