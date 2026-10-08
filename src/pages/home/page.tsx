
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProducts from './components/FeaturedProducts';
import RecentlyViewed from './components/RecentlyViewed';
import AboutSection from './components/AboutSection';
import KoreanCulture from './components/KoreanCulture';
import ReviewsSection from './components/ReviewsSection';
import PartnersSection from './components/PartnersSection';
import FAQSection from './components/FAQSection';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import { useSEO, getWebsiteSchema, getLocalBusinessSchema } from '../../utils/seo';

export default function Home() {
  useSEO({
    title: 'Магазин за Корейска Храна | K-FOOD - Онлайн Корейски Магазин България',
    description: 'K-FOOD е специализиран онлайн магазин за корейска храна, кухня и култура в България. Корейска храна с доставка до вкъщи: кимчи, рамен Samyang, токбоки, корейски сосове и снакове. Над 200 продукта. Поръчай сега!',
    keywords: 'магазин за корейска храна, корейска храна, онлайн корейски магазин, корейски магазин онлайн, корейски продукти България, кимчи онлайн, рамен Samyang, корейски рамен, токбоки, корейски сосове, K-FOOD, корейска храна доставка, купи корейска храна, корейски снакове, автентична корейска храна',
    canonical: '/',
    ogType: 'website',
    ogImage: 'https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getWebsiteSchema(),
        getLocalBusinessSchema()
      ]
    }
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main id="main-content">
      <Hero />
      <FeaturedProducts />
      <RecentlyViewed />
      <AboutSection />
      <KoreanCulture />
      <ReviewsSection />
      <PartnersSection />
      <FAQSection />
      <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
