/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import type { Role } from "@hexabot-ai/types";
import { Button, Link, TextField } from "@mui/material";
import Grid from "@mui/material/Grid";
import { FC, Fragment, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { ContentItem, EntityFormShell } from "@/app-components/dialogs";
import AutoCompleteEntitySelect from "@/app-components/inputs/AutoCompleteEntitySelect";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { useTranslate } from "@/hooks/useTranslate";
import { EntityType, Format } from "@/services/types";
import type { EntityAttributes } from "@/types/base";
import { ComponentFormProps } from "@/types/common/dialogs.types";
import { User } from "@/types/user.types";

type UserAttributes = EntityAttributes<EntityType.USER>;

export const EditUserForm: FC<ComponentFormProps<User, Role[]>> = ({
  data: { defaultValues: user, presetValues: roles },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { t } = useTranslate();
  const { save } = useUpsert(EntityType.USER, rest);
  const {
    reset,
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<UserAttributes>({
    defaultValues: { roles: roles?.map((role) => role.id) },
  });
  const validationRules = {
    roles: {
      required: t("message.roles_is_required"),
    },
  };
  const onSubmitForm = (params: UserAttributes) => {
    if (user?.id) {
      save(user.id, params);
    }
  };

  useEffect(() => {
    if (user) {
      reset({ roles: user.roles });
    }
  }, [reset, user]);

  return (
    <EntityFormShell
      Wrapper={Wrapper}
      WrapperProps={WrapperProps}
      onSubmit={handleSubmit(onSubmitForm)}
    >
      <ContentItem>
        <TextField
          disabled
          label={t("label.full_name")}
          value={user?.fullName}
          slotProps={{
            input: {
              readOnly: true,
            },
          }}
        />
      </ContentItem>
      <ContentItem>
        <Grid container gap={3}>
          <Grid size="grow">
            <Controller
              name="roles"
              rules={validationRules.roles}
              control={control}
              defaultValue={roles?.map(({ id }) => id) || []}
              render={({ field }) => {
                const { onChange, ...rest } = field;

                return (
                  <AutoCompleteEntitySelect<Role>
                    autoFocus
                    searchFields={["name"]}
                    entity={EntityType.ROLE}
                    format={Format.BASIC}
                    labelKey="name"
                    label={t("label.roles")}
                    multiple={true}
                    {...field}
                    error={!!errors.roles}
                    helperText={errors.roles ? errors.roles.message : null}
                    onChange={(_e, selected) =>
                      onChange(selected.map(({ id }) => id))
                    }
                    {...rest}
                  />
                );
              }}
            />
          </Grid>
          <Grid size="auto" alignContent="end">
            <Link href="/roles">
              <Button variant="contained" size="small">
                {t("button.manage")}
              </Button>
            </Link>
          </Grid>
        </Grid>
      </ContentItem>
    </EntityFormShell>
  );
};
