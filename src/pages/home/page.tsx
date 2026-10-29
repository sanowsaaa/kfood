
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedProducts from './components/FeaturedProducts';
import RecentlyViewed from './components/RecentlyViewed';
import AboutSection from './components/AboutSection';
import KoreanCulture from './components/KoreanCulture';
import ReviewsSection from './components/ReviewsSection';
import FAQSection from './components/FAQSection';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import { useSEO, getWebsiteSchema, getLocalBusinessSchema } from '../../utils/seo';
import { Link } from 'react-router-dom';

export default function Home() {
  useSEO({
    title: 'Корейска храна онлайн | K-FOOD Велико Търново',
    description: 'Открий рамен Samyang и Buldak, кимчи, токбоки, сосове и снакове в K-FOOD. Поръчай онлайн без регистрация с доставка в България или ни посети във Велико Търново.',
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
      <section aria-labelledby="ruse-opening-title" className="bg-brand-blush px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-6 rounded-2xl border border-brand-border bg-white p-5 sm:gap-8 sm:p-8 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-hover">Нова локация · K-FOOD Русе</p>
            <h2 id="ruse-opening-title" className="font-heading text-3xl leading-tight text-brand-ink sm:text-4xl">Русе, имаме среща!</h2>
            <p className="mt-3 text-base leading-relaxed text-brand-muted sm:text-lg">Откриваме нов корейски супермаркет — още едно място за любимите вкусове и малките открития, които си струва да споделиш.</p>
            <dl className="mt-5 space-y-3 text-sm text-brand-ink sm:text-base">
              <div>
                <dt className="font-bold">Откриване</dt>
                <dd><time dateTime="2026-11-07T10:00:00+02:00">7 ноември 2026 г. · 10:00 ч.</time></dd>
              </div>
              <div>
                <dt className="font-bold">Очакваме те на</dt>
                <dd>гр. Русе, ул. „Константин Иречек“ 9</dd>
              </div>
            </dl>
            <Link to="/blog/k-food-ruse-otkrivane-koreyski-supermarket" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-hover sm:text-base">
              Всичко за откриването
              <i aria-hidden="true" className="ri-arrow-right-line text-lg" />
            </Link>
          </div>
          <img src="/images/news/k-food-ruse-storefront.webp" alt="Визията на витрината на новия корейски супермаркет K-FOOD в Русе" width="1280" height="794" loading="lazy" decoding="async" className="h-auto w-full rounded-xl" />
        </div>
      </section>
      <FeaturedProducts />
      <RecentlyViewed />
      <AboutSection />
      <KoreanCulture />
      <ReviewsSection />
      <FAQSection />
      <Newsletter />
      </main>
      <Footer />
    </div>
  );
}
