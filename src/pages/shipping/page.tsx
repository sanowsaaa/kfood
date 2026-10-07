import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';

export default function ShippingPage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'Доставка на Корейска Храна - K-FOOD Велико Търново',
    description: 'Информация за доставка на корейски продукти в България. Доставка с Econt и Speedy 1-3 работни дни. За Велико Търново - само чрез Takeaway платформа. Минимална поръчка 10 €.',
    keywords: 'доставка корейска храна, Econt, Speedy, Takeaway, Велико Търново, доставка България',
    canonical: '/shipping',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Доставка', url: '/shipping' },
        ]),
        {
          '@type': 'WebPage',
          '@id': `${siteUrl}/shipping`,
          url: `${siteUrl}/shipping`,
          name: 'Доставка на Корейска Храна - K-FOOD Велико Търново',
          description: 'Условия и информация за доставка на корейски продукти в цяла България.',
          inLanguage: 'bg',
          isPartOf: { '@id': `${siteUrl}/#website` },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Начало', item: siteUrl },
              { '@type': 'ListItem', position: 2, name: 'Доставка', item: `${siteUrl}/shipping` },
            ],
          },
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white">
          <div className="mb-12">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
              <Link to="/" className="hover:text-emerald-600 cursor-pointer">Начало</Link>
              <i className="ri-arrow-right-s-line"></i>
              <span className="text-gray-900 font-medium">Доставка</span>
            </nav>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Информация за Доставка</h1>
            <p className="text-xl text-gray-600">
              Всичко, което трябва да знаете за доставката на вашите корейски продукти
            </p>
          </div>

          <div className="space-y-12">
            {/* Минимална стойност на поръчката */}
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <i className="ri-shopping-cart-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Минимална Стойност на Поръчката</h2>
                  <p className="text-lg text-gray-700 mb-2">
                    За да направите поръчка в нашия онлайн магазин, минималната стойност трябва да бъде <strong className="text-emerald-600">10.00 €</strong>
                  </p>
                </div>
              </div>
            </section>

            {/* Информация за доставка */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-truck-line text-emerald-600 mr-3"></i>
                Условия за Доставка
              </h2>
              
              <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
                <div className="flex items-center mb-4">
                  <i className="ri-information-line text-3xl text-white mr-4"></i>
                  <div>
                    <h3 className="text-xl font-bold">Важна информация</h3>
                  </div>
                </div>
                <p className="text-lg text-white mb-2">
                  <strong>Доставката се определя от куриерската фирма и се заплаща при получаване на пратката.</strong>
                </p>
                <p className="text-emerald-100">
                  Цената на доставката не е включена в онлайн плащането. Клиентът заплаща доставката директно на куриера при получаване на пакета.
                </p>
              </div>
            </section>

            {/* Куриерски услуги */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-truck-fill text-emerald-600 mr-3"></i>
                Куриерски Услуги
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Национални Доставки</h3>
                  <p className="text-gray-600">За всички градове в България (освен Велико Търново)</p>
                </div>
                
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <i className="ri-truck-line text-2xl text-blue-600"></i>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Econt</h4>
                        <p className="text-gray-600">Професионални куриерски услуги</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                        <i className="ri-rocket-line text-2xl text-orange-600"></i>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Speedy</h4>
                        <p className="text-gray-600">Бърза и надежда доставка</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                    <p className="text-emerald-800">
                      <i className="ri-information-line mr-2"></i>
                      Време за доставка: 1-3 работни дни в зависимост от локацията
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Специални условия за Велико Търново */}
            <section>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <i className="ri-map-pin-fill text-white text-2xl"></i>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Локална Доставка - Велико Търново</h2>
                    <div className="space-y-4">
                      <p className="text-lg text-gray-800">
                        За град <strong>Велико Търново</strong> поръчките се обработват и доставят <strong>САМО</strong> чрез платформата <strong>Takeaway</strong>.
                      </p>
                      <div className="bg-white p-4 rounded-lg border border-amber-300">
                        <h4 className="font-bold text-gray-900 mb-2">Как да поръчате в Велико Търново:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-gray-700">
                          <li>Посетете платформата Takeaway</li>
                          <li>Намерете K-FOOD в списъка с ресторанти</li>
                          <li>Направете вашата поръчка директно там</li>
                        </ol>
                      </div>
                      <p className="text-amber-800 font-medium">
                        <i className="ri-alert-line mr-2"></i>
                        Онлайн поръчки през този сайт НЕ се доставят в Велико Търново
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Контакти */}
            <section className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-customer-service-2-line text-emerald-600 mr-3"></i>
                Въпроси за Доставка?
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Свържете се с нас</h4>
                  <div className="space-y-3">
                    <a href="tel:+359899897566" className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer">
                      <i className="ri-phone-line mr-3"></i>
                      0899 897 566
                    </a>
                    <a href="mailto:kfoodtarnovo@gmail.com" className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer">
                      <i className="ri-mail-line mr-3"></i>
                      kfoodtarnovo@gmail.com
                    </a>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Работно време</h4>
                  <p className="text-gray-600">
                    <i className="ri-time-line mr-2"></i>
                    Понеделник - Събота: 9:00 - 19:00
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
