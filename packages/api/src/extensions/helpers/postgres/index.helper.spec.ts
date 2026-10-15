/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { HelperType } from '@/helper/types';

const mockResolve = jest.fn();

// Only BaseHelper's require is faked; other modules keep the real one
jest.mock('node:module', () => {
  const actual = jest.requireActual('node:module');

  return {
    ...actual,
    createRequire: (filename: string) => {
      const requireModule = actual.createRequire(filename);

      if (filename.includes('base-helper')) {
        requireModule.resolve = (id: string) => mockResolve(id);
      }

      return requireModule;
    },
  };
});

import PostgresHelper from './index.helper';

describe('PostgresHelper', () => {
  beforeEach(() => {
    mockResolve.mockReset();
    // Skip the lookup from the helper's own file (real resolve), so only the
    // faked BaseHelper resolver decides, whether or not pg is installed.
    jest
      .spyOn(
        PostgresHelper.prototype as unknown as {
          getHelperFilename: () => string | undefined;
        },
        'getHelperFilename',
      )
      .mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is available when the pg driver is installed', () => {
    mockResolve.mockReturnValue('/node_modules/pg/lib/index.js');
    const helper = new PostgresHelper();

    expect(helper.isAvailable()).toBe(true);
    expect(mockResolve).toHaveBeenCalledWith('pg');
    expect(helper.getType()).toBe(HelperType.DB);
  });

  it('is not available without the pg driver', () => {
    mockResolve.mockImplementation(() => {
      throw new Error("Cannot find module 'pg'");
    });

    expect(new PostgresHelper().isAvailable()).toBe(false);
  });
});
