import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSEO, getLocalBusinessSchema, getBreadcrumbSchema } from '../../utils/seo';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';

export default function AboutPage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'За K-FOOD | Корейска Храна България — Вносител, Доставчик и B2B Партньор',
    description: 'K-FOOD е водещ специализиран магазин и B2B доставчик на корейска храна в България. Работим с ресторанти, магазини и HoReCa. Официален партньор на Sunrise Food — HACCP сертифицирана ферма за прясна гъба кладница и шийтаке.',
    keywords: 'K-FOOD за нас, корейска храна България вносител, корейски продукти доставчик, B2B корейска храна България, корейски ресторант доставчик, корейски супермаркет партньор, азиатски храни дистрибуция, Sunrise Food гъби',
    canonical: '/about',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getLocalBusinessSchema(),
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'За Нас', url: '/about' },
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'За Нас — K-FOOD Велико Търново | Корейска Храна Вносител и B2B Доставчик',
          url: `${siteUrl}/about`,
          description: 'K-FOOD е водещ специализиран магазин и B2B доставчик на корейска храна в България.',
          mainEntity: {
            '@type': 'Organization',
            name: 'K-FOOD Велико Търново',
            url: siteUrl,
            foundingDate: '2020',
            description: 'Специализиран онлайн магазин и B2B доставчик на корейска храна, кухня и култура в България.',
            areaServed: { '@type': 'Country', name: 'Bulgaria' },
            knowsAbout: ['Корейска храна', 'Азиатски храни', 'HoReCa доставки', 'Хранителна дистрибуция'],
          },
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section - mobile optimized */}
      <section className="relative bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold text-gray-900 mb-3 sm:mb-6">
              Добре дошли в <span className="text-emerald-600">K-FOOD</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Вашата врата към автентичния вкус на Корея във Велико Търново и цяла България
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-10 sm:py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                Нашата История
              </h2>
              <div className="space-y-3 sm:space-y-6 text-gray-600 text-sm sm:text-lg leading-relaxed">
                <p>
                  K-FOOD започна като мечта да донесем автентичния вкус на Корея в сърцето на България.
                  Вдъхновени от богатата кулинарна традиция на Южна Корея, ние започнахме нашето пътешествие
                  с мисията да споделим тези уникални вкусове с българските семейства.
                </p>
                <p>
                  Днес K-FOOD е водещ специализиран магазин и <strong>B2B доставчик на корейска храна</strong> в България —
                  с над 200 продукта от топ брандове като <strong>Samyang, Nongshim и Paldo</strong>.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl sm:rounded-3xl overflow-hidden">
                <img
                  src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/83bccb5388151eb8a2747566801eee39.jpeg"
                  alt="Корейски традиционен пазар"
                  className="w-full h-full object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Partner Section */}
      <section className="py-10 sm:py-14 md:py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <span className="inline-block bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4 uppercase tracking-wide">
                B2B Партньорство
              </span>
              <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-4 sm:mb-6">
                Станете наш търговски партньор
              </h2>
              <p className="text-gray-300 text-sm sm:text-lg leading-relaxed mb-4 sm:mb-6">
                Разширете асортимента си с автентични корейски продукти. Работим с <strong>ресторанти, магазини,
                онлайн магазини, търговски вериги и HoReCa</strong> в цяла България.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {[
                  { icon: 'ri-truck-line', title: 'Доставки до 3–5 дни', desc: 'Европейска верига на доставчици' },
                  { icon: 'ri-price-tag-3-line', title: 'Цени на едро', desc: 'По запитване' },
                  { icon: 'ri-store-3-line', title: 'Складова наличност', desc: 'Постоянна наличност в България' },
                  { icon: 'ri-bill-line', title: '7/14 дни кредит', desc: 'При редовни B2B клиенти' },
                ].map(item => (
                  <div key={item.title} className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
                      <i className={`${item.icon} text-emerald-300 text-lg sm:text-xl`}></i>
                    </div>
                    <h4 className="font-bold text-white text-xs sm:text-sm mb-0.5 sm:mb-1">{item.title}</h4>
                    <p className="text-[10px] sm:text-xs text-gray-400">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Link to="/b2b" className="flex items-center gap-2 bg-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer text-xs sm:text-sm touch-target">
                  <i className="ri-briefcase-line text-base sm:text-lg"></i>
                  B2B каталог
                </Link>
                <a href="tel:+359899897566" className="flex items-center gap-2 bg-white/10 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold border border-white/20 hover:bg-white/20 transition-colors whitespace-nowrap cursor-pointer text-xs sm:text-sm touch-target">
                  <i className="ri-phone-line text-base sm:text-lg"></i>
                  Обади се
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden h-56 sm:h-80 lg:h-96">
                <img
                  src="https://readdy.ai/api/search-image?query=Professional%20Asian%20grocery%20store%20interior%20with%20colorful%20shelves%20stocked%20with%20Korean%20ramen%20noodles%2C%20kimchi%20jars%2C%20sauces%20and%20snacks%20in%20vibrant%20packaging%2C%20modern%20retail%20environment%2C%20warm%20lighting%2C%20clean%20organized%20displays%2C%20wide%20angle%20shot%2C%20professional%20food%20photography%2C%20high%20quality&width=800&height=600&seq=about-b2b-store-001&orientation=landscape"
                  alt="Корейски продукти на рафтовете"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="absolute -bottom-3 -left-3 sm:-bottom-4 sm:-left-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl">
                <div className="text-xl sm:text-2xl font-bold">200+</div>
                <div className="text-xs sm:text-sm text-emerald-100">Корейски продукта</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-10 sm:py-14 md:py-20 bg-gradient-to-br from-gray-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Нашата Мисия и Визия</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">Ние вярваме, че храната е мост между културите</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
            {[
              { icon: 'ri-heart-3-fill', color: 'emerald', title: 'Нашата Мисия', text: 'Да донесем най-доброто от корейската кулинарна традиция до българските домове и бизнеси, като запазим автентичността и качеството на всеки продукт.' },
              { icon: 'ri-eye-fill', color: 'teal', title: 'Нашата Визия', text: 'Да бъдем утвърденият специализиран магазин и вносител на корейска храна в България, като изградим доверителни отношения с нашите клиенти и партньори.' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-${item.color}-100 rounded-full flex items-center justify-center mb-4 sm:mb-6`}>
                  <i className={`${item.icon} text-${item.color}-600 text-xl sm:text-2xl`}></i>
                </div>
                <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">{item.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-10 sm:py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Нашите Ценности</h2>
            <p className="text-base sm:text-xl text-gray-600">Принципите, които ни ръководят всеки ден</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: 'ri-shield-check-fill', color: 'emerald', title: 'Качество', text: 'Всеки продукт е внимателно подбран и тестован, за да гарантираме най-високото качество.' },
              { icon: 'ri-star-fill', color: 'teal', title: 'Автентичност', text: 'Предлагаме само автентични корейски продукти от утвърдени брандове.' },
              { icon: 'ri-customer-service-2-fill', color: 'cyan', title: 'Обслужване', text: 'Нашите клиенти и партньори са в центъра на всичко, което правим.' },
            ].map(item => (
              <div key={item.title} className="text-center group">
                <div className={`w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-${item.color}-100 to-${item.color}-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`${item.icon} text-${item.color}-600 text-xl sm:text-3xl`}></i>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-2 sm:mb-4">{item.title}</h3>
                <p className="text-gray-600 text-xs sm:text-base leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-10 sm:py-14 md:py-20 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Нашият Екип</h2>
            <p className="text-base sm:text-xl text-gray-600">Хората зад K-FOOD, които правят магията възможна</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[
              { icon: 'ri-user-3-fill', color: 'emerald', name: 'Атанас Атанасов', role: 'Управител', text: 'Атанас е визионерът зад K-FOOD — специализирания онлайн магазин и B2B доставчик на корейска храна в България.' },
              { icon: 'ri-user-2-fill', color: 'teal', name: 'Росица Атанасова', role: 'Касиер', text: 'Росица отговаря за финансовото обслужване и плащанията в нашия корейски магазин онлайн.' },
              { icon: 'ri-truck-fill', color: 'cyan', name: 'Мирослав Атанасов', role: 'Логистика', text: 'Мирослав управлява цялата логистика и доставките на нашия магазин за корейска храна.' },
            ].map(person => (
              <div key={person.name} className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                <div className={`w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-${person.color}-100 to-${person.color}-200 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-6`}>
                  <i className={`${person.icon} text-${person.color}-600 text-2xl sm:text-3xl`}></i>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">{person.name}</h3>
                <p className={`text-${person.color}-600 font-semibold mb-2 sm:mb-4 text-xs sm:text-sm`}>{person.role}</p>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{person.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-10 sm:py-14 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Защо да изберете K-FOOD?</h2>
            <p className="text-base sm:text-xl text-gray-600">Какво ни прави специални в света на корейската храна</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[
              { icon: 'ri-truck-fill', color: 'cyan', title: 'Бърза доставка', text: 'Доставяме в цялата страна с Econt и Speedy.' },
              { icon: 'ri-price-tag-3-fill', color: 'teal', title: 'Конкурентни цени', text: 'Най-добрите цени на пазара благодарение на внимателния ни подбор.' },
              { icon: 'ri-award-fill', color: 'emerald', title: 'Гарантирано качество', text: 'Всички продукти са сертифицирани и отговарят на европейските стандарти.' },
              { icon: 'ri-customer-service-fill', color: 'purple', title: '24/7 Поддръжка', text: 'Нашият екип е винаги на разположение за въпроси и консултации.' },
            ].map(item => (
              <div key={item.title} className="text-center">
                <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-${item.color}-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4`}>
                  <i className={`${item.icon} text-${item.color}-600 text-lg sm:text-2xl`}></i>
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sunrise Food Partnership */}
      <section className="py-10 sm:py-14 md:py-20 bg-white" id="partnerships">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-12">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-2 sm:mb-3 uppercase tracking-wide">
              Официално Партньорство
            </span>
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">Нашите Партньори</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">Работим с проверени български производители</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 border border-emerald-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 items-center">
              <div>
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                    <i className="ri-plant-fill text-white text-xl sm:text-3xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-2xl font-bold text-gray-900">Sunrise Food</h3>
                    <p className="text-emerald-600 font-semibold text-xs sm:text-sm">HACCP Сертифицирана Ферма</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm sm:text-lg leading-relaxed mb-4 sm:mb-6">
                  K-FOOD си сътрудничи пряко с <a href="https://sunrisefood.eu/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:text-emerald-700 underline">Sunrise Food</a> за доставка на прясна гъба кладница и шийтаке.
                </p>

                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-8">
                  {[
                    { icon: 'ri-award-fill', title: 'HACCP Сертифицирано', desc: 'Производство по най-високи стандарти' },
                    { icon: 'ri-leaf-fill', title: 'Без Химикали', desc: 'Отглеждане без пестициди' },
                    { icon: 'ri-time-fill', title: 'Доставка 24 часа', desc: 'От фермата до вас за максимална свежест' },
                    { icon: 'ri-snowflake-fill', title: 'Хладилна Верига', desc: 'Постоянна температура 0–4°C' },
                  ].map(item => (
                    <div key={item.title} className="bg-white rounded-xl p-2.5 sm:p-4 border border-emerald-100">
                      <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-1.5 sm:mb-3">
                        <i className={`${item.icon} text-emerald-600 text-sm sm:text-xl`}></i>
                      </div>
                      <h4 className="font-bold text-gray-900 text-[10px] sm:text-sm mb-0.5 sm:mb-1">{item.title}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-600">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <a href="tel:+359899897566" className="flex items-center gap-2 bg-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer text-xs sm:text-sm touch-target">
                    <i className="ri-phone-fill text-sm sm:text-base"></i>Обади се
                  </a>
                  <a href="https://sunrisefood.eu/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white text-emerald-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold border-2 border-emerald-600 hover:bg-emerald-50 transition-colors whitespace-nowrap cursor-pointer text-xs sm:text-sm touch-target">
                    <i className="ri-external-link-line text-sm sm:text-base"></i>Виж Sunrise Food
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-xl sm:rounded-2xl overflow-hidden h-48 sm:h-80 lg:h-96">
                  <img src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/c9006c7c1a57b2e203512e7966da42f2.png" alt="Прясна гъба кладница и шийтаке" className="w-full h-full object-cover object-center" />
                </div>
                <div className="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 bg-emerald-600 text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-xl">
                  <div className="text-lg sm:text-2xl font-bold">100%</div>
                  <div className="text-[10px] sm:text-sm text-emerald-100">Прясно от фермата</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-14 md:py-20 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold mb-3 sm:mb-6">Готови да опитате автентичната корейска храна?</h2>
          <p className="text-sm sm:text-xl mb-4 sm:mb-8 opacity-90">Разгледайте нашата богата колекция от над 200 корейски продукта</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
            <Link to="/products" className="bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center text-sm sm:text-base touch-target">
              <i className="ri-shopping-bag-fill mr-2"></i>Разгледайте продуктите
            </Link>
            <Link to="/b2b" className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold hover:bg-white hover:text-emerald-600 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center text-sm sm:text-base touch-target">
              <i className="ri-briefcase-line mr-2"></i>B2B — Стани партньор
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}