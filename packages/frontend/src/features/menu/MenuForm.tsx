/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { MenuType, type Menu as IMenuItem } from "@hexabot-ai/types";
import { MenuItem, TextField } from "@mui/material";
import { FC, Fragment, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { EntityType } from "@/api/types";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import {
  ContentContainer,
  ContentItem,
  EntityFormShell,
} from "@/shared/dialogs";
import { ToggleableInput } from "@/shared/inputs/ToggleableInput";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";
import { isAbsoluteUrl } from "@/utils/URL";

const DEFAULT_VALUES = { title: "", type: MenuType.web_url, url: undefined };

type MenuItemAttributes = EntityAttributes<EntityType.MENU>;

export type MenuFormData = {
  row?: IMenuItem;
  rowId?: string;
  parentId?: string;
};

export const MenuForm: FC<ComponentFormProps<MenuFormData>> = ({
  data: { defaultValues: menu },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { save } = useUpsert(EntityType.MENU, rest);
  const {
    watch,
    reset,
    control,
    register,
    formState: { errors },
    resetField,
    handleSubmit,
  } = useForm<MenuItemAttributes>({
    defaultValues: DEFAULT_VALUES,
  });
  const validationRules = {
    type: {
      required: t("message.type_is_required"),
    },
    title: { required: t("message.title_is_required") },
    url: {
      required: t("message.url_is_invalid"),
      validate: (value?: string | null) =>
        isAbsoluteUrl(value ?? "") || t("message.url_is_invalid"),
    },
    payload: {},
  };
  const typeValue = watch("type");
  const titleValue = watch("title");
  const onSubmitForm = (params: MenuItemAttributes) => {
    const { url, ...restParams } = params;
    const payload =
      typeValue === "web_url" ? { ...restParams, url } : restParams;

    if (menu?.row?.id) {
      save(menu.row.id, payload);
    } else {
      save(null, { ...payload, parent: menu?.parentId } as MenuItemAttributes);
    }
  };

  useEffect(() => {
    if (menu?.row) {
      reset(menu.row);
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [reset, menu?.row]);

  return (
    <EntityFormShell
      Wrapper={Wrapper}
      WrapperProps={WrapperProps}
      onSubmit={handleSubmit(onSubmitForm)}
    >
      <ContentContainer flexDirection="row">
        <ContentItem>
          <Controller
            name="type"
            rules={validationRules.type}
            control={control}
            render={({ field }) => {
              const { onChange, ...rest } = field;

              return (
                <TextField
                  select
                  label={t("placeholder.type")}
                  error={!!errors.type}
                  inputRef={field.ref}
                  required
                  onChange={({ target: { value } }) => {
                    onChange(value);
                    resetField("url");
                  }}
                  helperText={errors.type ? errors.type.message : null}
                  {...rest}
                >
                  {Object.keys(MenuType).map((value, key) => (
                    <MenuItem value={value} key={key}>
                      {t(`label.${value}`)}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }}
          />
        </ContentItem>
        <ContentItem flex={1}>
          <TextField
            label={t("placeholder.title")}
            error={!!errors.title}
            required
            autoFocus
            helperText={errors.title ? errors.title.message : null}
            {...register("title", validationRules.title)}
          />
        </ContentItem>
      </ContentContainer>
      <ContentItem>
        {typeValue === MenuType.web_url ? (
          <TextField
            label={t("label.web_url")}
            error={!!errors.url}
            required
            helperText={errors.url ? errors.url.message : null}
            {...register("url", validationRules.url)}
          />
        ) : typeValue === MenuType.postback ? (
          <Controller
            name="payload"
            control={control}
            render={({ field }) => {
              return (
                <ToggleableInput
                  label={t("label.payload")}
                  error={!!errors.payload}
                  required
                  defaultValue={menu?.row?.payload || ""}
                  readOnlyValue={titleValue}
                  helperText={errors.payload ? errors.payload.message : null}
                  {...field}
                />
              );
            }}
          />
        ) : null}
      </ContentItem>
    </EntityFormShell>
  );
};
