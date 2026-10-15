/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { HelperType } from '../types';

import BaseHelper, { findModuleFilename } from './base-helper';

class EnvironmentHelper extends BaseHelper {
  protected readonly type = HelperType.UTIL;

  constructor(private readonly available: boolean) {
    super('environment-helper');
  }

  override isAvailable(): boolean {
    return this.available;
  }
}

describe('BaseHelper environment availability', () => {
  it.each([
    { available: true, registrations: 1 },
    { available: false, registrations: 0 },
  ])(
    'registers only available helpers',
    async ({ available, registrations }) => {
      const helper = new EnvironmentHelper(available);
      const register = jest.fn();
      (
        helper as unknown as {
          helperService: { register: jest.Mock };
        }
      ).helperService = { register };

      await helper.onModuleInit();

      expect(register).toHaveBeenCalledTimes(registrations);
    },
  );
});

class PackagesHelper extends BaseHelper {
  protected readonly type = HelperType.UTIL;

  constructor(
    protected readonly requiredPackages: string[],
    private readonly helperFilename?: string,
  ) {
    super('packages-helper');
  }

  protected override getHelperFilename() {
    return this.helperFilename;
  }
}

describe('BaseHelper required packages', () => {
  it('is available without required packages', () => {
    expect(new PackagesHelper([]).isAvailable()).toBe(true);
  });

  it('is available when every required package is installed', () => {
    expect(new PackagesHelper(['typeorm', 'zod']).isAvailable()).toBe(true);
  });

  it('resolves packages installed next to a community helper', () => {
    // Mimics pnpm's isolated layout: the dependency is only visible from the
    // helper's own package, not from the API.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hexabot-helper-'));
    const helperDir = path.join(root, 'hexabot-helper-community');
    const dependencyDir = path.join(
      helperDir,
      'node_modules/hexabot-community-driver',
    );
    fs.mkdirSync(dependencyDir, { recursive: true });
    fs.writeFileSync(path.join(dependencyDir, 'index.js'), '');
    const helperFilename = path.join(helperDir, 'index.helper.js');

    try {
      expect(
        new PackagesHelper(['hexabot-community-driver']).isAvailable(),
      ).toBe(false);
      expect(
        new PackagesHelper(
          ['hexabot-community-driver', 'typeorm'],
          helperFilename,
        ).isAvailable(),
      ).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('is not available when a required package is missing', () => {
    expect(
      new PackagesHelper(['typeorm', 'hexabot-missing-package']).isAvailable(),
    ).toBe(false);
  });
});

describe('findModuleFilename', () => {
  it('finds the module exporting a class as default or whole export', () => {
    class DefaultExport {}
    class WholeExport {}
    const cache = {
      '/a.js': { filename: '/a.js', exports: { default: DefaultExport } },
      '/b.js': { filename: '/b.js', exports: WholeExport },
    } as unknown as NodeJS.Dict<NodeJS.Module>;

    expect(findModuleFilename(DefaultExport, cache)).toBe('/a.js');
    expect(findModuleFilename(WholeExport, cache)).toBe('/b.js');
    expect(findModuleFilename(class Missing {}, cache)).toBeUndefined();
  });

  it('skips exports that throw or define a default getter', () => {
    class Helper {}
    const getter = jest.fn(() => Helper);
    const cache = {
      '/proxy.js': {
        filename: '/proxy.js',
        exports: new Proxy(
          {},
          {
            getOwnPropertyDescriptor: () => {
              throw new Error('Proxy trap');
            },
          },
        ),
      },
      '/getter.js': {
        filename: '/getter.js',
        exports: Object.defineProperty({}, 'default', { get: getter }),
      },
      '/helper.js': { filename: '/helper.js', exports: { default: Helper } },
    } as unknown as NodeJS.Dict<NodeJS.Module>;

    expect(findModuleFilename(Helper, cache)).toBe('/helper.js');
    expect(getter).not.toHaveBeenCalled();
  });
});
