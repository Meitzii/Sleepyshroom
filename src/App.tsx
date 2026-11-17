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
import { ScrollReveal } from './components/common/ScrollReveal.tsx';
import { SeoManager } from './components/common/SeoManager.tsx';
import { Footer } from './components/Footer.tsx';

// Page components
import { CollectionsPage } from './pages/CollectionsPage.tsx';
import { CollectionPage } from './pages/CollectionPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage.tsx';
import { CustomerAccountPage } from './pages/CustomerAccountPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AboutMePage } from './pages/AboutMePage.tsx';
import { ReturnPolicyPage } from './pages/ReturnPolicyPage.tsx';
import { FaqPage } from './pages/FaqPage.tsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.tsx';
import { TermsOfServicePage } from './pages/TermsOfServicePage.tsx';
import { UnsubscribePage } from './pages/UnsubscribePage.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';

const MainLayout: React.FC = () => {
  const { activeView, viewParam, settings, loading } = useShop();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF] text-[#292929] space-y-3">
        <div className="w-12 h-12 rounded-full border-3 border-[#A64B3C]/20 border-t-[#A64B3C] animate-spin" />
        <p className="font-heading font-bold text-sm">
          Opening the little mushroom cottage...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#292929] selection:bg-[#F3EFEA] selection:text-[#292929]">
      <SeoManager />

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
              <ScrollReveal direction="up" distance={14} durationMs={600} initialVisible={true}>
                <HeroSection />
              </ScrollReveal>
            )}
            {settings?.showCarousel !== false && (
              <ScrollReveal direction="up" distance={24} durationMs={700} threshold={0.08}>
                <ThemeCarousel />
              </ScrollReveal>
            )}
            {settings?.showDesktopSection !== false && (
              <ScrollReveal direction="up" distance={24} durationMs={700} threshold={0.08}>
                <DesktopThemesSection />
              </ScrollReveal>
            )}
            {settings?.showMobileSection !== false && (
              <ScrollReveal direction="up" distance={24} durationMs={700} threshold={0.08}>
                <MobileTabletThemesSection />
              </ScrollReveal>
            )}
            <ScrollReveal direction="up" distance={24} durationMs={700} threshold={0.08}>
              <FreeWallpapersSection />
            </ScrollReveal>
            {settings?.showBrandIntro !== false && (
              <ScrollReveal direction="up" distance={24} durationMs={700} threshold={0.08}>
                <BrandIntroSection />
              </ScrollReveal>
            )}
          </>
        )}

        {activeView === 'collections' && (
          viewParam && !viewParam.includes('=')
            ? <CollectionPage slug={viewParam} />
            : <CollectionsPage />
        )}

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

        {activeView === 'faq' && <FaqPage />}

        {activeView === 'privacy-policy' && <PrivacyPolicyPage />}

        {activeView === 'terms-of-service' && <TermsOfServicePage />}

        {activeView === 'unsubscribe' && <UnsubscribePage />}

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
