import { GroupVisibility, GroupOwnerScope } from './group-enums';

export interface GroupSnapshot {
  id: string;
  name: string;
  visibility: GroupVisibility;
  ownerScope: GroupOwnerScope;
  /** Parent group for nesting (managers of managers). */
  parentGroupId: string | null;
  createdAt: string;
}

export class Group {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly visibility: GroupVisibility,
    public readonly ownerScope: GroupOwnerScope,
    public readonly parentGroupId: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: {
    id: string;
    name: string;
    visibility: GroupVisibility;
    ownerScope: GroupOwnerScope;
    parentGroupId?: string | null;
    createdAt?: Date;
  }): Group {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Group name must be a non-empty string');
    }
    return new Group(
      props.id,
      props.name.trim(),
      props.visibility,
      props.ownerScope,
      props.parentGroupId ?? null,
      props.createdAt ?? new Date(),
    );
  }

  static fromSnapshot(s: GroupSnapshot): Group {
    return new Group(
      s.id,
      s.name,
      s.visibility,
      s.ownerScope,
      s.parentGroupId,
      new Date(s.createdAt),
    );
  }

  toSnapshot(): GroupSnapshot {
    return {
      id: this.id,
      name: this.name,
      visibility: this.visibility,
      ownerScope: this.ownerScope,
      parentGroupId: this.parentGroupId,
      createdAt: this.createdAt.toISOString(),
    };
  }

  get isPublic(): boolean {
    return this.visibility === GroupVisibility.Public;
  }
}
