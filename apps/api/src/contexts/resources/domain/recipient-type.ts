/**
 * Tipo de destinatario final (#62) — entrada de la taxonomía extensible.
 * `slug` es el identificador estable que `Resource.recipientType` referencia.
 */
export interface RecipientType {
  slug: string;
  labelEs: string;
  labelEn: string;
  sort: number;
}
