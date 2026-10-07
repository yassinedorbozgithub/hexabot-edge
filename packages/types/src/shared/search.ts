/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

export type TFilterStringFields<T> = {
  [K in keyof T]: T[K] extends string | null | undefined ? K : never;
}[keyof T];

export type IlikeParam<T> = {
  [K in TFilterStringFields<T>]?: { contains: string };
};

export type EqParam<T> = { [key in keyof T]?: T[key] };

export type NeqParam<T> = {
  [key in keyof T]?: {
    "!="?: T[key];
  };
};

export type SearchItem<T> = {
  [K in keyof T]?:
    | T[K]
    | (Extract<T[K], string> extends never
        ? undefined
        : { contains?: Extract<T[K], string> })
    | {
        "!="?: T[K] | T[K][];
      }
    | {
        $in?: T[K] | T[K][];
      };
};
