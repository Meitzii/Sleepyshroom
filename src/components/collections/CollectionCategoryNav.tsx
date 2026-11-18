import React from 'react';
import {
  Layers,
  Smartphone,
  Monitor,
  Grid,
  Package,
  NotebookPen,
  BookHeart,
  Calendar,
  ListChecks,
  HeartPulse,
  Sticker,
  Wallet,
} from 'lucide-react';

export interface CategoryOption {
  id: string;
  label: string;
  count: number;
}

interface CollectionCategoryNavProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const iconForCategory = (cat: string) => {
  switch (cat) {
    case 'phone_tablet':
      return <Smartphone className="w-4 h-4" />;
    case 'desktop':
      return <Monitor className="w-4 h-4" />;
    case 'icon_pack':
      return <Grid className="w-4 h-4" />;
    case 'bundle':
      return <Package className="w-4 h-4" />;
    case 'digital-notes':
      return <NotebookPen className="w-4 h-4" />;
    case 'digital-journals':
      return <BookHeart className="w-4 h-4" />;
    case 'calendars-schedules':
      return <Calendar className="w-4 h-4" />;
    case 'to-do-lists':
      return <ListChecks className="w-4 h-4" />;
    case 'habit-mood-trackers':
      return <HeartPulse className="w-4 h-4" />;
    case 'digital-stickers':
      return <Sticker className="w-4 h-4" />;
    case 'budget-planners':
      return <Wallet className="w-4 h-4" />;
    default:
      return <Layers className="w-4 h-4" />;
  }
};

export const CollectionCategoryNav: React.FC<CollectionCategoryNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div className="border-b border-neutral-200 bg-[#FFFFFF]/95 backdrop-blur-sm sticky top-16 sm:top-18 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          role="tablist"
          aria-label="Collection Categories"
          className="flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible no-scrollbar py-3.5"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectCategory(cat.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                  active
                    ? 'bg-[#A64B3C] text-[#FFFCF7] border-[#8E3E30] shadow-xs'
                    : 'bg-[#FCF3E2] text-[#292929] border-[#EADCC8] hover:bg-[#EADCC8]/70'
                }`}
              >
                {iconForCategory(cat.id)}
                <span>{cat.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-lg font-extrabold tabular-nums ${
                    active
                      ? 'bg-[#FFFCF7]/20 text-[#FFFCF7]'
                      : 'bg-[#FFFCF7] text-[#777777] border border-[#EADCC8]'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
