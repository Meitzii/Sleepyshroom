import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Check, 
  Sparkles, 
  Download, 
  Monitor, 
  Smartphone, 
  Tablet, 
  ShieldCheck, 
  ChevronRight, 
  ArrowLeft,
  FileCheck,
  Layers
} from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ProductCard } from '../components/common/ProductCard.tsx';

interface ProductDetailPageProps {
  slug: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug }) => {
  const { products, addToCart, downloadFreebie, navigateTo } = useShop();

  const product = products.find(p => p.slug === slug || p.id === slug);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [added, setAdded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!product) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <p className="text-4xl mb-4">🍄</p>
        <h2 className="font-heading font-bold text-2xl text-[#1E1419] mb-2">
          Wallpaper Not Found
        </h2>
        <p className="text-sm text-[#33222C] font-medium mb-6">
          The digital wallpaper you are looking for may have been retired or moved.
        </p>
        <button
          onClick={() => navigateTo('collections')}
          className="px-6 py-3 bg-[#8B6F7A] text-[#F7F3E9] rounded-xl text-sm font-bold hover:bg-[#785E69] transition-all"
        >
          Return to Collections
        </button>
      </div>
    );
  }

  // Related products from same theme or collection
  const relatedProducts = products
    .filter(p => p.id !== product.id && (p.theme === product.theme || p.collection === product.collection))
    .slice(0, 3);

  const handleAddToCart = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = () => {
    addToCart(product, 1);
    navigateTo('checkout');
  };

  const activeImage = product.images[activeImageIndex] || product.images[0];

  return (
    <div className="py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-[#45313D] font-bold mb-6">
          <button onClick={() => navigateTo('home')} className="hover:text-[#1E1419]">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={() => navigateTo('collections')} className="hover:text-[#1E1419]">
            Wallpapers
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1E1419] font-extrabold truncate max-w-xs">
            {product.title}
          </span>
        </nav>

        {/* 2-Column Product Detail View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Image Previews + Device Frame Switcher */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Device Mockup Toggle Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E8C9C1]/40">
              <span className="text-xs font-bold text-[#24171E] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#24171E]" />
                <span>Interactive Screen Preview</span>
              </span>
              <div className="flex items-center gap-1 bg-[#F9F6F0] p-1 rounded-xl border border-[#E8C9C1]">
                <button
                  onClick={() => setDevicePreview('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    devicePreview === 'desktop'
                      ? 'bg-[#8B6F7A] text-[#F7F3E9]'
                      : 'text-[#24171E] hover:bg-[#E8C9C1]/40'
                  }`}
                  title="Desktop Monitor Frame"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevicePreview('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    devicePreview === 'mobile'
                      ? 'bg-[#8B6F7A] text-[#F7F3E9]'
                      : 'text-[#24171E] hover:bg-[#E8C9C1]/40'
                  }`}
                  title="Phone Lock Screen Frame"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDevicePreview('tablet')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                    devicePreview === 'tablet'
                      ? 'bg-[#8B6F7A] text-[#F7F3E9]'
                      : 'text-[#24171E] hover:bg-[#E8C9C1]/40'
                  }`}
                  title="Tablet Screen Frame"
                >
                  <Tablet className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* =========================================================================
             * 🖼️ [PRODUCT DETAIL WALLPAPER PREVIEW]
             * Renders the wallpaper inside interactive Desktop, Tablet, and Mobile device frames.
             * Sourced from `product.images` (controlled by `data/store.json` or Admin Dashboard).
             * ========================================================================= */}
            {/* Main Interactive Screen Frame */}
            <div className="bg-[#F9F6F0] p-4 sm:p-6 rounded-3xl border border-[#E8C9C1] flex items-center justify-center min-h-[380px] sm:min-h-[460px]">
              
              {devicePreview === 'desktop' && (
                /* Desktop Monitor Frame */
                <div className="w-full max-w-2xl bg-[#4A3B43] rounded-2xl p-2.5 sm:p-3.5 shadow-2xl border-2 border-[#8B6F7A]/40 flex flex-col items-center">
                  <div className="w-full aspect-16/10 rounded-lg overflow-hidden bg-black relative">
                    <img
                      src={activeImage}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Simulated macOS / Desktop Menu Bar */}
                    <div className="absolute top-0 inset-x-0 h-4 bg-black/40 backdrop-blur-xs flex items-center justify-between px-3 text-[9px] text-white/90">
                      <span>10:42 AM</span>
                      <span>100% 🔋</span>
                    </div>
                  </div>
                  {/* Stand */}
                  <div className="w-16 h-3 bg-[#35282F] mt-1.5 rounded-b" />
                  <div className="w-28 h-1.5 bg-[#4A3B43] rounded-full" />
                </div>
              )}

              {devicePreview === 'mobile' && (
                /* Phone Frame */
                <div className="w-64 sm:w-72 aspect-9/18 bg-[#35282F] rounded-[40px] p-2.5 shadow-2xl border-4 border-[#8B6F7A]/50 relative flex flex-col">
                  {/* Speaker Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-10 flex items-center justify-end pr-2">
                    <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
                  </div>
                  {/* Screen Content */}
                  <div className="w-full h-full rounded-[30px] overflow-hidden relative">
                    <img
                      src={activeImage}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Simulated iOS Clock */}
                    <div className="absolute top-12 inset-x-0 text-center text-white text-shadow drop-shadow-md">
                      <p className="text-xs font-medium tracking-wide">Friday, November 6</p>
                      <p className="font-heading font-bold text-4xl mt-0.5 tracking-tight">09:41</p>
                    </div>
                  </div>
                </div>
              )}

              {devicePreview === 'tablet' && (
                /* Tablet Frame */
                <div className="w-80 sm:w-96 aspect-4/3 bg-[#35282F] rounded-3xl p-3 shadow-2xl border-4 border-[#8B6F7A]/40 flex flex-col">
                  <div className="w-full h-full rounded-2xl overflow-hidden relative">
                    <img
                      src={activeImage}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-4 text-[10px] text-white/90 font-medium">
                      9:41 AM · 100%
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Image Thumbnails Gallery */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 pt-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#8B6F7A] scale-102 shadow-sm'
                        : 'border-[#E8C9C1] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Digital Download Notice Banner */}
            <div className="p-4 rounded-2xl bg-[#D6C8F2]/30 border border-[#A99BEA]/50 flex items-start gap-3">
              <Download className="w-5 h-5 text-[#24171E] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E1419] space-y-1">
                <p className="font-extrabold text-[#1E1419]">
                  Instant Digital Download
                </p>
                <p className="text-[#33222C] font-medium leading-relaxed">
                  This is a digital wallpaper file. No physical goods will be shipped. You will receive immediate download access upon checkout and via your email confirmation receipt.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-[#F9F6F0] rounded-3xl p-6 sm:p-8 border border-[#E8C9C1] shadow-xs space-y-6">
              
              {/* Category & Theme Metadata */}
              <div className="flex items-center gap-2 text-xs text-[#382631] font-bold">
                <span>{product.theme}</span>
                <span aria-hidden="true">·</span>
                <span>{product.collection}</span>
              </div>

              {/* Title */}
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#1E1419] tracking-tight leading-tight">
                {product.title}
              </h1>

              {/* Social Proof: Download Numbers & Live recent activity ticker */}
              <div className="p-3 bg-[#F4EAE6]/70 rounded-2xl border border-[#D5C2BB] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-[#1E1419] font-bold">
                  <Download className="w-4 h-4 text-[#8B6F7A]" />
                  <span>{(product.downloadCount || 0).toLocaleString()} happy screens downloaded</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {product.recentDownloadTime === 'just now'
                      ? 'Live: Just downloaded right now!'
                      : `Live: Downloaded ${product.recentDownloadTime || 'recently'}`}
                  </span>
                </span>
              </div>

              {/* Price Row (Prices kept distinctive in #945367!) */}
              <div className="flex items-baseline gap-3">
                {Boolean(product.isFree || product.price === 0) ? (
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#945367] tracking-tight">
                    FREE
                  </span>
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#945367] tabular-nums tracking-tight">
                    ${product.price.toFixed(2)}
                  </span>
                )}
                {product.compareAtPrice && (
                  <span className="text-base text-[#7A6672] font-medium line-through tabular-nums">
                    ${product.compareAtPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-xs font-bold text-[#1E1419] bg-[#E8C9C1]/60 px-2.5 py-0.5 rounded-full border border-[#8B6F7A]/20">
                  {Boolean(product.isFree || product.price === 0) ? '100% Free Complimentary Gift' : 'All Resolutions Included'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-[#33222C] font-medium leading-relaxed">
                {product.description}
              </p>

              {/* Purchase or Freebie Action Buttons */}
              <div className="space-y-3 pt-2">
                {Boolean(product.isFree || product.price === 0) ? (
                  <button
                    onClick={() => {
                      setDownloading(true);
                      downloadFreebie(product);
                      setTimeout(() => setDownloading(false), 2500);
                    }}
                    className={`w-full py-4 px-6 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      downloading
                        ? 'bg-emerald-700 text-white'
                        : 'bg-[#945367] hover:bg-[#804255] text-white active:scale-98'
                    }`}
                  >
                    {downloading ? (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Download Started! Check Your Downloads</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Download Free Wallpaper (Instant Access)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCart}
                      className={`w-full py-3.5 px-6 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        added
                          ? 'bg-[#A99BEA] text-white shadow-xs'
                          : 'bg-[#8B6F7A] hover:bg-[#785E69] text-[#F7F3E9] active:scale-98 shadow-sm'
                      }`}
                    >
                      {added ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added to Your Cozy Bag!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleBuyNow}
                      className="w-full py-3.5 px-6 rounded-2xl text-sm font-bold text-[#1E1419] bg-[#E8C9C1]/60 hover:bg-[#E8C9C1] active:scale-98 border border-[#8B6F7A]/30 transition-all flex items-center justify-center cursor-pointer"
                    >
                      Buy Now with 1-Click Checkout
                    </button>
                  </>
                )}
              </div>

              {/* Technical Specifications Breakdown */}
              <div className="border-t border-[#E8C9C1]/50 pt-5 space-y-4">
                
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#24171E]">
                  Digital Package Specifications
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#F4EAE6]/60 rounded-xl">
                    <p className="text-[#45313D] font-bold">Device Types</p>
                    <p className="font-bold text-[#1E1419] mt-0.5 capitalize">
                      {product.deviceTypes.join(', ')}
                    </p>
                  </div>
                  <div className="p-3 bg-[#F4EAE6]/60 rounded-xl">
                    <p className="text-[#45313D] font-bold">Archive Size</p>
                    <p className="font-bold text-[#1E1419] mt-0.5">
                      {product.fileSize}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#F4EAE6]/60 rounded-xl text-xs">
                  <p className="text-[#45313D] font-bold">Available Resolutions</p>
                  <ul className="mt-1 space-y-0.5">
                    {product.resolutions.map((res, i) => (
                      <li key={i} className="font-bold text-[#1E1419] flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#8B6F7A]" />
                        <span>{res}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-[#F4EAE6]/60 rounded-xl text-xs">
                  <p className="text-[#45313D] font-bold">What's Included</p>
                  <ul className="mt-1 space-y-1">
                    {product.whatsIncluded.map((inc, i) => (
                      <li key={i} className="text-[#1E1419] font-medium flex items-start gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#8B6F7A] shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Guarantees */}
              <div className="border-t border-[#E8C9C1]/50 pt-4 flex items-center gap-2 text-xs text-[#24171E] font-bold">
                <ShieldCheck className="w-4 h-4 text-[#8B6F7A]" />
                <span>300 DPI Lossless Quality & Permanent Account Access</span>
              </div>

            </div>

          </div>

        </div>

        {/* Related Wallpapers Section */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 sm:mt-20 pt-12 border-t border-[#E8C9C1]/60">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-heading font-bold text-xl sm:text-2xl text-[#1E1419]">
                  More from {product.theme}
                </h2>
                <p className="text-xs sm:text-sm text-[#33222C] font-medium mt-1">
                  You might also adore these matching cozy wallpapers.
                </p>
              </div>
              <button
                onClick={() => navigateTo('collections', `theme=${encodeURIComponent(product.theme)}`)}
                className="text-xs font-bold text-[#24171E] hover:underline"
              >
                View collection
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedProducts.map(rel => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};
