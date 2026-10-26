/*
 * Hexabot — Fair Core License (FCL-1.0-ALv2)
 * Copyright (c) 2026 Hexastack.
 * Full terms: see LICENSE.md.
 */

import { And, Between, ILike, IsNull, MoreThan, Not, Raw } from 'typeorm';

import { mongoCondition } from '../mongodb.repository';

describe('MongoDB find conditions', () => {
  it('escapes regular expression syntax while translating LIKE wildcards', () => {
    const condition = mongoCondition('title', ILike('%a.b[1]%'));
    const regex = new RegExp(condition.title.$regex, condition.title.$options);
    expect(regex.test('A.B[1] example')).toBe(true);
    expect(regex.test('axb1')).toBe(false);
  });

  it('keeps literal objects out of the MongoDB operator namespace', () => {
    expect(mongoCondition('payload', { $ne: null })).toEqual({
      payload: { $eq: { $ne: null } },
    });
  });

  it('supports compound comparisons and null negation', () => {
    expect(mongoCondition('count', And(MoreThan(1), Between(0, 5)))).toEqual({
      $and: [{ count: { $gt: 1 } }, { count: { $gte: 0, $lte: 5 } }],
    });
    expect(mongoCondition('name', Not(IsNull()))).toEqual({
      $nor: [{ name: null }],
      name: { $ne: null },
    });
  });

  it('rejects SQL raw expressions', () => {
    expect(() => mongoCondition('id', Raw('1=1'))).toThrow(
      'Unsupported MongoDB find operator',
    );
  });
});
