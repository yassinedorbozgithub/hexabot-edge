/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { Credential } from "@hexabot-ai/types";
import { TextField } from "@mui/material";
import { FC, Fragment, useEffect } from "react";
import { useForm } from "react-hook-form";

import { EntityType } from "@/api/types";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import { ContentItem, EntityFormShell } from "@/shared/dialogs";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";

type CredentialWithValue = Credential & {
  value?: string;
};

type CredentialAttributes = EntityAttributes<EntityType.CREDENTIAL>;

export const CredentialForm: FC<ComponentFormProps<Credential>> = ({
  data: { defaultValues: credential },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { save } = useUpsert(EntityType.CREDENTIAL, rest);
  const {
    reset,
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<CredentialAttributes>({
    defaultValues: {
      name: credential?.name || "",
      value: (credential as CredentialWithValue | null)?.value || "",
    },
  });
  const validationRules = {
    name: {
      required: t("message.name_is_required"),
    },
    value: {
      required: t("message.value_is_required"),
    },
  };
  const onSubmitForm = (params: CredentialAttributes) => {
    save(credential?.id ?? null, params);
  };

  useEffect(() => {
    if (credential) {
      reset({
        name: credential.name,
        value: (credential as CredentialWithValue | null)?.value || "",
      });
    } else {
      reset();
    }
  }, [credential, reset]);

  return (
    <EntityFormShell
      Wrapper={Wrapper}
      WrapperProps={WrapperProps}
      onSubmit={handleSubmit(onSubmitForm)}
    >
      <ContentItem>
        <TextField
          label={t("label.name")}
          error={!!errors.name}
          required
          autoFocus
          helperText={errors.name ? errors.name.message : null}
          {...register("name", validationRules.name)}
        />
      </ContentItem>
      <ContentItem>
        <TextField
          label={t("label.value")}
          error={!!errors.value}
          required
          multiline={true}
          minRows={3}
          helperText={errors.value ? errors.value.message : null}
          {...register("value", validationRules.value)}
        />
      </ContentItem>
    </EntityFormShell>
  );
};
