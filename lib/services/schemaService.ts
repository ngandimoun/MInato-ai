import { logger } from "../../memory-framework/config";
import Ajv, { ValidateFunction } from "ajv";

interface SchemaDefinition {
  name: string;
  version: string;
  schema: object;
  validator?: (data: any) => boolean;
}

const SCHEMA_VERSIONS: Record<string, SchemaDefinition> = {
  'tool_router_v1_1': {
    name: 'tool_router',
    version: '1_1',
    schema: {
      type: "object",
      properties: {
        planned_tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool_name: { type: "string" },
              arguments: { 
                type: "object",
                additionalProperties: true,
                properties: {}
              },
              reason: { type: "string" }
            },
            required: ["tool_name", "reason"],
            additionalProperties: false
          }
        }
      },
      required: ["planned_tools"],
      additionalProperties: false
    }
  }
};

export class SchemaService {
  static validate(schemaName: string, data: any): boolean {
    const schemaDef = SCHEMA_VERSIONS[schemaName];
    if (!schemaDef) {
      logger.error(`[SchemaService] Unknown schema: ${schemaName}`);
      return false;
    }

    const ajv = new Ajv();
    const validate: ValidateFunction = ajv.compile(schemaDef.schema);
    const valid = validate(data) as boolean;
    
    if (!valid) {
      logger.error(`[SchemaService] Validation failed for ${schemaName}:`, validate.errors);
    }
    
    return valid;
  }

  static getLatestVersion(schemaType: string): SchemaDefinition | null {
    const versions = Object.values(SCHEMA_VERSIONS)
      .filter(s => s.name === schemaType)
      .sort((a, b) => b.version.localeCompare(a.version));
    
    return versions.length > 0 ? versions[0] : null;
  }
} 