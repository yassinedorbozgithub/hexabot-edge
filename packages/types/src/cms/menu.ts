/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { z } from "zod";

import { asId, withAliases } from "../shared/aliases";
import { baseStubSchema } from "../shared/base";
import { preprocess } from "../shared/preprocess";

import { MenuType } from "./domain";

const menuTypeSchema = z.enum(MenuType);
const menuAliasMap = {
  parentId: "parent",
} as const;
const menuStubObjectSchema = baseStubSchema.extend({
  title: z.string(),
  type: menuTypeSchema,
  payload: z.string().nullish(),
  url: z.string().nullish(),
});

export const menuStubSchema = menuStubObjectSchema;

export const menuSchema = preprocess(
  (value) => withAliases(value, menuAliasMap),
  menuStubObjectSchema.extend({
    parent: preprocess(
      (value) => (value == null ? null : asId(value)),
      z.string().nullable(),
    ).optional(),
  }),
);

export const menuFullSchema = menuStubObjectSchema.extend({
  parent: menuSchema.nullish(),
  children: preprocess(
    (value) => (Array.isArray(value) ? value : []),
    z.array(menuSchema),
  ).optional(),
});

export type MenuStub = z.infer<typeof menuStubSchema>;

export type Menu = z.infer<typeof menuSchema>;

export type MenuFull = z.infer<typeof menuFullSchema>;
