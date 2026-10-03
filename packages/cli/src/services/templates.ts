/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import decompress from '@xhmikosr/decompress';
import axios from 'axios';

export const downloadAndExtractTemplate = async (
  templateUrl: string,
  destination: string,
) => {
  try {
    const response = await axios.get<Buffer>(templateUrl, {
      responseType: 'arraybuffer',
    });
    await decompress(response.data, destination, {
      strip: 1,
    });
  } catch (_error) {
    throw new Error(`Failed to download template from GitHub`);
  }
};
