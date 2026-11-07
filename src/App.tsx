import React, { useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext.tsx';
import { Header } from './components/Header.tsx';
import { MobileNavDrawer } from './components/MobileNavDrawer.tsx';
import { CartDrawer } from './components/cart/CartDrawer.tsx';
import { HeroSection } from './components/home/HeroSection.tsx';
import { ThemeCarousel } from './components/home/ThemeCarousel.tsx';
import { DesktopThemesSection } from './components/home/DesktopThemesSection.tsx';
import { FreeWallpapersSection } from './components/home/FreeWallpapersSection.tsx';
import { MobileTabletThemesSection } from './components/home/MobileTabletThemesSection.tsx';
import { BrandIntroSection } from './components/home/BrandIntroSection.tsx';
import { LiveActivityToast } from './components/common/LiveActivityToast.tsx';
import { Footer } from './components/Footer.tsx';

// Page components
import { CollectionsPage } from './pages/CollectionsPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { CustomerAccountPage } from './pages/CustomerAccountPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AboutMePage } from './pages/AboutMePage.tsx';
import { ReturnPolicyPage } from './pages/ReturnPolicyPage.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';

const MainLayout: React.FC = () => {
  const { activeView, viewParam, settings, loading } = useShop();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToThemes = () => {
    const el = document.getElementById('explore-themes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F3E9] text-[#382831] space-y-3">
        <div className="w-12 h-12 rounded-full border-3 border-[#8B6F7A]/20 border-t-[#8B6F7A] animate-spin" />
        <p className="font-heading font-bold text-sm">
          Opening the little mushroom cottage...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3E9] text-[#1E1419] selection:bg-[#E8C9C1] selection:text-[#1E1419]">
      
      {/* Sticky Header with Navigation, Search, Cart */}
      <Header onOpenMenu={() => setMobileMenuOpen(true)} />

      {/* Hamburger Navigation Drawer */}
      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Persistent Shopping Cart Slide-over */}
      <CartDrawer />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'home' && (
          <>
            {settings?.showHero !== false && (
              <HeroSection onScrollToThemes={scrollToThemes} />
            )}
            {settings?.showCarousel !== false && (
              <ThemeCarousel />
            )}
            {settings?.showDesktopSection !== false && (
              <DesktopThemesSection />
            )}
            <FreeWallpapersSection />
            {settings?.showMobileSection !== false && (
              <MobileTabletThemesSection />
            )}
            {settings?.showBrandIntro !== false && (
              <BrandIntroSection />
            )}
          </>
        )}

        {activeView === 'collections' && <CollectionsPage />}

        {activeView === 'product' && (
          <ProductDetailPage slug={viewParam || ''} />
        )}

        {activeView === 'checkout' && <CheckoutPage />}

        {activeView === 'confirmation' && (
          <OrderConfirmationPage token={viewParam || ''} />
        )}

        {activeView === 'account' && <CustomerAccountPage />}

        {activeView === 'contact' && <ContactPage />}

        {activeView === 'about' && <AboutMePage />}

        {activeView === 'policy' && <ReturnPolicyPage />}

        {activeView === 'admin' && <AdminDashboard />}
      </main>

      {/* Floating Live Activity Toast */}
      <LiveActivityToast />

      {/* Footer */}
      <Footer />

    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <MainLayout />
    </ShopProvider>
  );
}
