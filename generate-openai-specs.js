#!/usr/bin/env node

/**
 * Generate OpenAI Tool Specifications and save as JSON reference file
 */

import { writeFileSync } from "fs";
import { OpenAiToolSpec } from "./src/lib/openai/OpenAiToolSpec.js";
import { schemas } from "./src/lib/schemas/schemas.js";

console.log("🔧 Generating OpenAI Tool Specifications");
console.log("=".repeat(50));

const timestamp = new Date().toISOString();
const { functions } = OpenAiToolSpec;

// Create a comprehensive output with metadata
const output = {
  metadata: {
    generatedAt: timestamp,
    totalFunctions: functions.length,
    totalSchemas: Object.keys(schemas).length,
    generator: "Repo.md + OpenAI Tool Spec Generator",
    version: "1.0.0",
  },

  // Complete OpenAI Tool Specification
  toolSpec: OpenAiToolSpec,

  // Summary statistics
  summary: {
    functionNames: functions.map((f) => f.name).sort(),

    // Count properties by type
    propertyTypes: functions.reduce((acc, func) => {
      const props = func.parameters?.properties || {};
      Object.values(props).forEach((prop) => {
        const type = prop.type || "unknown";
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {}),

    // Functions with defaults
    functionsWithDefaults: functions
      .filter((f) =>
        Object.values(f.parameters?.properties || {}).some(
          (p) => p.default !== undefined
        )
      )
      .map((f) => f.name),

    // Functions with required parameters
    functionsWithRequired: functions
      .filter((f) => f.parameters?.required?.length > 0)
      .map((f) => ({
        name: f.name,
        required: f.parameters.required,
      })),

    // Coverage check
    coverage: {
      allSchemasCovered: Object.keys(schemas).every((name) =>
        functions.some((f) => f.name === name)
      ),
      missingSchemasInSpecs: Object.keys(schemas).filter(
        (name) => !functions.some((f) => f.name === name)
      ),
      extraSpecsNotInSchemas: functions
        .filter((f) => !Object.keys(schemas).includes(f.name))
        .map((f) => f.name),
    },
  },
};

// Save to JSON file
const filename = "openai-tool-specs.json";
try {
  writeFileSync(filename, JSON.stringify(output, null, 2), "utf8");
  console.log(`✅ Successfully generated ${filename}`);
} catch (error) {
  console.error(`❌ Failed to write ${filename}:`, error.message);
  process.exit(1);
}

// Display summary
console.log("\n📊 Generation Summary:");
console.log(`   Functions generated: ${output.metadata.totalFunctions}`);
console.log(`   Schemas processed: ${output.metadata.totalSchemas}`);
console.log(
  `   Coverage: ${
    output.summary.coverage.allSchemasCovered ? "✅ Complete" : "❌ Incomplete"
  }`
);

if (output.summary.coverage.missingSchemasInSpecs.length > 0) {
  console.log(
    `   Missing specs: ${output.summary.coverage.missingSchemasInSpecs.join(
      ", "
    )}`
  );
}

if (output.summary.coverage.extraSpecsNotInSchemas.length > 0) {
  console.log(
    `   Extra specs: ${output.summary.coverage.extraSpecsNotInSchemas.join(
      ", "
    )}`
  );
}

console.log(
  `   Functions with defaults: ${output.summary.functionsWithDefaults.length}`
);
console.log(
  `   Functions with required params: ${output.summary.functionsWithRequired.length}`
);

console.log("\n🏷️  Property Type Distribution:");
Object.entries(output.summary.propertyTypes)
  .sort(([, a], [, b]) => b - a)
  .forEach(([type, count]) => {
    console.log(`   ${type}: ${count} properties`);
  });

console.log(`\n📄 Reference file saved: ${filename}`);
console.log(`   Size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
console.log(`   Generated at: ${timestamp}`);

console.log("\n✨ Generation completed successfully!");
