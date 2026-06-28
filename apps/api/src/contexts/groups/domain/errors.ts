export class GroupNotFoundError extends Error {
  constructor(id: string) {
    super(`Group '${id}' not found`);
    this.name = 'GroupNotFoundError';
  }
}

export class GroupNotPublicError extends Error {
  constructor(id: string) {
    super(`Group '${id}' is not public; members are added by a manager`);
    this.name = 'GroupNotPublicError';
  }
}

export class AlreadyMemberError extends Error {
  constructor() {
    super('User is already a member or has a pending request for this group');
    this.name = 'AlreadyMemberError';
  }
}

export class MemberNotFoundError extends Error {
  constructor() {
    super('No membership found for this user in this group');
    this.name = 'MemberNotFoundError';
  }
}

export class UserNotFoundByEmailError extends Error {
  constructor(email: string) {
    super(`No user found with email '${email}'`);
    this.name = 'UserNotFoundByEmailError';
  }
}

export class GroupAccessDeniedError extends Error {
  constructor(permission: string) {
    super(`Not authorized: '${permission}' required in this group's scope`);
    this.name = 'GroupAccessDeniedError';
  }
}
