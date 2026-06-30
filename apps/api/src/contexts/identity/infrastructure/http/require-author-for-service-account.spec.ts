import { BadRequestException } from '@nestjs/common';
import { requireAuthorForServiceAccount } from './require-author-for-service-account';

describe('requireAuthorForServiceAccount', () => {
  it('throws when a service account omits author', () => {
    expect(() =>
      requireAuthorForServiceAccount({ isServiceAccount: true }, undefined),
    ).toThrow(BadRequestException);
    expect(() =>
      requireAuthorForServiceAccount({ isServiceAccount: true }, null),
    ).toThrow(BadRequestException);
  });

  it('passes a service account that provides author', () => {
    expect(() =>
      requireAuthorForServiceAccount(
        { isServiceAccount: true },
        { name: 'María' },
      ),
    ).not.toThrow();
  });

  it('never requires author from a human user', () => {
    expect(() =>
      requireAuthorForServiceAccount({ isServiceAccount: false }, undefined),
    ).not.toThrow();
  });

  it('is safe when there is no authenticated user yet', () => {
    expect(() =>
      requireAuthorForServiceAccount(undefined, undefined),
    ).not.toThrow();
  });
});
