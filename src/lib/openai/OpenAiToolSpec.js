import { schemas } from "../schemas/schemas.js";

/**
 * Check if a Zod schema is optional (has a default value or is explicitly optional)
 */
function isOptionalSchema(schema) {
  if (!schema || !schema._def) return false;

  // Check if it's explicitly optional
  if (schema._def.typeName === "ZodOptional") return true;

  // Check if it has a default value
  if (schema._def.typeName === "ZodDefault") return true;

  // Check for wrapped optional schemas
  let current = schema;
  while (current?._def) {
    if (
      current._def.typeName === "ZodOptional" ||
      current._def.typeName === "ZodDefault"
    ) {
      return true;
    }
    // Handle nested schemas
    if (current._def.innerType) {
      current = current._def.innerType;
    } else if (current._def.schema) {
      current = current._def.schema;
    } else {
      break;
    }
  }

  return false;
}

/**
 * Convert a Zod schema to OpenAI function parameter specification
 */
function zodToOpenAiSpec(zodSchema, functionName) {
  try {
    const shapeRaw = zodSchema._def.shape;
    const shape = typeof shapeRaw === "function" ? shapeRaw() : shapeRaw;
    const description =
      zodSchema.description || `Execute ${functionName} operation`;

    const properties = {};
    const required = [];

    if (shape && typeof shape === "object") {
      for (const [key, schema] of Object.entries(shape)) {
        const property = convertZodProperty(schema);
        properties[key] = property;

        if (!isOptionalSchema(schema)) {
          required.push(key);
        }
      }
    }

    return {
      name: functionName,
      description,
      parameters: {
        type: "object",
        properties,
        required,
      },
    };
  } catch (error) {
    console.warn(`Failed to convert schema for ${functionName}:`, error);
    return {
      name: functionName,
      description: `Execute ${functionName} operation`,
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    };
  }
}

/**
 * Convert individual Zod property to OpenAI parameter format
 */
function convertZodProperty(schema) {
  const property = {};

  // Extract description from various schema wrapper types
  let description = schema.description || schema._def?.description;

  // For wrapped schemas, check inner types for description
  let current = schema;
  while (current && !description) {
    if (current._def?.description) {
      description = current._def.description;
      break;
    }
    if (current._def?.innerType) {
      current = current._def.innerType;
    } else if (current._def?.schema) {
      current = current._def.schema;
    } else {
      break;
    }
  }

  if (description) {
    property.description = description;
  }

  const typeName = schema._def.typeName;

  switch (typeName) {
    case "ZodString":
      property.type = "string";
      break;
    case "ZodNumber":
      property.type = "number";
      if (schema._def.checks?.some((check) => check.kind === "int")) {
        property.type = "integer";
      }
      break;
    case "ZodBoolean":
      property.type = "boolean";
      break;
    case "ZodArray":
      property.type = "array";
      if (schema._def.type) {
        property.items = convertZodProperty(schema._def.type);
      }
      break;
    case "ZodRecord":
    case "ZodObject":
      property.type = "object";
      break;
    case "ZodEnum":
      property.type = "string";
      property.enum = schema._def.values;
      break;
    case "ZodOptional": {
      const innerProperty = convertZodProperty(schema._def.innerType);
      // Preserve the description from the ZodOptional if the inner type doesn't have one
      if (description && !innerProperty.description) {
        innerProperty.description = description;
      }
      return innerProperty;
    }
    case "ZodDefault": {
      const innerProperty = convertZodProperty(schema._def.innerType);
      innerProperty.default = schema._def.defaultValue();
      // Preserve the description from the ZodDefault if the inner type doesn't have one
      if (description && !innerProperty.description) {
        innerProperty.description = description;
      }
      return innerProperty;
    }
    case "ZodEffects": {
      const innerProperty = convertZodProperty(schema._def.schema);
      // Preserve the description from the ZodEffects if the inner type doesn't have one
      if (description && !innerProperty.description) {
        innerProperty.description = description;
      }
      return innerProperty;
    }
    default:
      property.type = "string";
  }

  return property;
}

/**
 * Generate OpenAI Tool Specifications from Zod schemas
 */
export function createOpenAiSpecs() {
  const functions = [];

  for (const [functionName, schema] of Object.entries(schemas)) {
    const spec = zodToOpenAiSpec(schema, functionName);
    functions.push(spec);
  }

  return {
    type: "function",
    functions,
  };
}

// Generate the OpenAI Tool Specifications
export const OpenAiToolSpec = createOpenAiSpecs();
