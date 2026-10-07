import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSEO, getBreadcrumbSchema } from '@/utils/seo';
import Header from '@/pages/home/components/Header';
import Footer from '@/pages/home/components/Footer';

const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

/* ===== STOCK IMAGES (readdy.ai — compatible with CSP) ===== */
const HERO_BG = 'https://readdy.ai/api/search-image?query=Industrial%20warehouse%20interior%20with%20tall%20stacks%20of%20sealed%20cardboard%20boxes%20and%20packages%20on%20wooden%20pallets%2C%20low%20angle%20view%20looking%20up%20at%20towering%20box%20columns%20beneath%20a%20dark%20blue%20corrugated%20metal%20ceiling%20with%20steel%20support%20beams%20and%20hanging%20pendant%20lights%2C%20warm%20ambient%20lighting%2C%20professional%20distribution%20center%20photography%2C%20clean%20and%20organized%20storage%20facility%2C%20photorealistic%20editorial%20style%2C%20sharp%20focus%2C%20commercial%20stock%20photo%20quality&width=1600&height=900&seq=b2b-hero-v5&orientation=landscape';
const APPLY_IMG = 'https://readdy.ai/api/search-image?query=Close-up%20professional%20photograph%20of%20a%20businessman%20in%20a%20dark%20navy%20suit%20with%20a%20blue%20tie%20holding%20a%20black%20pen%20over%20official%20documents%20and%20paperwork%20inside%20a%20black%20leather%20portfolio%20binder%20on%20a%20bright%20clean%20white%20office%20desk%2C%20shallow%20depth%20of%20field%20with%20hands%20in%20sharp%20focus%20and%20torso%20softly%20blurred%2C%20corporate%20signing%20scene%2C%20warm%20natural%20window%20light%2C%20clean%20minimal%20background%2C%20photorealistic%20commercial%20photography%2C%20editorial%20business%20portrait%20style&width=900&height=675&seq=b2b-apply-v5&orientation=landscape';

export default function B2BPage() {
  const applyRef = useRef<HTMLDivElement>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [animatedStats, setAnimatedStats] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const [heroImgLoaded, setHeroImgLoaded] = useState(false);
  const [applyImgLoaded, setApplyImgLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedStats(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      lastScrollY = window.scrollY;
      setShowStickyCta(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visibleSections.has(id);

  useSEO({
    title: 'B2B Търговия на едро с Корейска Храна | K-FOOD Wholesale Partner',
    description: 'Станете партньор на K-FOOD за търговия на едро с корейски храни в България. Ексклузивни цени, професионална поддръжка, бърза доставка за ресторанти, магазини и дистрибутори.',
    keywords: 'B2B корейска храна, търговия на едро, дистрибутор корейски продукти, wholesale korean food, доставчик корейска храна, партньорска програма',
    canonical: '/b2b',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'B2B Партньорство', url: '/b2b' },
        ]),
        {
          '@type': 'Organization',
          name: 'K-FOOD B2B Дистрибуция',
          url: `${siteUrl}/b2b`,
          description: 'Професионален партньор за търговия на едро с корейски храни.',
          areaServed: { '@type': 'Country', name: 'Bulgaria' },
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+359899897566',
            contactType: 'Wholesale',
            areaServed: 'BG',
            availableLanguage: ['Bulgarian', 'English']
          }
        }
      ]
    }
  });

  const scrollToApply = () => {
    applyRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const stats = [
    { value: '426+', label: 'Продукта в каталог' },
    { value: '50+', label: 'B2B партньори' },
    { value: '99.7%', label: 'Изпълнение на поръчки' },
    { value: '24ч', label: 'Време за одобрение' },
  ];

  const benefits = [
    { icon: 'ri-price-tag-3-line', title: 'Персонализирани оферти', desc: 'Получавате индивидуална оферта за всяка поръчка. Цените се определят според обема и честотата на вашите поръчки.' },
    { icon: 'ri-truck-line', title: 'Бърза доставка', desc: 'Директни доставки от европейски склад до вашия обект. Експресна логистика с проследяване.' },
    { icon: 'ri-user-star-line', title: 'Личен мениджър', desc: 'Специализиран акаунт мениджър, който познава вашия бизнес и ви помага с поръчки и логистика.' },
    { icon: 'ri-sparkling-line', title: 'Ексклузивни продукти', desc: 'Достъп до продукти, които не са налични в стандартния магазин — ограничени серии и специализирани стоки.' },
    { icon: 'ri-stock-line', title: 'Приоритетен склад', desc: 'Резервирайте наличност преди други клиенти. Приоритетно изпълнение на поръчки за B2B партньори.' },
    { icon: 'ri-customer-service-2-line', title: '24/7 Поддръжка', desc: 'Професионален екип на разположение за консултации, продуктови въпроси и техническа помощ.' },
  ];

  const audience = [
    { icon: 'ri-restaurant-line', label: 'Ресторанти' },
    { icon: 'ri-store-2-line', label: 'Азиатски магазини' },
    { icon: 'ri-shopping-bag-3-line', label: 'Супермаркети' },
    { icon: 'ri-truck-line', label: 'Дистрибутори' },
    { icon: 'ri-building-4-line', label: 'Хотели' },
    { icon: 'ri-cup-line', label: 'Кафенета' },
    { icon: 'ri-global-line', label: 'Онлайн магазини' },
    { icon: 'ri-archive-line', label: 'Търговци на едро' },
    { icon: 'ri-store-line', label: 'Търговски вериги' },
    { icon: 'ri-ship-line', label: 'Вносители' },
  ];

  const testimonials = [
    { quote: 'K-FOOD ни помогнаха да разширим асортимента си с над 100 нови корейски продукта. Логистиката е безупречна.', author: 'Мария Петрова', role: 'Управител, Asian Market София', rating: 5 },
    { quote: 'Като ресторант, ни трябват надеждни доставки. С K-FOOD винаги получаваме точните количества навреме.', author: 'Георги Димитров', role: 'Шеф, Korean BBQ Пловдив', rating: 5 },
    { quote: 'Персоналните цени и гъвкавите условия ни позволяват да поддържаме конкурентни маржове. Препоръчвам!', author: 'Иван Стоянов', role: 'Собственик, Дистрибутор Варна', rating: 5 },
  ];

  const faqs = [
    { q: 'Колко време отнема одобрението на B2B акаунт?', a: 'Обикновено до 24 часа. Нашият екип преглежда всяка апликация внимателно и се свързва с вас при нужда от допълнителна информация.' },
    { q: 'Има ли минимално количество за поръчка?', a: 'Да, минималната поръчка е 1 кашон на продукт. Всеки продукт се предлага в кашони с определен брой бройки (например 12, 24 или 48 бр. в кашон). Свържете се с вашия акаунт мениджър за персонализирани условия при по-големи обеми.' },
    { q: 'Какви методи на плащане предлагате?', a: 'Банков превод, наложен платеж, онлайн карта. За одобрени партньори предлагаме и отложено плащане (Net 7, Net 15, Net 30).' },
    { q: 'Мога ли да получа мостри преди голяма поръчка?', a: 'Да, предлагаме мострени пратки за нови партньори. Свържете се с вашия мениджър за детайли.' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ==================== HERO ==================== */}
      <section className="relative min-h-[600px] md:min-h-[700px] lg:min-h-[750px] overflow-hidden">
        {/* Background image with fallback */}
        <div className="absolute inset-0 bg-gray-900">
          <img
            src={HERO_BG}
            alt="Склад на K-FOOD с корейски продукти на едро — професионална логистика и дистрибуция"
            className={`w-full h-full object-cover object-center transition-opacity duration-700 ${heroImgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setHeroImgLoaded(true)}
            loading="eager"
          />
          {/* Overlay gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center min-h-[600px] md:min-h-[700px] lg:min-h-[750px]">
          <div className="w-full max-w-2xl pt-20 pb-16 md:pt-24 md:pb-20">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-red-600/25 backdrop-blur-sm border border-red-500/30 text-red-300 text-[10px] md:text-[11px] font-bold px-3.5 py-1.5 rounded-full mb-5 md:mb-6 uppercase tracking-[0.15em]">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
              Безплатна регистрация • Без договор
            </div>

            {/* Headline */}
            <h1 className="text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] mb-5 md:mb-6 tracking-tight">
              Корейска храна{' '}
              <span className="text-red-500">на едро</span>
              <br />
              <span className="text-white/90">за вашия бизнес</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed mb-6 md:mb-8 max-w-lg">
              426+ продукта на склад с цени на едро за ресторанти, магазини и дистрибутори. Минимална поръчка: 1 кашон. Одобрение до 24 часа, без дългосрочен договор.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/8 rounded-full px-3 py-1.5">
                <i className="ri-shield-check-line text-red-400"></i>
                <span>SSL защитено</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/8 rounded-full px-3 py-1.5">
                <i className="ri-file-shield-line text-red-400"></i>
                <span>GDPR</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/8 rounded-full px-3 py-1.5">
                <i className="ri-star-fill text-amber-400"></i>
                <span>4.9 / 5 от партньори</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={scrollToApply}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 sm:px-10 py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] min-h-[48px]"
              >
                <i className="ri-file-text-line text-lg"></i>
                Кандидатствайте за B2B Акаунт
              </button>
              <a
                href="tel:+359899897566"
                className="bg-white/10 hover:bg-white/15 active:bg-white/20 text-white border border-white/20 px-8 sm:px-10 py-4 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center gap-2.5 cursor-pointer min-h-[48px]"
              >
                <i className="ri-phone-line text-lg"></i>
                0899 897 566
              </a>
            </div>

            {/* Discreet partner login */}
            <div className="mt-4">
              <Link
                to="/b2b/login"
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white text-[13px] font-medium transition-colors cursor-pointer group"
              >
                <i className="ri-lock-2-line text-sm"></i>
                Вече сте партньор? Вход в портала
                <i className="ri-arrow-right-line text-sm group-hover:translate-x-0.5 transition-transform"></i>
              </Link>
            </div>

            {/* Mini stats row */}
            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <i className="ri-time-line text-red-400 text-xs"></i>
                Одобрение до 24ч
              </span>
              <span className="flex items-center gap-1.5">
                <i className="ri-close-circle-line text-red-400 text-xs"></i>
                Без такса регистрация
              </span>
              <span className="flex items-center gap-1.5">
                <i className="ri-global-line text-red-400 text-xs"></i>
                Доставка в цяла България
              </span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:block">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1 h-2.5 bg-red-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </section>

      {/* ==================== TRUST BAR ==================== */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-5 md:py-6">
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <i className="ri-checkbox-circle-fill text-emerald-500 text-base"></i>
              <span>Без договор</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <i className="ri-checkbox-circle-fill text-emerald-500 text-base"></i>
              <span>Без такса регистрация</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <i className="ri-checkbox-circle-fill text-emerald-500 text-base"></i>
              <span>Минимална поръчка: 1 кашон</span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500">
              <i className="ri-checkbox-circle-fill text-emerald-500 text-base"></i>
              <span>24ч одобрение</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== STATS STRIP ==================== */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`relative py-7 md:py-10 text-center transition-all duration-600 ${animatedStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {i < stats.length - 1 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-gray-100 hidden lg:block" />
                )}
                <div className="text-[1.65rem] md:text-3xl font-black text-gray-900 mb-1 tracking-tight">{stat.value}</div>
                <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS ==================== */}
      <section
        id="benefits"
        data-animate
        className={`py-14 md:py-20 lg:py-24 bg-gray-50/70 transition-all duration-700 ${isVisible('benefits') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[10px] md:text-[11px] font-bold text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3.5 py-1.5 rounded-full">
              Защо K-FOOD B2B
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-3 leading-tight">
              Всичко за вашия бизнес
            </h2>
            <p className="text-gray-600 text-sm md:text-base max-w-xl mx-auto">
              Професионална верига за доставки, изградена около вашите нужди
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {benefits.map((item, i) => (
              <div
                key={i}
                className="group bg-white border border-gray-200/70 hover:border-red-200 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-0.5 cursor-default"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 bg-red-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-600 transition-colors duration-300 flex-shrink-0">
                  <i className={`${item.icon} text-red-600 text-base md:text-lg group-hover:text-white transition-colors duration-300`}></i>
                </div>
                <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1.5 md:mb-2">{item.title}</h3>
                <p className="text-gray-600 text-[13px] md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== APPLY SECTION ==================== */}
      <section
        ref={applyRef}
        id="apply"
        data-animate
        className={`py-14 md:py-20 lg:py-24 bg-white transition-all duration-700 ${isVisible('apply') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-10 lg:gap-14">

            {/* Image — top on mobile, left on desktop */}
            <div className="w-full lg:w-5/12 flex-shrink-0">
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={APPLY_IMG}
                  alt="Професионално бизнес партньорство — среща и подписване на документи"
                  className={`w-full h-auto transition-opacity duration-500 ${applyImgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  style={{ aspectRatio: '4/3' }}
                  loading="lazy"
                  onLoad={() => setApplyImgLoaded(true)}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-5">
                  <p className="text-white text-xs md:text-sm font-medium">Прозрачни условия и професионална комуникация</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="w-full lg:w-7/12">
              <span className="text-[10px] md:text-[11px] font-bold text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3 py-1 rounded-full">
                Как да започнете
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mt-3 md:mt-4 mb-3 md:mb-4 leading-tight">
                Лесно стартиране на партньорство
              </h2>
              <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-6 md:mb-8">
                Всяко B2B партньорство започва с ясни условия и професионална комуникация.
                Подписваме споразумения, предлагаме гъвкави методи на плащане и отделен акаунт мениджър за всеки партньор.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                {[
                  { icon: 'ri-shield-check-line', text: 'Прозрачни договорни условия' },
                  { icon: 'ri-bank-line', text: 'Банков превод и наложен платеж' },
                  { icon: 'ri-user-follow-line', text: 'Личен акаунт мениджър' },
                  { icon: 'ri-file-list-3-line', text: 'Търговска документация' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <i className={`${item.icon} text-red-500 text-lg`}></i>
                    </div>
                    <span className="text-[13px] md:text-sm font-medium text-gray-800">{item.text}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/b2b/apply"
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <i className="ri-file-text-line text-lg"></i>
                Започнете апликацията
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section
        id="process"
        data-animate
        className={`py-14 md:py-20 lg:py-24 bg-gray-50/70 transition-all duration-700 ${isVisible('process') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[10px] md:text-[11px] font-bold text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3.5 py-1.5 rounded-full">
              Процес
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-3 leading-tight">
              4 стъпки до вашия B2B акаунт
            </h2>
            <p className="text-gray-600 text-sm md:text-base">Бързо, лесно и без ангажимент</p>
          </div>

          <div className="relative">
            {/* Connecting line — desktop only */}
            <div className="hidden lg:block absolute top-[44px] left-[12.5%] right-[12.5%] h-[2px] bg-gray-200">
              <div className="h-full w-full bg-gradient-to-r from-red-500/0 via-red-500/20 to-red-500/0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {[
                { step: '01', icon: 'ri-file-list-3-line', title: 'Кандидатствайте', desc: 'Попълнете кратката апликационна форма с информация за вашата компания.' },
                { step: '02', icon: 'ri-shield-check-line', title: 'Верификация', desc: 'Нашият екип преглежда и верифицира вашата компания до 24 часа.' },
                { step: '03', icon: 'ri-key-2-line', title: 'Активиране', desc: 'Получавате достъп до B2B портала с цени на едро и пълния каталог.' },
                { step: '04', icon: 'ri-shopping-cart-2-line', title: 'Поръчване', desc: 'Поръчвайте по кашони с ексклузивни цени. Минимална поръчка: 1 кашон на продукт.' },
              ].map((item, i) => (
                <div key={i} className="relative text-center group">
                  {/* Step circle */}
                  <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 border-2 border-red-100 group-hover:border-red-300 transition-colors duration-300">
                    <i className={`${item.icon} text-red-600 text-lg md:text-xl`}></i>
                  </div>

                  {/* Card */}
                  <div className="bg-white rounded-2xl p-5 md:p-6 h-full border border-gray-100 group-hover:shadow-sm transition-shadow duration-300">
                    <div className="text-[2rem] md:text-[2.5rem] font-black text-gray-100 leading-none mb-2">{item.step}</div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900 mb-1.5 md:mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-[13px] md:text-sm leading-relaxed">{item.desc}</p>
                  </div>

                  {/* Mobile connector arrow */}
                  {i < 3 && (
                    <div className="lg:hidden flex justify-center my-2">
                      <i className="ri-arrow-down-line text-gray-300 text-lg"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== WHO IS THIS FOR ==================== */}
      <section
        id="audience"
        data-animate
        className={`py-14 md:py-20 lg:py-24 bg-white transition-all duration-700 ${isVisible('audience') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[10px] md:text-[11px] font-bold text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3.5 py-1.5 rounded-full">
              За кого е
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-2 leading-tight">
              B2B Платформата обслужва
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
            {audience.map((item, i) => (
              <div
                key={i}
                className="bg-gray-50/80 hover:bg-gray-50 rounded-xl p-4 md:p-5 text-center border border-gray-100 hover:border-red-200 hover:-translate-y-0.5 transition-all duration-300 group cursor-default"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 border border-gray-100 group-hover:border-red-200 transition-colors">
                  <i className={`${item.icon} text-red-500 text-base md:text-lg`}></i>
                </div>
                <span className="text-[12px] md:text-sm font-semibold text-gray-800">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section
        id="testimonials"
        data-animate
        className={`py-14 md:py-20 lg:py-24 bg-gray-50/70 transition-all duration-700 ${isVisible('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[10px] md:text-[11px] font-bold text-red-600 uppercase tracking-[0.15em] bg-red-50 px-3.5 py-1.5 rounded-full">
              Доверие
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mt-4 mb-3 leading-tight">
              Какво казват нашите партньори
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100">
                {/* Stars */}
                <div className="flex gap-0.5 mb-3 md:mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <i key={j} className="ri-star-fill text-amber-400 text-[13px] md:text-sm"></i>
                  ))}
                </div>

                {/* Quote */}
                <div className="relative mb-4 md:mb-5">
                  <i className="ri-double-quotes-l text-red-100 text-3xl md:text-4xl absolute -top-1.5 -left-0.5"></i>
                  <p className="text-gray-700 text-[13px] md:text-sm leading-relaxed relative z-10 pl-1">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-700 font-bold text-sm">{t.author.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-[13px] md:text-sm">{t.author}</div>
                    <div className="text-[11px] md:text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA ==================== */}
      <section className="relative py-16 md:py-24 lg:py-28 overflow-hidden bg-[#0a0a0a]">
        {/* Subtle pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 bg-red-600/20 backdrop-blur-sm text-red-400 text-[10px] md:text-[11px] font-bold px-3.5 py-1.5 rounded-full mb-5 md:mb-6 uppercase tracking-[0.15em] border border-red-500/20">
            <i className="ri-flashlight-line"></i>
            Ограничена оферта
          </span>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 md:mb-5 leading-tight">
            Станете партньор{' '}
            <span className="text-red-500">днес</span>
          </h2>

          <p className="text-gray-400 text-sm md:text-base mb-3 max-w-xl mx-auto leading-relaxed">
            Попълнете апликационната форма и нашият екип ще се свърже с вас до 24 часа.
          </p>

          <p className="text-red-400 text-[13px] md:text-sm font-semibold mb-8 md:mb-10">
            <i className="ri-gift-line mr-1.5"></i>
            Първите 20 нови партньори получават 5% отстъпка от първата поръчка
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/b2b/apply"
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap inline-flex items-center justify-center gap-2.5 cursor-pointer min-h-[48px]"
            >
              <i className="ri-file-text-line text-lg"></i>
              Кандидатствайте сега
            </Link>
            <a
              href="tel:+359899897566"
              className="bg-white/8 hover:bg-white/12 active:bg-white/15 text-white border border-white/20 px-8 sm:px-10 py-4 sm:py-5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 whitespace-nowrap inline-flex items-center justify-center gap-2.5 cursor-pointer min-h-[48px]"
            >
              <i className="ri-phone-line text-lg"></i>
              0899 897 566
            </a>
          </div>

          <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-[10px] md:text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <i className="ri-shield-check-line text-gray-400"></i>
              SSL защитена връзка
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="ri-file-shield-line text-gray-400"></i>
              GDPR съобразено
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="ri-customer-service-line text-gray-400"></i>
              Персонална поддръжка
            </span>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="py-14 md:py-20 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
              Често задавани въпроси
            </h2>
          </div>
          <div className="space-y-2.5 md:space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-gray-50/80 rounded-xl border border-gray-100">
                <summary className="flex items-center justify-between p-4 md:p-5 cursor-pointer font-semibold text-gray-900 text-[13px] md:text-sm list-none">
                  {faq.q}
                  <div className="ml-4 flex-shrink-0">
                    <i className="ri-add-line text-gray-400 group-open:hidden"></i>
                    <i className="ri-subtract-line text-red-500 hidden group-open:block"></i>
                  </div>
                </summary>
                <div className="px-4 md:px-5 pb-4 md:pb-5 text-[13px] md:text-sm text-gray-600 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* ==================== STICKY MOBILE/BOTTOM CTA ==================== */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ${showStickyCta ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="hidden sm:flex sm:flex-col">
            <span className="text-[13px] font-semibold text-gray-900">Готови ли сте да започнете?</span>
            <span className="text-[11px] text-gray-500">Одобрение до 24 часа</span>
          </div>
          <span className="sm:hidden text-[11px] font-medium text-gray-600">
            <i className="ri-time-line text-red-500 mr-1"></i>
            Одобрение до 24ч
          </span>
          <Link
            to="/b2b/apply"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold text-[13px] sm:text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <i className="ri-file-text-line"></i>
            Кандидатствайте
          </Link>
        </div>
      </div>
    </div>
  );
}