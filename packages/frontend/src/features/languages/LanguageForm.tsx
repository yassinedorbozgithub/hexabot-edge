/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Language } from "@hexabot-ai/types";
import { FormControlLabel, Switch, TextField } from "@mui/material";
import { FC, Fragment, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { EntityType } from "@/api/types";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import { ContentItem, EntityFormShell } from "@/shared/dialogs";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";

type LanguageAttributes = EntityAttributes<EntityType.LANGUAGE>;

export const LanguageForm: FC<ComponentFormProps<Language>> = ({
  data: { defaultValues: language },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { save } = useUpsert(EntityType.LANGUAGE, rest);
  const {
    reset,
    register,
    formState: { errors },
    handleSubmit,
    control,
  } = useForm<LanguageAttributes>({
    defaultValues: {
      title: language?.title || "",
      code: language?.code || "",
      isRTL: language?.isRTL || false,
    },
  });
  const validationRules = {
    title: {
      required: t("message.title_is_required"),
    },
    code: {
      required: t("message.code_is_required"),
    },
  };
  const onSubmitForm = (params: LanguageAttributes) => {
    save(language?.id ?? null, params);
  };

  useEffect(() => {
    if (language) {
      reset({
        title: language.title,
        code: language.code,
        isRTL: language.isRTL,
      });
    } else {
      reset();
    }
  }, [language, reset]);

  return (
    <EntityFormShell
      Wrapper={Wrapper}
      WrapperProps={WrapperProps}
      onSubmit={handleSubmit(onSubmitForm)}
    >
      <ContentItem>
        <TextField
          label={t("label.title")}
          error={!!errors.title}
          {...register("title", validationRules.title)}
          autoFocus
          helperText={errors.title ? errors.title.message : null}
        />
      </ContentItem>
      <ContentItem>
        <TextField
          label={t("label.code")}
          error={!!errors.code}
          {...register("code", validationRules.code)}
          helperText={errors.code ? errors.code.message : null}
        />
      </ContentItem>
      <ContentItem>
        <Controller
          name="isRTL"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch {...field} checked={field.value} />}
              label={t("label.is_rtl")}
            />
          )}
        />
      </ContentItem>
    </EntityFormShell>
  );
};
