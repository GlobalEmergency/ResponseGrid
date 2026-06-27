import { TemplateId } from './template-id';

export interface CreateTemplateProps {
  id: TemplateId;
  name: string;
  description: string;
  dontBringList: string[];
  defaultAnnouncement: string | null;
}

export interface TemplateSnapshot {
  id: string;
  name: string;
  description: string;
  dontBringList: string[];
  defaultAnnouncement: string | null;
  createdAt: Date;
}

export class Template {
  private constructor(
    public readonly id: TemplateId,
    public readonly name: string,
    public readonly description: string,
    public readonly dontBringList: string[],
    public readonly defaultAnnouncement: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateTemplateProps): Template {
    return new Template(
      props.id,
      props.name,
      props.description,
      props.dontBringList,
      props.defaultAnnouncement,
      new Date(),
    );
  }

  static fromSnapshot(snap: TemplateSnapshot): Template {
    return new Template(
      TemplateId.fromString(snap.id),
      snap.name,
      snap.description,
      snap.dontBringList,
      snap.defaultAnnouncement,
      snap.createdAt,
    );
  }

  toSnapshot(): TemplateSnapshot {
    return {
      id: this.id.value,
      name: this.name,
      description: this.description,
      dontBringList: this.dontBringList,
      defaultAnnouncement: this.defaultAnnouncement,
      createdAt: this.createdAt,
    };
  }
}
