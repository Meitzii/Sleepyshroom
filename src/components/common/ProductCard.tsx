import React, { useState } from 'react';
import { Eye, ShoppingBag, Check, Sparkles, Download, Gift } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';
import type { Product } from '../../types/index.ts';

interface ProductCardProps {
  product: Product;
  orientation?: 'landscape' | 'portrait' | 'auto';
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  orientation = 'auto' 
}) => {
  const { addToCart, downloadFreebie, navigateTo } = useShop();
  const [added, setAdded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isFree = Boolean(product.isFree || product.price === 0);

  // Determine aspect ratio based on orientation
  const isPortrait = orientation === 'portrait' || (orientation === 'auto' && product.deviceTypes.includes('mobile') && !product.deviceTypes.includes('desktop'));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleDirectDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    downloadFreebie(product);
    setTimeout(() => setDownloading(false), 2000);
  };

  const handleCardClick = () => {
    navigateTo('product', product.slug);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-[#F9F6F0] rounded-3xl border overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer ${
        isFree ? 'border-[#D6C8F2] ring-2 ring-[#D6C8F2]/40' : 'border-[#E8C9C1]'
      }`}
    >
      {/* =========================================================================
       * 🖼️ [WALLPAPER DISPLAY IMAGE]
       * This <img> tag renders the wallpaper preview on the website.
       * The image source comes from `product.images[0]`.
       * To change which image displays here:
       *   -> Edit `data/store.json` (search for the wallpaper title, change `images[0]`)
       *   -> OR edit in Admin Dashboard at /admin -> Products -> Edit Product -> Image URL
       * ========================================================================= */}
      <div 
        className={`relative w-full overflow-hidden bg-[#E8C9C1]/20 ${
          isPortrait ? 'aspect-9/14 sm:aspect-9/14' : 'aspect-16/10'
        }`}
      >
        <img
          src={product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-104"
          loading="lazy"
        />

        {/* Subtle hover gradient */}
        <div className="absolute inset-0 bg-[#35282F]/10 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Device & Freebie Badges in Corner */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1 items-center">
          {isFree ? (
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FFD58A] text-[#1E1419] shadow-xs flex items-center gap-1 border border-[#E6A020]/40">
              <Gift className="w-3 h-3 text-[#1E1419]" />
              <span>Free Gift</span>
            </span>
          ) : null}

          {product.deviceTypes.map(d => (
            <span
              key={d}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F7F3E9]/95 backdrop-blur-xs text-[#24171E] border border-[#E8C9C1]"
            >
              {d}
            </span>
          ))}
          {product.isNew && !isFree && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FFD58A] text-[#1E1419]">
              New
            </span>
          )}
        </div>

        {/* Quick View Button on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="px-4 py-2 bg-[#F7F3E9]/95 text-[#24171E] rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs">
            <Eye className="w-3.5 h-3.5 text-[#24171E]" />
            <span>View Details</span>
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        
        {/* Theme and Collection unboxed metadata */}
        <div className="flex items-center gap-1.5 text-xs text-[#382631] font-bold mb-1">
          <span>{product.theme}</span>
          <span aria-hidden="true">·</span>
          <span>{product.collection}</span>
        </div>

        {/* Product Title */}
        <h4 className="font-heading font-bold text-base text-[#1E1419] group-hover:text-[#8B6F7A] transition-colors line-clamp-1 mb-2">
          {product.title}
        </h4>

        {/* Social Proof: Download Numbers & Live recent activity ticker */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-semibold text-[#382631] mb-2.5">
          <span className="flex items-center gap-1 text-[#45313D] font-bold">
            <Download className="w-3 h-3 text-[#8B6F7A]" />
            <span>{(product.downloadCount || 0).toLocaleString()} downloaded</span>
          </span>

          {/* Live text indicator whenever someone bought or downloaded */}
          <span className="text-[10px] font-bold text-emerald-900 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {product.recentDownloadTime === 'just now'
                ? 'Just downloaded!'
                : `Downloaded ${product.recentDownloadTime || 'recently'}`}
            </span>
          </span>
        </div>

        {/* Price & Actions (Price kept distinctive in #945367) */}
        <div className="pt-2 border-t border-[#E8C9C1]/50 flex items-center justify-between gap-2 mt-auto">
          
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-base sm:text-lg font-extrabold text-[#945367] tracking-tight">
                FREE
              </span>
            ) : (
              <span className="text-base sm:text-lg font-bold text-[#945367] tabular-nums tracking-tight">
                ${product.price.toFixed(2)}
              </span>
            )}
            {product.compareAtPrice && (
              <span className="text-xs text-[#7A6672] font-medium line-through tabular-nums">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Action button: Direct Freebie Download or Add to Cart */}
          {isFree ? (
            <button
              onClick={handleDirectDownload}
              aria-label={`Download ${product.title} for free`}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                downloading
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#945367] hover:bg-[#804255] text-white active:scale-95'
              }`}
            >
              {downloading ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Free Download</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              aria-label={`Add ${product.title} to cart`}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                added
                  ? 'bg-[#A99BEA] text-white'
                  : 'bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] active:scale-95'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
