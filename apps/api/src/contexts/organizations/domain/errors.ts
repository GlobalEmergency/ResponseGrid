export class NotOrganizationOwnerError extends Error {
  constructor() {
    super('Only the organization owner can perform this action');
    this.name = 'NotOrganizationOwnerError';
  }
}

export class UserNotFoundError extends Error {
  constructor(email: string) {
    super(`No user found with email: ${email}`);
    this.name = 'UserNotFoundError';
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super('User is already a member of this organization');
    this.name = 'AlreadyMemberError';
  }
}

export class NotMemberError extends Error {
  constructor() {
    super('User is not a member of this organization');
    this.name = 'NotMemberError';
  }
}

export class CannotRemoveSelfError extends Error {
  constructor() {
    super('An owner cannot remove themselves from the organization');
    this.name = 'CannotRemoveSelfError';
  }
}

export class OrganizationNotFoundError extends Error {
  constructor(id: string) {
    super(`No organization found with id: ${id}`);
    this.name = 'OrganizationNotFoundError';
  }
}
