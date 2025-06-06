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

// Valid case - with imageUrl
const validImageUrlParams = { imageUrl: "https://example.com/image.jpg" };
const imageUrlResult = validateFunctionParams('computeClipImageEmbedding', validImageUrlParams);
console.log('✓ Valid CLIP image embedding params (URL):', imageUrlResult.success);

// Valid case - with imageData
const validImageDataParams = { imageData: "base64encodeddata" };
const imageDataResult = validateFunctionParams('computeClipImageEmbedding', validImageDataParams);
console.log('✓ Valid CLIP image embedding params (base64):', imageDataResult.success);

// Invalid case - both provided
const invalidBothParams = { imageUrl: "https://example.com/image.jpg", imageData: "base64data" };
const invalidBothResult = validateFunctionParams('computeClipImageEmbedding', invalidBothParams);
console.log('✓ Invalid CLIP image embedding params (both provided):', !invalidBothResult.success);
console.log('  Error:', invalidBothResult.error);

// Invalid case - neither provided
const invalidNeitherParams = {};
const invalidNeitherResult = validateFunctionParams('computeClipImageEmbedding', invalidNeitherParams);
console.log('✓ Invalid CLIP image embedding params (neither provided):', !invalidNeitherResult.success);

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