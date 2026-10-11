/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Cache } from 'cache-manager';
import { Keyv, KeyvOptions } from 'keyv';

import { globalSettingsSchema } from '@/setting/default.settings';

import { HelperName, HelperType } from '../types';

import BaseHelper from './base-helper';

/**
 * Base class for helpers that provide the cache store.
 *
 * Core registers the cache manager without a store, so cache-manager starts on
 * its default in-memory store. The active cache helper is the one selected by
 * `global_settings.default_cache_helper`, or the default one (`memory-cache`)
 * while the selected helper is unavailable or not enabled (`isEnabled()`). It
 * wraps the store returned by `createStore()` in Keyv and installs it as the
 * cache's primary store.
 *
 * Every cache helper re-resolves the active helper when the selection or any
 * cache helper's settings group changes, and the active one rebuilds its store
 * when its own settings group (`getSettingsGroup()`) changes. `cache.stores`
 * is the live array cache-manager reads on every call; a replaced store keeps
 * serving until its successor is installed.
 */
export abstract class BaseCacheHelper<N extends HelperName = HelperName>
  extends BaseHelper<N>
  implements OnApplicationBootstrap, OnModuleDestroy
{
  protected readonly type: HelperType = HelperType.CACHE;

  @Inject(CACHE_MANAGER)
  private readonly cacheManager: Cache;

  @Inject(EventEmitter2)
  private readonly eventEmitter: EventEmitter2;

  private cacheStore?: Keyv;

  // Settings groups of the other cache helpers, which can change the selection
  private watchedGroups: string[] = [];

  // Serializes store swaps so overlapping setting updates apply in order
  private pendingSync: Promise<void> = Promise.resolve();

  private readonly handleSelectionChanged = () => this.queueSync(false);

  private readonly handleSettingsChanged = () => this.queueSync(true);

  async onModuleInit() {
    await super.onModuleInit();

    if (!this.isAvailable()) {
      return;
    }

    this.eventEmitter.on(
      'hook:global_settings:default_cache_helper',
      this.handleSelectionChanged,
    );
    this.eventEmitter.on(
      `hook:${this.getSettingsGroup()}:*`,
      this.handleSettingsChanged,
    );
    await this.queueSync(false);
  }

  onApplicationBootstrap() {
    if (!this.isAvailable()) {
      return;
    }

    // Every cache helper is registered once all modules are initialized
    this.watchedGroups = [
      ...new Set(
        this.helperService
          .getAllByType(HelperType.CACHE)
          .map((helper) => helper.getSettingsGroup()),
      ),
    ].filter((group) => group !== this.getSettingsGroup());

    for (const group of this.watchedGroups) {
      this.eventEmitter.on(`hook:${group}:*`, this.handleSelectionChanged);
    }
  }

  async onModuleDestroy() {
    this.eventEmitter?.off(
      'hook:global_settings:default_cache_helper',
      this.handleSelectionChanged,
    );
    this.eventEmitter?.off(
      `hook:${this.getSettingsGroup()}:*`,
      this.handleSettingsChanged,
    );

    for (const group of this.watchedGroups) {
      this.eventEmitter?.off(`hook:${group}:*`, this.handleSelectionChanged);
    }

    await this.pendingSync;
    await this.cacheStore?.disconnect();
    this.cacheStore = undefined;
  }

  /**
   * Whether this helper can serve the cache with the given settings, e.g. a
   * required connection is enabled. Defaults to `true`.
   * @param settings - The stored settings of `getSettingsGroup()`, missing
   * before seeding.
   */
  public isEnabled(_settings: unknown): boolean {
    return true;
  }

  private queueSync(rebuild: boolean) {
    this.pendingSync = this.pendingSync
      .then(() => this.syncStore(rebuild))
      .catch((error) =>
        this.logger.error(
          `Unable to apply the "${this.getName()}" cache settings.`,
          error,
        ),
      );

    return this.pendingSync;
  }

  /**
   * Installs this helper's store when it is the active cache helper,
   * disconnecting the store it replaces.
   * @param rebuild - Rebuild the store even if it is already installed.
   */
  private async syncStore(rebuild: boolean) {
    const settings = await this.readSettings();

    if (this.resolveActiveHelper(settings) !== this.getName()) {
      // Keep serving until the active helper replaces (and disconnects) it
      this.cacheStore = undefined;

      return;
    }

    // Another helper may have replaced the store since it was installed
    if (!rebuild && this.cacheStore === this.cacheManager.stores[0]) {
      return;
    }

    const cacheStore = new Keyv({
      store: await this.createStore(settings[this.getSettingsGroup()]),
      // Store keys as-is (e.g. `settings`), without Keyv's default `keyv`
      // namespace and key prefix (`keyv::keyv:settings`).
      namespace: undefined,
      useKeyPrefix: false,
    });

    cacheStore.on('error', (error) =>
      this.logger.error(`The "${this.getName()}" cache store failed.`, error),
    );

    // Creating the store can take a while (e.g. connecting to Redis), and
    // another helper may have been selected and installed in the meantime.
    // No await between this check and the install below.
    if (
      this.resolveActiveHelper(await this.readSettings()) !== this.getName()
    ) {
      await cacheStore.disconnect();

      return;
    }

    this.cacheStore = cacheStore;
    const [replaced] = this.cacheManager.stores.splice(0, 1, cacheStore);
    this.logger.log(`Cache helper "${this.getName()}" has been enabled!`);
    await replaced?.disconnect();
  }

  /**
   * The selected cache helper, or the default one while the selected helper
   * is unavailable or not enabled.
   */
  private resolveActiveHelper(settings: Partial<Record<string, any>>) {
    const defaultSelection = globalSettingsSchema.shape.default_cache_helper;
    const fallback = defaultSelection.parse(undefined);
    // Settings are seeded after init: fall back to the schema default
    const selected = defaultSelection.parse(
      settings.global_settings?.default_cache_helper,
    );
    const selectedHelper = this.helperService
      .getAllByType(HelperType.CACHE)
      .find((helper) => helper.getName() === selected);

    if (
      selectedHelper?.isEnabled(settings[selectedHelper.getSettingsGroup()])
    ) {
      return selected;
    }

    if (selectedHelper === this) {
      this.logger.warn(
        `The "${selected}" cache helper is selected but not enabled, the "${fallback}" cache helper is used instead.`,
      );
    }

    return fallback;
  }

  /**
   * The settings group the store is built from: changes to it rebuild the
   * store. Defaults to the helper's own group.
   */
  public getSettingsGroup(): string {
    return this.getName();
  }

  /**
   * Reads the settings tree, or an empty one while the settings table does not
   * exist yet (a fresh database before its migrations run).
   */
  private async readSettings(): Promise<Partial<Record<string, any>>> {
    try {
      return await this.settingService.getSettings();
    } catch (error) {
      this.logger.warn(
        `Unable to read the settings, the "${this.getName()}" cache helper uses its defaults.`,
        error,
      );

      return {};
    }
  }

  /**
   * Creates the underlying store (a Keyv storage adapter or a `Map`-like
   * store) that backs the cache.
   * @param settings - The stored settings of `getSettingsGroup()`, missing
   * before seeding.
   */
  protected abstract createStore(
    settings: unknown,
  ): Promise<KeyvOptions['store']>;
}
