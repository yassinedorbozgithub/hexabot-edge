/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { ModuleMetadata, Provider } from '@nestjs/common';
import {
  DataSource,
  DataSourceOptions,
  EntitySubscriberInterface,
  EntityTarget,
} from 'typeorm';

import { BaseOrmEntity } from '@/database/entities/base.entity';

type BaseFixtureEntity = Pick<BaseOrmEntity, 'id' | 'createdAt' | 'updatedAt'>;

//fixtures types
export type TFixtures<T> = Omit<T, keyof BaseFixtureEntity> & {
  createdAt?: BaseFixtureEntity['createdAt'];
};

export type TFixturesDefaultValues<T, S = TFixtures<T>> = Partial<S>;

export type TOptionalPropertyFrom<O extends object, O1 extends object> = Pick<
  O1,
  Exclude<keyof O1, keyof O>
> &
  Pick<O, Exclude<keyof O, keyof O1>>;

export type OptionalProperties<T, K extends keyof T> = Omit<
  T,
  K | keyof BaseFixtureEntity
> &
  Partial<Pick<T, K>>;

export type FixturesTypeBuilder<
  S extends object,
  D extends object,
  DO = TFixturesDefaultValues<D>,
  U = Partial<TFixtures<TOptionalPropertyFrom<D, S>>>,
> = {
  defaultValues: DO & U;
  values: OptionalProperties<S, keyof S & keyof (DO & U)>;
};

export type TTypeOrToken = [
  new (...args: any[]) => any,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  ...(new (...args: any[]) => any[]),
];

export type ToUnionArray<T> = (NonNullable<T> extends (infer U)[]
  ? U
  : never)[];

export type TypeOrmFixture = (
  dataSource: DataSource,
) => Promise<unknown> | unknown;

export type TypeOrmTestingConfig = {
  entities?: EntityTarget<any>[];
  fixtures?: TypeOrmFixture | TypeOrmFixture[];
  dataSourceOptions?: Partial<DataSourceOptions>;
};

export type TypeOrmTestingInput =
  TypeOrmTestingConfig | TypeOrmTestingConfig[] | false;

export type buildTestingMocksProps<
  P extends ModuleMetadata['providers'] = ModuleMetadata['providers'],
  C extends ModuleMetadata['controllers'] = ModuleMetadata['controllers'],
> = ModuleMetadata & {
  typeorm?: TypeOrmTestingInput;
} & (
    | {
        providers: NonNullable<P>;
        controllers: NonNullable<C>;
        autoInjectFrom: ('providers' | 'controllers')[];
      }
    | {
        providers: NonNullable<P>;
        autoInjectFrom?: 'providers'[];
      }
    | {
        controllers: NonNullable<C>;
        autoInjectFrom?: 'controllers'[];
      }
    | {
        providers?: never;
        controllers?: never;
        autoInjectFrom?: never;
      }
  );

export type ProviderLike = Provider | undefined;

export type SubscriberWithListenTo = EntitySubscriberInterface & {
  listenTo: NonNullable<EntitySubscriberInterface['listenTo']>;
};

export type TSortProps<T> = {
  row1: T;
  row2: T;
  field?: keyof T | 'createdAt';
  order?: 'desc' | 'asc';
};

export type TCreatedAt = { createdAt?: string | Date };
