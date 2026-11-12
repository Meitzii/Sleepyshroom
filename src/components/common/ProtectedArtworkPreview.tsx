import React, { useState } from 'react';
import { ShroomLogoIcon } from './Icons.tsx';
import { useShop } from '../../context/ShopContext.tsx';

interface ProtectedArtworkPreviewProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  showWatermark?: boolean;
  watermarkOpacity?: number; // 0.10 to 0.45
  watermarkType?: 'diagonal' | 'center' | 'corner';
  enableDeterrence?: boolean;
  loading?: 'lazy' | 'eager';
}

/**
 * ProtectedArtworkPreview
 * 
 * Provides professional storefront preview protection:
 * 1. Deterrence against right-click context menu "Save Image As..."
 * 2. Drag-and-drop prevention (draggable=false & onDragStart preventDefault)
 * 3. Text and image selection disabled (user-select: none)
 * 4. Aesthetically integrated diagonal Sleepyshroom watermark pattern
 * 5. Transparent protective shield layer covering the rendered bitmap
 * 
 * Note: Purchased downloads through the verified order token endpoint (/api/downloads/:token)
 * deliver the original, lossless, unwatermarked high-resolution archive files.
 */
export const ProtectedArtworkPreview: React.FC<ProtectedArtworkPreviewProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-full overflow-hidden select-none',
  showWatermark,
  watermarkOpacity,
  watermarkType,
  enableDeterrence,
  loading = 'lazy',
}) => {
  const { settings } = useShop();
  const protection = settings?.artworkProtection;

  const effectiveShowWatermark = showWatermark !== undefined
    ? showWatermark
    : (protection?.watermarkEnabled !== false);

  const effectiveOpacity = watermarkOpacity !== undefined
    ? watermarkOpacity
    : (protection?.watermarkOpacity ?? 0.22);

  const effectiveType = watermarkType !== undefined
    ? watermarkType
    : (protection?.watermarkStyle ?? 'diagonal');

  const effectiveDeterrence = enableDeterrence !== undefined
    ? enableDeterrence
    : (protection?.disableContextMenu !== false);

  const [showNotice, setShowNotice] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!effectiveDeterrence) return;
    e.preventDefault();
    setShowNotice(true);
    setTimeout(() => setShowNotice(false), 2400);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={containerClassName}
      onContextMenu={handleContextMenu}
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Underlying Image Element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        draggable={false}
        onDragStart={handleDragStart}
        className={`${className} select-none pointer-events-none transition-transform duration-500`}
      />

      {/* Repeating Diagonal Watermark Layer */}
      {effectiveShowWatermark && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
          style={{ opacity: effectiveOpacity }}
        >
          {effectiveType === 'diagonal' && (
            <svg
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id={`shroom-watermark-pattern-${alt.slice(0, 8).replace(/\s+/g, '')}`}
                  width="180"
                  height="110"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-25)"
                >
                  <text
                    x="20"
                    y="40"
                    fill="#FFFFFF"
                    stroke="#292929"
                    strokeWidth="0.5"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="Quicksand, sans-serif"
                    letterSpacing="0.05em"
                  >
                    🍄 sleepyshroom
                  </text>
                  <text
                    x="24"
                    y="55"
                    fill="#FFFFFF"
                    stroke="#292929"
                    strokeWidth="0.4"
                    fontSize="8"
                    fontWeight="600"
                    fontFamily="Quicksand, sans-serif"
                    letterSpacing="0.08em"
                    opacity="0.85"
                  >
                    PREVIEW · ORIGINAL ART
                  </text>
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={`url(#shroom-watermark-pattern-${alt.slice(0, 8).replace(/\s+/g, '')})`}
              />
            </svg>
          )}

          {effectiveType === 'center' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-xs rounded-2xl text-white font-heading font-bold text-xs tracking-wider border border-white/20">
                <ShroomLogoIcon size={20} />
                <span>sleepyshroom · Preview</span>
              </div>
            </div>
          )}

          {effectiveType === 'corner' && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] text-white font-bold tracking-wider border border-white/20">
              © sleepyshroom
            </div>
          )}
        </div>
      )}

      {/* Transparent Protective Click Shield Layer */}
      <div
        className="absolute inset-0 z-10 pointer-events-auto cursor-pointer"
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
      />

      {/* Polite Deterrence Notice Toast */}
      {showNotice && (
        <div className="absolute bottom-3 inset-x-3 z-30 pointer-events-none transition-all duration-200">
          <div className="mx-auto max-w-xs bg-[#292929]/95 text-[#FFFCF7] text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg border border-[#EADCC8]/30 text-center flex items-center justify-center gap-1.5 backdrop-blur-sm">
            <span>🍄</span>
            <span>Protected preview. Purchased downloads are delivered 100% watermark-free!</span>
          </div>
        </div>
      )}
    </div>
  );
};
