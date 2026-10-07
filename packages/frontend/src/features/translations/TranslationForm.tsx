/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Language, Translation } from "@hexabot-ai/types";
import { FormLabel, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { FC, Fragment } from "react";
import { Controller, ControllerRenderProps, useForm } from "react-hook-form";

import { EntityType } from "@/api/types";
import { useFind } from "@/hooks/crud/useFind";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import { ContentContainer, ContentItem } from "@/shared/dialogs";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";

type TranslationAttributes = EntityAttributes<EntityType.TRANSLATION>;

interface TranslationInputProps {
  field: ControllerRenderProps<TranslationAttributes>;
  language: Language;
}

const TranslationInput: React.FC<TranslationInputProps> = ({
  field,
  language: { isRTL, title },
}) => (
  <TextField
    dir={isRTL ? "rtl" : "ltr"}
    label={
      <Grid container dir="ltr">
        <Grid>{title}</Grid>
      </Grid>
    }
    minRows={3}
    inputRef={field.ref}
    multiline={true}
    {...field}
  />
);

export const TranslationForm: FC<ComponentFormProps<Translation>> = ({
  data: { defaultValues: translation },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { data: languages } = useFind(
    { entity: EntityType.LANGUAGE },
    {
      hasCount: false,
    },
  );
  const { save } = useUpsert(EntityType.TRANSLATION, rest);
  const { control, handleSubmit } = useForm<TranslationAttributes>({
    defaultValues: {
      translations: translation?.translations,
    },
  });
  const onSubmitForm = (params: TranslationAttributes) => {
    if (translation?.id) save(translation.id, params);
  };

  return (
    <Wrapper onSubmit={handleSubmit(onSubmitForm)} {...WrapperProps}>
      <form onSubmit={handleSubmit(onSubmitForm)}>
        <ContentItem>
          <FormLabel>{t("label.original_text")}</FormLabel>
          <Typography component="p">{translation?.str}</Typography>
        </ContentItem>
        <ContentContainer>
          {languages
            .filter(({ isDefault }) => !isDefault)
            .map((language) => (
              <ContentItem key={language.code}>
                <Controller
                  name={`translations.${language.code as keyof Translation["translations"]}`}
                  control={control}
                  render={({ field }) => (
                    <TranslationInput field={field} language={language} />
                  )}
                />
              </ContentItem>
            ))}
        </ContentContainer>
      </form>
    </Wrapper>
  );
};

TranslationForm.displayName = TranslationForm.name;
