import type { Collection, Product, StationeryCategorySlug } from '../types/index.ts';

export interface StationeryCategoryDefinition {
  id: StationeryCategorySlug;
  slug: StationeryCategorySlug;
  label: string;
  description: string;
}

export const DIGITAL_STATIONERY_COLLECTION_SLUG = 'digital-stationery';
export const DIGITAL_STATIONERY_COLLECTION_ID = 'col-digital-stationery';
export const DIGITAL_STATIONERY_COLLECTION_NAME = 'Digital Stationery';

export const DIGITAL_STATIONERY_DESCRIPTION =
  'Cozy digital notebooks, hyperlinked journals, gentle planners, and hand-drawn stickers crafted to make every study session, plan, and quiet reflection feel warm and intentional.';

/**
 * Scalable Digital Stationery category registry.
 * Add new entries here to automatically expose them in navigation, category tabs,
 * collection pages, and admin product assignment.
 */
export const DIGITAL_STATIONERY_CATEGORIES: StationeryCategoryDefinition[] = [
  {
    id: 'digital-notes',
    slug: 'digital-notes',
    label: 'Digital Notes',
    description:
      'Clean lined, dotted, Cornell, and grid digital notebooks with warm paper textures and quick index tabs for GoodNotes, Notability, and tablet note-taking.',
  },
  {
    id: 'digital-journals',
    slug: 'digital-journals',
    label: 'Digital Journals',
    description:
      'Reflective daily, gratitude, and botanical memory journals designed for slow mornings, quiet evenings, and creative keepsakes.',
  },
  {
    id: 'calendars-schedules',
    slug: 'calendars-schedules',
    label: 'Calendars & Schedules',
    description:
      'Monthly, weekly, and gentle hourly schedule layouts with seamless hyperlinks to keep your classes, creative work, and cozy routines in harmony.',
  },
  {
    id: 'to-do-lists',
    slug: 'to-do-lists',
    label: 'To-Do Lists',
    description:
      'Calm priority pads, brain-dump checklists, and daily focus sheets crafted to help you organize tasks without overwhelm.',
  },
  {
    id: 'habit-mood-trackers',
    slug: 'habit-mood-trackers',
    label: 'Habit & Mood Trackers',
    description:
      'Gentle visual mood pixels, hydration logs, sleep charts, and habit-building spreads adorned with sleepy cottagecore motifs.',
  },
  {
    id: 'digital-stickers',
    slug: 'digital-stickers',
    label: 'Digital Stickers',
    description:
      'Pre-cropped transparent PNG and GoodNotes sticker books packed with hand-drawn sleepy mushrooms, teacups, leaves, and decorative tape.',
  },
  {
    id: 'budget-planners',
    slug: 'budget-planners',
    label: 'Budget Planners',
    description:
      'Warm, approachable monthly budget trackers, savings jars, expense logs, and bill checklists that make mindful budgeting comforting.',
  },
];

const STATIONERY_CATEGORY_MAP = new Map<string, StationeryCategoryDefinition>(
  DIGITAL_STATIONERY_CATEGORIES.map((cat) => [cat.id, cat])
);

export function normalizeStationerySlug(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
}

export function isStationeryCategoryId(value?: string | null): value is StationeryCategorySlug {
  const norm = normalizeStationerySlug(value);
  return STATIONERY_CATEGORY_MAP.has(norm);
}

export function getStationeryCategoryBySlug(
  slug?: string | null
): StationeryCategoryDefinition | null {
  const norm = normalizeStationerySlug(slug);
  return STATIONERY_CATEGORY_MAP.get(norm) || null;
}

export function getStationeryCategoryLabel(categoryId?: string | null): string {
  const found = getStationeryCategoryBySlug(categoryId);
  return found ? found.label : DIGITAL_STATIONERY_COLLECTION_NAME;
}

export function isStationeryProduct(product: Partial<Product> | null | undefined): boolean {
  if (!product) return false;
  if (product.productType === 'stationery') return true;
  if (isStationeryCategoryId(product.category)) return true;
  if (product.collectionId === DIGITAL_STATIONERY_COLLECTION_ID) return true;
  if (
    String(product.collection || '')
      .trim()
      .toLowerCase() === 'digital stationery'
  ) {
    return true;
  }
  return false;
}

export function isStationeryCollection(collection: Partial<Collection> | null | undefined): boolean {
  if (!collection) return false;
  const slug = String(collection.slug || '').trim().toLowerCase();
  const id = String(collection.id || '').trim().toLowerCase();
  const name = String(collection.name || '').trim().toLowerCase();
  return (
    collection.collectionType === 'stationery' ||
    slug === DIGITAL_STATIONERY_COLLECTION_SLUG ||
    id === DIGITAL_STATIONERY_COLLECTION_ID ||
    name === 'digital stationery' ||
    isStationeryCategoryId(slug)
  );
}

export function matchesStationeryCategory(
  product: Partial<Product>,
  category: string
): boolean {
  if (!isStationeryProduct(product)) return false;
  const normFilter = normalizeStationerySlug(category);
  if (!normFilter || normFilter === 'all') return true;
  const normProdCat = normalizeStationerySlug(product.category);
  return normProdCat === normFilter;
}

export interface StationeryRouteResolution {
  isStationeryRoute: boolean;
  activeCategory: 'all' | StationeryCategorySlug;
  categoryDef: StationeryCategoryDefinition | null;
}

export function resolveStationeryRouteSlug(slug?: string | null): StationeryRouteResolution | null {
  const norm = normalizeStationerySlug(slug);
  if (!norm) return null;

  if (norm === DIGITAL_STATIONERY_COLLECTION_SLUG || norm === 'col-digital-stationery') {
    return {
      isStationeryRoute: true,
      activeCategory: 'all',
      categoryDef: null,
    };
  }

  const categoryDef = getStationeryCategoryBySlug(norm);
  if (categoryDef) {
    return {
      isStationeryRoute: true,
      activeCategory: categoryDef.id,
      categoryDef,
    };
  }

  return null;
}
