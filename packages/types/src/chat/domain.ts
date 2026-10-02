/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

// Kept free of zod so runtime consumers such as the widget can import these
// enums without bundling the schemas.

export enum StdEventType {
  message = "message",
  delivery = "delivery",
  read = "read",
  typing = "typing",
  follow = "follow",
  echo = "echo",
  error = "error",
  unknown = "",
}
