export class ServiceAccountNotFoundError extends Error {
  constructor(id: string) {
    super(`Service account '${id}' not found`);
    this.name = 'ServiceAccountNotFoundError';
  }
}

export class ApiKeyNotFoundError extends Error {
  constructor(id: string) {
    super(`API key '${id}' not found`);
    this.name = 'ApiKeyNotFoundError';
  }
}

export class ApiKeyAccessDeniedError extends Error {
  constructor(permission: string) {
    super(`Not authorized: '${permission}' required`);
    this.name = 'ApiKeyAccessDeniedError';
  }
}
