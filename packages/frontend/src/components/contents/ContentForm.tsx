/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { type Content, type ContentType } from "@hexabot-ai/types";
import isMatch from "lodash/isMatch";
import { FC, Fragment, useMemo, useState } from "react";

import {
  getSchemaDefaults,
  JsonSchemaForm,
} from "@/app-components/inputs/JsonSchemaForm";
import { useUpsert } from "@/hooks/crud/useUpsert";
import { EntityType } from "@/services/types";
import { ComponentFormProps } from "@/types/common/dialogs.types";
import validator from "@/utils/rjsf-zod-validator";

import { buildContentParams, buildContentSchema } from "./content.schema.utils";

export type ContentFormData = Record<string, unknown> & {
  contentType: string;
  status: boolean;
  title: string;
};

export const ContentForm: FC<ComponentFormProps<Content, ContentType>> = ({
  data: { defaultValues: content, presetValues: contentType },
  Wrapper = Fragment,
  WrapperProps,
  ...rest
}) => {
  const { create, update } = useUpsert(EntityType.CONTENT, rest);
  const { mutate: createContent } = create;
  const { mutate: updateContent } = update;
  const contentTypeId = content?.contentType ?? contentType?.id ?? "";
  const schema = buildContentSchema(contentType?.schema);
  const defaultFormData = useMemo(
    () =>
      ({
        contentType: contentTypeId,
        ...getSchemaDefaults(schema),
        ...content,
        ...content?.properties,
      }) as ContentFormData,
    [content, contentTypeId],
  );
  const [formData, setFormData] = useState<ContentFormData>(defaultFormData);
  const params = useMemo(
    () => buildContentParams(formData),
    [formData, schema],
  );
  const [hasVisibleErrors, setHasVisibleErrors] = useState(false);
  const [validateOnSubmit, setValidateOnSubmit] = useState(false);
  const hasValidationErrors = useMemo(
    () => !validator.isValid(schema, formData, schema),
    [schema, formData],
  );
  const onSubmitForm = () => {
    setValidateOnSubmit(true);

    if (hasVisibleErrors || hasValidationErrors) {
      return;
    }

    if (content) {
      updateContent({
        id: content.id,
        params,
      });
    } else if (contentType) {
      createContent({
        ...params,
        contentType: contentType.id,
      });
    } else {
      throw new Error("Content Type must be passed to the dialog form.");
    }
  };
  const canSubmit = useMemo(() => {
    return (
      hasVisibleErrors ||
      (validateOnSubmit && hasValidationErrors) ||
      isMatch(defaultFormData, formData) ||
      Boolean(WrapperProps?.confirmButtonProps?.disabled)
    );
  }, [
    formData,
    hasValidationErrors,
    hasVisibleErrors,
    validateOnSubmit,
    WrapperProps?.confirmButtonProps?.disabled,
  ]);

  return (
    <Wrapper
      onSubmit={onSubmitForm}
      {...WrapperProps}
      confirmButtonProps={{
        ...WrapperProps?.confirmButtonProps,
        disabled: canSubmit,
      }}
    >
      <JsonSchemaForm<ContentFormData>
        schema={schema}
        formData={formData}
        onFormDataChange={setFormData}
        onVisibleErrorsChange={setHasVisibleErrors}
        validateOnMount={validateOnSubmit}
        enableJsonataTextWidget={false}
        idPrefix={content ? `content-${content.id}` : "content-new"}
      />
    </Wrapper>
  );
};
