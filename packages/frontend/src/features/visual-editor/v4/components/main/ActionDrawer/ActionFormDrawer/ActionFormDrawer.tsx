/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { StepDrawerSaveFooter } from "../../StepDrawer/StepDrawerParts";
import { withStepDrawerLayout } from "../../StepDrawer/withStepDrawerLayout";

import { ActionFormDrawerContent } from "./ActionFormDrawerContent";
import { ActionFormDrawerHeader } from "./ActionFormDrawerHeader";
import {
  type ActionFormDrawerCloseReason,
  type ActionFormDrawerCreateTarget,
  useActionFormDrawerController,
} from "./useActionFormDrawerController";

const ActionFormDrawerLayout = withStepDrawerLayout(ActionFormDrawerContent);

export type { ActionFormDrawerCloseReason, ActionFormDrawerCreateTarget };

type ActionFormDrawerProps = {
  target: ActionFormDrawerCreateTarget | null;
  onClose?: (reason: ActionFormDrawerCloseReason) => void;
  onBack?: () => void;
};

export const ActionFormDrawer = ({
  target,
  onClose,
  onBack,
}: ActionFormDrawerProps) => {
  const { open, headerProps, footerProps, ...content } =
    useActionFormDrawerController({ target, onClose, onBack });

  return (
    <ActionFormDrawerLayout
      {...content}
      isOpen={open}
      open={open}
      headerContent={<ActionFormDrawerHeader {...headerProps} />}
      footerContent={
        <StepDrawerSaveFooter
          onClick={footerProps.onSave}
          disabled={footerProps.saveDisabled}
          dataTourId="admin-workflow-tour-action-save"
        />
      }
    />
  );
};
