/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { ButtonProps } from "@mui/material";
import type { ComponentType } from "react";

import { TTranslationKeys } from "@/i18n/i18n.types";
import type { ComponentFormDialogProps } from "@/types/common/dialogs.types";

import { GenericFormDialog } from "./GenericFormDialog";

type FormComponent = (arg: { data: any }) => unknown;

export type CreateFormDialogOptions = {
  addText?: TTranslationKeys;
  editText?: TTranslationKeys;
  confirmButtonProps?: ButtonProps & { text?: string };
};

export const createFormDialog = <T extends FormComponent>(
  Form: ComponentType<any>,
  options: CreateFormDialogOptions = {},
) => {
  const CreatedDialog = (props: ComponentFormDialogProps<T>) => (
    <GenericFormDialog Form={Form} {...options} {...props} />
  );

  CreatedDialog.displayName = `${(Form as { displayName?: string; name?: string }).displayName || (Form as { name?: string }).name || "Form"}Dialog`;

  return CreatedDialog;
};
