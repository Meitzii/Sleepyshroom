import React, { useState } from 'react';
import { Package, Check, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import type { ThemeBundle, Product } from '../../types/index.ts';
import { useShop } from '../../context/ShopContext.tsx';
import { ProtectedArtworkPreview } from '../common/ProtectedArtworkPreview.tsx';
import { SectionHeading } from '../common/SectionHeading.tsx';

interface CollectionBundleSectionProps {
  bundles: ThemeBundle[];
  collectionProducts: Product[];
}

export const CollectionBundleSection: React.FC<CollectionBundleSectionProps> = ({
  bundles,
  collectionProducts,
}) => {
  const { addToCart, navigateTo, products } = useShop();
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);

  if (!bundles || bundles.length === 0) return null;

  const findBundleProduct = (bundle: ThemeBundle): Product => {
    const existing = products.find(
      (p) =>
        p.id === `prod-bundle-${bundle.id}` ||
        p.slug === bundle.slug ||
        (p.isBundle && p.title.toLowerCase() === bundle.title.toLowerCase())
    );
    if (existing) return existing;

    return {
      id: `prod-bundle-${bundle.id}`,
      title: bundle.title,
      slug: bundle.slug,
      description: bundle.description,
      price: bundle.bundlePrice,
      compareAtPrice: bundle.originalPrice,
      theme: bundle.collectionName,
      collection: bundle.collectionName,
      collectionId: bundle.collectionId,
      category: 'bundle',
      productType: 'bundle',
      isBundle: true,
      bundleItemCount: bundle.productIds.length,
      bundleProductIds: bundle.productIds,
      bundleSavingsPercent: bundle.savingsPercent,
      deviceTypes: ['desktop', 'mobile', 'tablet'],
      resolutions: ['4K Desktop', 'Retina Mobile', 'High-Res Tablet', 'ZIP Archive'],
      fileFormat: 'Lossless 300 DPI PNG & ZIP Archive',
      fileSize: '45.0 MB',
      whatsIncluded: bundle.includedItems,
      images: [bundle.previewImage],
      featured: true,
      isNew: false,
      popularity: 95,
      status: 'published',
      createdAt: bundle.createdAt,
      downloadFileName: `${bundle.slug}_complete_bundle.zip`,
    };
  };

  const handleAddBundle = (bundle: ThemeBundle) => {
    const prod = findBundleProduct(bundle);
    addToCart(prod, 1, true);
    setAddedBundleId(bundle.id);
    setTimeout(() => setAddedBundleId(null), 1800);
  };

  return (
    <section className="py-12 border-t border-neutral-200 bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center">
          <SectionHeading
            as="h2"
            size="md"
            subtitle="Unlock every screen size and icon pack in one instant download package."
          >
            Complete Collection Sets
          </SectionHeading>
        </div>

        <div className="space-y-6">
          {bundles.map((bundle) => {
            const bundleProd = findBundleProduct(bundle);
            const isAdded = addedBundleId === bundle.id;
            const childTitles = bundle.productIds
              .map((cid) => collectionProducts.find((p) => p.id === cid)?.title)
              .filter(Boolean) as string[];
            const displayItems = bundle.includedItems.length > 0 ? bundle.includedItems : childTitles;

            return (
              <div
                key={bundle.id}
                className="bg-[#FFFFFF] rounded-3xl border border-neutral-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12"
              >
                {/* Bundle Artwork */}
                <div className="lg:col-span-5 relative min-h-[240px] bg-neutral-100">
                  <ProtectedArtworkPreview
                    src={bundle.previewImage}
                    alt={bundle.title}
                    showWatermark={true}
                    watermarkOpacity={0.2}
                    className="w-full h-full object-cover"
                  />
                  {bundle.savingsPercent > 0 && (
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#A64B3C] text-[#FFFCF7] text-xs font-extrabold shadow-sm">
                      Save {bundle.savingsPercent}% (${bundle.savingsAmount.toFixed(2)} off)
                    </div>
                  )}
                </div>

                {/* Bundle Details */}
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#A64B3C]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>All-in-One Digital Bundle · {bundle.productIds.length} Included Releases</span>
                    </div>
                    <h3 className="font-heading font-bold text-2xl text-[#292929]">
                      {bundle.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#777777] font-medium leading-relaxed">
                      {bundle.description}
                    </p>

                    {displayItems.length > 0 && (
                      <div className="bg-[#FCF3E2] rounded-2xl p-4 border border-[#EADCC8] space-y-2">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#292929]">
                          Everything Included in This Bundle:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#292929] font-semibold">
                          {displayItems.map((line, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-[#A64B3C] shrink-0 mt-0.5" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#EADCC8] flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[#A64B3C] tabular-nums">
                        ${bundle.bundlePrice.toFixed(2)}
                      </span>
                      {bundle.originalPrice > bundle.bundlePrice && (
                        <span className="text-sm text-[#777777] line-through font-semibold tabular-nums">
                          ${bundle.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => navigateTo('product', bundleProd.slug)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#292929] bg-[#FCF3E2] hover:bg-[#EADCC8] border border-[#EADCC8] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBundle(bundle)}
                        className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs ${
                          isAdded
                            ? 'bg-emerald-700 text-[#FFFCF7]'
                            : 'bg-[#A64B3C] hover:bg-[#8E3E30] text-[#FFFCF7]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Bundle Added!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            <span>Add Bundle to Bag</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
