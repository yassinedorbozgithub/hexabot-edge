/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { jest } from '@jest/globals';

const decompress = jest.fn<() => Promise<unknown[]>>();
const axiosGet = jest.fn<() => Promise<{ data: Buffer }>>();

jest.unstable_mockModule('@xhmikosr/decompress', () => ({
  default: decompress,
}));

jest.unstable_mockModule('axios', () => ({
  default: { get: axiosGet },
}));

let downloadAndExtractTemplate: (
  templateUrl: string,
  destination: string,
) => Promise<void>;

beforeAll(async () => {
  ({ downloadAndExtractTemplate } = await import('../templates.js'));
});

describe('downloadAndExtractTemplate', () => {
  let destination: string;

  beforeEach(() => {
    jest.resetAllMocks();
    destination = fs.mkdtempSync(path.join(os.tmpdir(), 'hexabot-template-'));
  });

  afterEach(() => {
    fs.rmSync(destination, { recursive: true, force: true });
  });

  it('extracts the downloaded buffer without creating a temporary zip file', async () => {
    const archive = Buffer.from('zip-content');

    axiosGet.mockResolvedValue({ data: archive });
    decompress.mockResolvedValue([]);

    await downloadAndExtractTemplate(
      'https://example.com/template.zip',
      destination,
    );

    expect(axiosGet).toHaveBeenCalledWith('https://example.com/template.zip', {
      responseType: 'arraybuffer',
    });
    expect(decompress).toHaveBeenCalledWith(archive, destination, { strip: 1 });
    expect(fs.existsSync(path.join(destination, 'template.zip'))).toBe(false);
  });

  it('throws a friendly error when the download fails', async () => {
    axiosGet.mockRejectedValue(new Error('network error'));

    await expect(
      downloadAndExtractTemplate(
        'https://example.com/template.zip',
        destination,
      ),
    ).rejects.toThrow('Failed to download template from GitHub');
    expect(decompress).not.toHaveBeenCalled();
  });
});
