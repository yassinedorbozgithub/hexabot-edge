/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Role } from "@hexabot-ai/types";
import { TextField } from "@mui/material";
import { FC, Fragment, useEffect } from "react";
import { useForm } from "react-hook-form";

import { ContentItem, EntityFormShell } from "@/app-components/dialogs";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import { EntityType } from "@/services/types";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";

type RoleAttributes = EntityAttributes<EntityType.ROLE>;

export const RoleForm: FC<ComponentFormProps<Role>> = ({
  data: { defaultValues: role },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { save } = useUpsert(EntityType.ROLE, rest);
  const {
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<RoleAttributes>({
    defaultValues: { name: "" },
  });
  const validationRules = {
    name: {
      required: t("message.name_is_required"),
    },
  };
  const onSubmitForm = (params: RoleAttributes) => {
    save(role?.id ?? null, params);
  };

  useEffect(() => {
    if (role) {
      reset({
        name: role.name,
      });
    } else {
      reset();
    }
  }, [role, reset]);

  return (
    <EntityFormShell
      Wrapper={Wrapper}
      WrapperProps={WrapperProps}
      onSubmit={handleSubmit(onSubmitForm)}
    >
      <ContentItem>
        <TextField
          label={t("placeholder.name")}
          error={!!errors.name}
          required
          autoFocus
          helperText={errors.name ? errors.name.message : null}
          {...register("name", validationRules.name)}
        />
      </ContentItem>
    </EntityFormShell>
  );
};
