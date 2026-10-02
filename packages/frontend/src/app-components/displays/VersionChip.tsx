/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { WorkflowVersion } from "@hexabot-ai/types";
import { Chip, type ChipProps } from "@mui/material";

import { useTranslate } from "@/hooks/useTranslate";

export type VersionChipProps = Omit<
  ChipProps,
  "label" | "size" | "variant" | "color"
> & {
  version: WorkflowVersion | null;
};

export const VersionChip = ({ version, ...rest }: VersionChipProps) => {
  const { t } = useTranslate();
  const resolvedLabel =
    typeof version?.version === "number"
      ? t("visual_editor.workflow_versions.version", { 0: version.version })
      : undefined;

  if (!resolvedLabel) return null;

  return <Chip size="small" label={resolvedLabel} {...rest} />;
};
