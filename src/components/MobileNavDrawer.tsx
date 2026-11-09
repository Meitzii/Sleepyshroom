import React from 'react';
import { X, Sparkles, Monitor, Smartphone, MessageCircle, Heart, FileText, User } from 'lucide-react';
import { useShop } from '../context/ShopContext.tsx';
import { ShroomLogoIcon } from './common/Icons.tsx';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { navigateTo, user, settings } = useShop();

  if (!isOpen) return null;

  const handleNav = (view: string, param: string | null = null) => {
    navigateTo(view, param);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#35282F]/40 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-xs bg-[#F7F3E9] h-full shadow-2xl flex flex-col z-10 border-r border-[#E8C9C1]">
        
        {/* Drawer Header */}
        <div className="p-5 flex items-center justify-between border-b border-[#E8C9C1]/60 bg-[#F4EAE6]/50">
          <div className="flex items-center gap-3">
            <ShroomLogoIcon size={34} />
            <div>
              <h2 className="font-heading font-bold text-lg text-[#24171E] leading-none">
                {settings?.storeName || 'sleepyshroom'}
              </h2>
              <p className="text-[11px] font-bold text-[#45313D] mt-0.5">
                {settings?.tagline || 'Little screens, sweeter dreams.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#24171E] hover:bg-[#E8C9C1]/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#3B2834]">
            Storefront
          </div>

          <button
            onClick={() => handleNav('home')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-[#4A323D]" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNav('collections')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-[#4A323D]" />
            <span>All Collections</span>
          </button>

          <button
            onClick={() => handleNav('collections', 'free=true')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-extrabold text-[#945367] bg-[#FAF7F0] border border-[#D6C8F2] hover:bg-[#D6C8F2]/30 transition-colors text-left"
          >
            <span className="text-base leading-none">🎁</span>
            <span>Freebies ($0 Instant Access)</span>
          </button>

          <button
            onClick={() => handleNav('collections', 'device=desktop')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <Monitor className="w-4 h-4 text-[#4A323D]" />
            <span>Desktop Themes</span>
          </button>

          <button
            onClick={() => handleNav('collections', 'device=mobile')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <Smartphone className="w-4 h-4 text-[#4A323D]" />
            <span>Mobile & Tablet Themes</span>
          </button>

          <div className="pt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#3B2834]">
            About & Help
          </div>

          <button
            onClick={() => handleNav('about')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <Heart className="w-4 h-4 text-[#4A323D]" />
            <span>About Me</span>
          </button>

          <button
            onClick={() => handleNav('contact')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <MessageCircle className="w-4 h-4 text-[#4A323D]" />
            <span>Contact</span>
          </button>

          <button
            onClick={() => handleNav('policy')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <FileText className="w-4 h-4 text-[#4A323D]" />
            <span>Return & Refund Policy</span>
          </button>

          <div className="pt-4 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#3B2834]">
            My Account
          </div>

          <button
            onClick={() => handleNav('account')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-[#1E1419] hover:bg-[#E8C9C1]/40 transition-colors text-left"
          >
            <User className="w-4 h-4 text-[#4A323D]" />
            <span>{user ? `Account (${user.name})` : 'Sign In / Account'}</span>
          </button>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E8C9C1]/60 bg-[#F4EAE6]/30 text-center">
          <p className="text-xs text-[#3B2834] font-semibold">
            Made with love, wherever you are.
          </p>
          <p className="text-[10px] text-[#4A3542] mt-1">
            © 2026 sleepyshroom
          </p>
        </div>

      </div>
    </div>
  );
};
