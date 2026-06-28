import { maskableIcon } from '@/lib/brand-og';

// PWA maskable icon (192×192), generated via next/og — keeps the /icons path stable.
export function GET() {
  return maskableIcon(192);
}
