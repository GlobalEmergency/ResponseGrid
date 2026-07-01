import { api } from '@/lib/api';
import { fromCategoryDto, sortCategories, type Category } from '@/domain/supplies/category';

/**
 * Fetch the shared category taxonomy (`GET /categories`) and map it to the
 * domain `Category[]`, sorted. SERVER-ONLY: uses the server API client
 * (`lib/api`). Server pages fetch this and pass it down to client form
 * components, so categories come from the DB (single source of truth), not a
 * hardcoded frontend mirror.
 */
export async function getCategories(locale: string): Promise<Category[]> {
  const { data, error } = await api.GET('/categories', {
    params: { query: { locale } },
  });
  if (error || !data) {
    throw new Error('getCategories failed');
  }
  return sortCategories(data.map(fromCategoryDto));
}
