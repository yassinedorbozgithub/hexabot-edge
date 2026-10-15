/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { createRequire } from 'node:module';

import { INestApplication, Inject, OnModuleInit } from '@nestjs/common';

import { SettingService } from '@/setting/services/setting.service';
import { Extension } from '@/utils/generics/extension';

import { HelperService } from '../helper.service';
import { HelperName, HelperType } from '../types';

const requireModule = createRequire(__filename);
/**
 * Whether a module exports `value` as its default or whole export. Reads the
 * `default` descriptor instead of the property so getters never run, and
 * treats exports that throw (e.g. a Proxy) as not matching.
 */
const exportsValue = (module: NodeJS.Module | undefined, value: unknown) => {
  if (!module) {
    return false;
  }

  try {
    const { exports } = module;

    return (
      exports === value ||
      (exports !== null &&
        (typeof exports === 'object' || typeof exports === 'function') &&
        Object.getOwnPropertyDescriptor(exports, 'default')?.value === value)
    );
  } catch {
    return false;
  }
};

/**
 * Finds the file of the loaded module that exports `value` (as its default or
 * whole export), so lookups can start from where a helper is installed.
 */
export const findModuleFilename = (
  value: unknown,
  cache: NodeJS.Dict<NodeJS.Module> = require.cache,
): string | undefined =>
  Object.values(cache).find((module) => exportsValue(module, value))?.filename;

export default abstract class BaseHelper<N extends HelperName = HelperName>
  extends Extension
  implements OnModuleInit
{
  protected abstract type: HelperType;

  @Inject(SettingService)
  protected readonly settingService: SettingService;

  @Inject(HelperService)
  protected readonly helperService: HelperService;

  constructor(name: N) {
    super(name);
  }

  async onModuleInit() {
    await super.onModuleInit();

    if (this.isAvailable()) {
      this.helperService.register(this);
    }
  }

  /**
   * Optional packages this helper needs at runtime (e.g. a database driver
   * installed only for some deployments). The helper is unavailable unless
   * all of them can be resolved.
   */
  protected readonly requiredPackages: string[] = [];

  /**
   * File this helper's class was loaded from, if it can be found.
   */
  protected getHelperFilename(): string | undefined {
    return findModuleFilename(this.constructor);
  }

  /**
   * Indicates whether this helper can run in the current environment.
   *
   * By default, checks that every `requiredPackages` entry is installed.
   * Packages are resolved from the helper's own file first (community helpers
   * keep their dependencies next to them), then from the API.
   * Helpers with other prerequisites can override this method to stay out of
   * the registry (and therefore out of helper selectors).
   */
  public isAvailable(): boolean {
    if (this.requiredPackages.length === 0) {
      return true;
    }

    const helperFilename = this.getHelperFilename();
    const resolvers = [
      ...(helperFilename ? [createRequire(helperFilename)] : []),
      requireModule,
    ];

    return this.requiredPackages.every((packageName) =>
      resolvers.some((resolver) => {
        try {
          resolver.resolve(packageName);

          return true;
        } catch {
          return false;
        }
      }),
    );
  }

  /**
   * Configures application-level infrastructure (e.g. the WebSocket adapter).
   *
   * Called by `createHexabotApplication` on every available helper once the
   * Nest application is created and set up, before it is initialized.
   */
  async configureApplication(_app: INestApplication): Promise<void> {}

  /**
   * Get the helper's type
   * @returns Helper's type
   */
  public getType() {
    return this.type;
  }

  /**
   * Get the helper's settings
   * @returns Helper's settings
   */
  async getSettings<S extends string = N>() {
    const settings = await this.settingService.getSettings();

    // @ts-expect-error workaround typing
    return settings[this.getName() as keyof Settings] as Settings[S];
  }
}
