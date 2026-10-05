/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z, ZodType } from 'zod';

import type { InputField } from './schema';

/** Convert workflow input field metadata to a zod schema. */
const inputFieldToZod = (field: InputField): ZodType => {
  let schema: ZodType;

  switch (field.type) {
    case 'string':
      schema = z.string();
      break;
    case 'number':
      schema = z.number();
      break;
    case 'integer':
      schema = z.int();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'array':
      schema = z.array(field.items ? inputFieldToZod(field.items) : z.any());
      break;
    case 'object': {
      const properties: Record<string, ZodType> = {};
      if (field.properties) {
        for (const [name, child] of Object.entries(field.properties)) {
          properties[name] = inputFieldToZod(child).optional();
        }
      }
      schema =
        Object.keys(properties).length > 0
          ? z.strictObject(properties).partial()
          : z.record(z.string(), z.any());
      break;
    }
    default:
      schema = z.any();
  }

  if (field.enum) {
    schema = schema.refine(
      (value) => field.enum?.some((allowed) => allowed === value),
      {
        message: `Value must be one of: ${field.enum.join(', ')}`,
      },
    );
  }

  return schema;
};

/** Assemble a parser for the workflow top-level input payload. */
export const buildInputParser = (
  schema?: Record<string, InputField>,
): ZodType<Record<string, unknown>> => {
  if (!schema || Object.keys(schema).length === 0) {
    return z.looseObject({});
  }

  const shape: Record<string, ZodType> = {};

  for (const [name, field] of Object.entries(schema)) {
    shape[name] = inputFieldToZod(field).optional();
  }

  return z.strictObject(shape).partial();
};
