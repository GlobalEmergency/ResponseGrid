export const USER_DIRECTORY = Symbol('UserDirectory');

export interface UserView {
  id: string;
  email: string;
  name: string;
}

export interface UserDirectory {
  findByEmail(email: string): Promise<UserView | null>;
  findById(id: string): Promise<UserView | null>;
}
