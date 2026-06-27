import { Template } from '../domain/template';

export interface TemplateView {
  id: string;
  name: string;
  description: string;
  dontBringList: string[];
  defaultAnnouncement: string | null;
  createdAt: string;
}

export function toTemplateView(t: Template): TemplateView {
  return {
    id: t.id.value,
    name: t.name,
    description: t.description,
    dontBringList: t.dontBringList,
    defaultAnnouncement: t.defaultAnnouncement,
    createdAt: t.createdAt.toISOString(),
  };
}
