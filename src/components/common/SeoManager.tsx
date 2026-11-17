import React, { useEffect } from 'react';
import { useShop } from '../../context/ShopContext.tsx';

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export const SeoManager: React.FC = () => {
  const { activeView, viewParam, products, collections, settings } = useShop();

  useEffect(() => {
    const baseUrl = (settings?.seo?.siteUrl || 'https://sleepyshroom.vercel.app').replace(/\/+$/, '');

    let title =
      settings?.seo?.defaultTitle ||
      'sleepyshroom — Cozy Cottagecore Digital Wallpapers & Stationery';
    let description =
      settings?.seo?.defaultDescription ||
      'Cozy, cute, and dreamy digital wallpapers, icon packs, and curated seasonal bundles crafted for desktop, iPad, and mobile screens.';
    let ogType = 'website';
    let ogImage = `${baseUrl}/src/assets/images/hero_mushroom_cottage_1794020164209.jpg`;
    let canonical = `${baseUrl}/`;
    let ogPrice = '';
    let ogCurrency = '';
    let breadcrumbLd: Record<string, unknown> | null = null;
    let collectionLd: Record<string, unknown> | null = null;

    if (activeView === 'product' && viewParam) {
      const prod = products.find((p) => p.slug === viewParam || p.id === viewParam);
      if (prod) {
        title = `${prod.title} | sleepyshroom`;
        description = prod.description.slice(0, 155);
        ogType = 'product';
        const img = prod.images[0] || '';
        ogImage = img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
        canonical = `${baseUrl}/#product/${encodeURIComponent(prod.slug)}`;
        ogPrice = Number(prod.price || 0).toFixed(2);
        ogCurrency = 'USD';
        breadcrumbLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: prod.collection || 'Collections',
              item: `${baseUrl}/#collections`,
            },
            { '@type': 'ListItem', position: 3, name: prod.title, item: canonical },
          ],
        };
      }
    } else if (activeView === 'collections' && viewParam && !viewParam.includes('=')) {
      const col = collections.find(
        (c) => c.slug.toLowerCase() === viewParam.toLowerCase() || c.id.toLowerCase() === viewParam.toLowerCase()
      );
      if (col) {
        title = `${col.name} Theme Collection | sleepyshroom`;
        description = (col.description || description).slice(0, 155);
        const img = col.bannerImage || col.coverImage || '';
        if (img) {
          ogImage = img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
        }
        canonical = `${baseUrl}/collections/${encodeURIComponent(col.slug)}`;
        collectionLd = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: col.name,
          description: col.description,
          url: canonical,
        };
        breadcrumbLd = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Collections', item: `${baseUrl}/#collections` },
            { '@type': 'ListItem', position: 3, name: col.name, item: canonical },
          ],
        };
      }
    } else if (activeView === 'collections') {
      title = 'Digital Wallpaper Collections & Bundles | sleepyshroom';
      description =
        'Browse cozy cottagecore wallpapers, icon packs, and multi-device bundles sorted by theme and screen size.';
      canonical = `${baseUrl}/#collections`;
    } else if (activeView === 'faq') {
      title = 'Frequently Asked Questions | sleepyshroom';
      description =
        'Answers to common questions about PayPal checkout, instant digital downloads, device resolutions, licensing, and support.';
      canonical = `${baseUrl}/#faq`;
    } else if (activeView === 'privacy-policy') {
      title = 'Privacy Policy | sleepyshroom';
      description =
        'Learn how Sleepyshroom collects, safeguards, and processes personal information under the Data Privacy Act of 2012 (RA 10173).';
      canonical = `${baseUrl}/#privacy-policy`;
    } else if (activeView === 'terms-of-service') {
      title = 'Terms of Service | sleepyshroom';
      description =
        'Read the Sleepyshroom Terms of Service covering digital purchases, personal-use licensing, refunds, and store responsibilities.';
      canonical = `${baseUrl}/#terms-of-service`;
    } else if (activeView === 'about') {
      title = 'About Sleepyshroom Studio | sleepyshroom';
      description =
        'Meet the independent digital illustrator behind Sleepyshroom and discover the story behind our cozy cottagecore wallpapers.';
      canonical = `${baseUrl}/#about`;
    } else if (activeView === 'contact') {
      title = 'Contact & Customer Support | sleepyshroom';
      description =
        'Reach Sleepyshroom customer support at shop.sleepyshroom@gmail.com for order help, compatibility questions, or download assistance.';
      canonical = `${baseUrl}/#contact`;
    } else if (activeView === 'policy') {
      title = 'Store Policies & Refunds | sleepyshroom';
      description =
        'Digital product refund policy, copyright guidelines, privacy notice, and customer support terms.';
      canonical = `${baseUrl}/#policy`;
    }

    document.title = title;
    setMetaTag('name', 'description', description);
    setCanonicalLink(canonical);

    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonical);
    setMetaTag('property', 'og:site_name', settings?.storeName || 'sleepyshroom');
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // Standard product OpenGraph metadata
    setMetaTag('property', 'product:price:amount', ogPrice);
    setMetaTag('property', 'product:price:currency', ogCurrency);
    setMetaTag('property', 'og:availability', ogPrice ? 'instock' : '');

    // Dynamic JSON-LD script element for BreadcrumbList & CollectionPage
    const existingDynamicLd = document.getElementById('sleepyshroom-dynamic-jsonld');
    const graph: Record<string, unknown>[] = [];
    if (breadcrumbLd) graph.push(breadcrumbLd);
    if (collectionLd) graph.push(collectionLd);

    if (graph.length > 0) {
      let script = existingDynamicLd as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'sleepyshroom-dynamic-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(graph.length === 1 ? graph[0] : graph);
    } else if (existingDynamicLd) {
      existingDynamicLd.remove();
    }
  }, [activeView, viewParam, products, collections, settings]);

  return null;
};
