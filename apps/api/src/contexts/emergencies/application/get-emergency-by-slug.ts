import { EmergencyRepository } from '../domain/ports/emergency.repository';
import { Slug } from '../domain/slug';
import { InvalidSlugError } from '../domain/invalid-slug.error';
import { EmergencyView, toEmergencyView } from './emergency-view';

export class GetEmergencyBySlug {
  constructor(private readonly repo: EmergencyRepository) {}

  async execute(q: { slug: string }): Promise<EmergencyView | null> {
    // A non-canonical slug (uppercase, underscores, spaces…) can never match a
    // stored slug, which is always canonical. Treat it as "not found" so the
    // public lookup returns 404 instead of bubbling a 500 (issue #93).
    let slug: Slug;
    try {
      slug = Slug.fromString(q.slug);
    } catch (e) {
      if (e instanceof InvalidSlugError) return null;
      throw e;
    }
    const emergency = await this.repo.findBySlug(slug);
    return emergency ? toEmergencyView(emergency) : null;
  }
}
