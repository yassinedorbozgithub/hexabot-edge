/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import 'dotenv/config';

import { repl } from '@nestjs/core';
import { resolveDynamicProviders } from 'nestjs-dynamic-providers';

import { HexabotApplicationModule } from './app.module';

async function bootstrap() {
  await resolveDynamicProviders();
  await repl(HexabotApplicationModule);
}
bootstrap();
