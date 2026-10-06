/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { BaseSyntheticEvent, FC, ReactNode } from "react";
import { Fragment } from "react";

import type {
  FormButtonsProps,
  FormDialogProps,
} from "@/types/common/dialogs.types";

import { ContentContainer } from "./layouts/ContentContainer";

export type EntityFormShellProps = FormButtonsProps & {
  Wrapper?: FC<FormDialogProps>;
  WrapperProps?: Partial<FormDialogProps> & Partial<FormButtonsProps>;
  onSubmit: (e?: BaseSyntheticEvent) => void;
  children: ReactNode;
};

export const EntityFormShell: FC<EntityFormShellProps> = ({
  Wrapper = Fragment as unknown as FC<FormDialogProps>,
  WrapperProps,
  onSubmit,
  children,
}) => (
  <Wrapper onSubmit={onSubmit} {...WrapperProps}>
    <form onSubmit={onSubmit}>
      <ContentContainer>{children}</ContentContainer>
    </form>
  </Wrapper>
);
