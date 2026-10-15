/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2025 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { languageFullSchema, languageSchema } from '@hexabot-ai/types';
import { Column, Entity, Index, Not } from 'typeorm';

import { AuditLabel } from '@/audit/decorators/audit-label.decorator';
import {
  OnBeforeInsert,
  OnBeforeRemove,
  OnBeforeUpdate,
} from '@/database/decorators/orm-event-hooks.decorator';
import { BaseOrmEntity } from '@/database/entities/base.entity';
import type { EntityHookContext } from '@/database/entity-store';

import { LanguageDto } from '../dto/language.dto';

@Entity({ name: 'languages' })
export class LanguageOrmEntity extends BaseOrmEntity<LanguageDto> {
  plainCls = languageSchema;

  fullCls = languageFullSchema;

  @AuditLabel()
  @Column({ unique: true })
  @Index()
  title!: string;

  @Column({ unique: true })
  @Index()
  code!: string;

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: false })
  isRTL!: boolean;

  @OnBeforeInsert()
  @OnBeforeUpdate()
  protected async ensureSingleDefault({
    stores,
  }: EntityHookContext<LanguageOrmEntity>): Promise<void> {
    if (!this.isDefault) {
      return;
    }

    await stores
      .get(LanguageOrmEntity)
      .update(
        this.id ? { isDefault: true, id: Not(this.id) } : { isDefault: true },
        { isDefault: false },
      );
  }

  @OnBeforeRemove()
  protected preventDefaultRemoval(): void {
    if (this.isDefault) {
      throw new Error('Should not be able to delete default');
    }
  }
}
