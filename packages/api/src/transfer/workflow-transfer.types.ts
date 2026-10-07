/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import {
  type WorkflowExportBundleCredential,
  WorkflowImportResourceResult,
} from '@hexabot-ai/types';
import { BadRequestException } from '@nestjs/common';
import { DeepPartial, EntityManager, EntityTarget } from 'typeorm';

import { BaseOrmEntity } from '@/database/entities/base.entity';

/**
 * Workflow transfer persistence contract:
 * - WorkflowTransferService owns the import transaction boundary.
 * - Resource adapters receive EntityManager for transactional writes.
 * - Export reads use owning module services wherever available.
 * - Transfer does not introduce duplicate repositories for owned resources.
 */

export const PLACEHOLDER_CREDENTIAL_VALUE =
  '__HEXABOT_IMPORTED_CREDENTIAL_PLACEHOLDER__';

export type WorkflowTransferCredentialResource =
  WorkflowExportBundleCredential & {
    value?: string;
  };

export type WorkflowTransferPostCreateEvent<
  Entity extends BaseOrmEntity<any> = BaseOrmEntity<any>,
> = {
  entityName: string;
  entity: Entity;
  payload: unknown;
};

export type WorkflowTransferImportAdapterResult = {
  idMap: Record<string, string>;
  resources: WorkflowImportResourceResult[];
  warnings: string[];
  postCreateEvents: WorkflowTransferPostCreateEvent[];
  metadata?: Record<string, unknown>;
};

export type WorkflowTransferResourceIdMaps = Record<
  string,
  Record<string, string>
>;

export type ImportedWorkflowTransferResources = {
  bindingIdMaps: WorkflowTransferResourceIdMaps;
  taskIdMaps: WorkflowTransferResourceIdMaps;
  resources: WorkflowImportResourceResult[];
  warnings: string[];
  postCreateEvents: WorkflowTransferPostCreateEvent[];
};

type ResourceActionInput = Omit<WorkflowImportResourceResult, 'localId'> & {
  localId?: string;
};

export const uniqueResourceIds = (ids: string[]): string[] => {
  return Array.from(new Set(ids));
};

export const assertFoundAll = (
  resourceLabel: string,
  expectedIds: string[],
  foundIds: string[],
): void => {
  const found = new Set(foundIds);
  const missing = expectedIds.filter((id) => !found.has(id));

  if (missing.length > 0) {
    throw new BadRequestException(
      `Unable to export workflow: missing ${resourceLabel}(s): ${missing.join(
        ', ',
      )}`,
    );
  }
};

export const buildResourceResult = (
  input: ResourceActionInput,
): WorkflowImportResourceResult => {
  if (!input.localId) {
    throw new Error(`Missing local ID for imported ${input.kind}`);
  }

  return {
    kind: input.kind,
    exportId: input.exportId,
    localId: input.localId,
    name: input.name,
    action: input.action,
  };
};

export const buildPostCreateEvent = <Entity extends BaseOrmEntity<any>>(
  entityName: string,
  entity: Entity,
  payload: unknown,
): WorkflowTransferPostCreateEvent<Entity> => {
  return { entityName, entity, payload };
};

/**
 * Loads the referenced records for export, failing when any of them is missing.
 * The loader is skipped when there is nothing to export.
 */
export const findAllForExport = async <Item extends { id: string }>(
  resourceLabel: string,
  ids: string[],
  find: (uniqueIds: string[]) => Promise<Item[]>,
): Promise<Item[]> => {
  const uniqueIds = uniqueResourceIds(ids);

  if (uniqueIds.length === 0) {
    return [];
  }

  const records = await find(uniqueIds);
  assertFoundAll(
    resourceLabel,
    uniqueIds,
    records.map((record) => record.id),
  );

  return records;
};

export const createImportAdapterResult =
  (): WorkflowTransferImportAdapterResult => ({
    idMap: {},
    resources: [],
    warnings: [],
    postCreateEvents: [],
  });

type ImportedResourceRef = { exportId: string; name: string };

/**
 * Maps an imported resource onto an existing local record.
 */
export const recordReusedResource = (
  result: WorkflowTransferImportAdapterResult,
  kind: string,
  resource: ImportedResourceRef,
  existing: BaseOrmEntity<any>,
): void => {
  result.idMap[resource.exportId] = existing.id;
  result.resources.push(
    buildResourceResult({
      kind,
      exportId: resource.exportId,
      localId: existing.id,
      name: resource.name,
      action: 'reused',
    }),
  );
};

/**
 * Persists an imported resource within the import transaction and records
 * its id mapping, import result and post-create event.
 */
export const createImportedResource = async <Entity extends BaseOrmEntity<any>>(
  result: WorkflowTransferImportAdapterResult,
  manager: EntityManager,
  {
    target,
    kind,
    resource,
    payload,
    action = 'created',
  }: {
    target: EntityTarget<Entity>;
    kind: string;
    resource: ImportedResourceRef;
    payload: DeepPartial<Entity>;
    action?: WorkflowImportResourceResult['action'];
  },
): Promise<Entity> => {
  const created = await manager.save(target, manager.create(target, payload));

  result.idMap[resource.exportId] = created.id;
  result.resources.push(
    buildResourceResult({
      kind,
      exportId: resource.exportId,
      localId: created.id,
      name: resource.name,
      action,
    }),
  );
  result.postCreateEvents.push(buildPostCreateEvent(kind, created, payload));

  return created;
};
