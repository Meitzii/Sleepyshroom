import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext.tsx';

export const LiveActivityToast: React.FC = () => {
  const { liveToast, setLiveToast } = useShop();

  if (!liveToast) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 max-w-sm sm:max-w-md animate-bounce-in transition-all">
      <div className="bg-[#FCF3E2] border border-[#EADCC8] shadow-xl rounded-2xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
        <div className="w-9 h-9 rounded-xl bg-[#FFFCF7] border border-[#EADCC8] flex items-center justify-center shrink-0 text-[#A64B3C]">
          <Sparkles className="w-4 h-4 animate-spin text-[#A64B3C]" style={{ animationDuration: '6s' }} />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-[11px] font-bold text-[#A64B3C] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Live Activity</span>
          </p>
          <p className="text-xs font-semibold text-[#292929] leading-snug truncate">
            {liveToast}
          </p>
        </div>
        <button
          onClick={() => setLiveToast(null)}
          className="text-[#777777] hover:text-[#292929] p-1 rounded-lg hover:bg-[#FFFCF7]/60 transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
