import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';

export default function ReturnsPage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'Връщане и Възстановяване - K-FOOD Велико Търново',
    description: 'Политика за връщане на корейски продукти от K-FOOD. Срок 14 дни, възстановяване чрез банков превод. Разходите за връщане са за сметка на купувача.',
    keywords: 'връщане корейски продукти, възстановяване, банков превод, политика за връщане, рекламация K-FOOD',
    canonical: '/returns',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Връщане', url: '/returns' },
        ]),
        {
          '@type': 'WebPage',
          '@id': `${siteUrl}/returns`,
          url: `${siteUrl}/returns`,
          name: 'Политика за Връщане - K-FOOD Велико Търново',
          description: 'Условия и процедура за връщане на корейски продукти от K-FOOD Велико Търново.',
          inLanguage: 'bg',
          isPartOf: { '@id': `${siteUrl}/#website` },
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
              <span className="text-gray-900 font-medium">Връщане</span>
            </nav>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Политика за Връщане</h1>
            <p className="text-xl text-gray-600">
              Информация за връщане на продукти и възстановяване на средства
            </p>
          </div>

          <div className="space-y-12">
            {/* Важна информация */}
            <section className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                  <i className="ri-alert-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Важна Информация</h2>
                  <div className="space-y-3">
                    <p className="text-lg text-gray-800">
                      <strong>Разходите за връщането на продукта са изцяло за сметка на купувача.</strong>
                    </p>
                    <p className="text-gray-700">
                      Всички възстановявания се извършват <strong>само чрез банков превод</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Условия за връщане */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-file-list-3-line text-emerald-600 mr-3"></i>
                Условия за Връщане
              </h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <i className="ri-time-line text-2xl text-emerald-600 mt-1"></i>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Срок за Връщане</h3>
                      <p className="text-gray-700 mb-2">
                        Имате право да върнете продукта в срок до <strong>14 дни</strong> от получаването му.
                      </p>
                      <p className="text-gray-600 text-sm">
                        Срокът започва да тече от деня на получаване на продукта.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <i className="ri-checkbox-circle-line text-2xl text-emerald-600 mt-1"></i>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Състояние на Продукта</h3>
                      <p className="text-gray-700 mb-3">Продуктът трябва да бъде:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center text-gray-600">
                          <i className="ri-check-line text-emerald-600 mr-2"></i>
                          В оригинална опаковка
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-check-line text-emerald-600 mr-2"></i>
                          Неотворен и неповреден
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-check-line text-emerald-600 mr-2"></i>
                          С всички етикети и документи
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-check-line text-emerald-600 mr-2"></i>
                          Годен за консумация (ако се прилага)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <div className="flex items-start space-x-4">
                    <i className="ri-close-circle-line text-2xl text-red-600 mt-1"></i>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Изключения</h3>
                      <p className="text-gray-700 mb-3">Следните продукти НЕ подлежат на връщане:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center text-gray-600">
                          <i className="ri-close-line text-red-600 mr-2"></i>
                          Скоропортящи се храни
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-close-line text-red-600 mr-2"></i>
                          Продукти с изтекъл срок на годност
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-close-line text-red-600 mr-2"></i>
                          Отворени или повредени продукти
                        </li>
                        <li className="flex items-center text-gray-600">
                          <i className="ri-close-line text-red-600 mr-2"></i>
                          Персонализирани поръчки
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Процес на връщане */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-arrow-left-right-line text-emerald-600 mr-3"></i>
                Как да Върнете Продукт
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-200">
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Свържете се с нас</h4>
                      <p className="text-gray-600 mb-2">
                        Изпратете имейл на <a href="mailto:kfoodtarnovo@gmail.com" className="text-emerald-600 hover:underline">kfoodtarnovo@gmail.com</a> или се обадете на <a href="tel:+359899897566" className="text-emerald-600 hover:underline">0899 897 566</a>
                      </p>
                      <p className="text-gray-600">Включете номера на поръчката и причината за връщането</p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Получете инструкции</h4>
                      <p className="text-gray-600">
                        Ще получите подробни инструкции за връщане, включително адрес за изпращане
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Опаковайте продукта</h4>
                      <p className="text-gray-600 mb-2">
                        Опаковайте внимателно продукта в оригиналната опаковка
                      </p>
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-amber-800 text-sm">
                          <i className="ri-alert-line mr-2"></i>
                          Разходите за изпращането са за ваша сметка
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Изпратете продукта</h4>
                      <p className="text-gray-600">
                        Изпратете продукта на посочения адрес с проследяваща услуга
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Възстановяване на средства */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-bank-line text-emerald-600 mr-3"></i>
                Възстановяване на Средства
              </h2>
              
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Метод на Възстановяване</h3>
                    <div className="flex items-center mb-4">
                      <i className="ri-bank-line text-3xl text-emerald-600 mr-4"></i>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Банков Превод</h4>
                        <p className="text-gray-600">Единственият начин за възстановяване</p>
                      </div>
                    </div>
                    <p className="text-gray-700">
                      Всички възстановявания се извършват <strong>само чрез банков превод</strong> към предоставената от вас банкова сметка.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Необходими Данни</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Име на титуляря на сметката
                      </div>
                      <div className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        IBAN номер на сметката
                      </div>
                      <div className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        BIC код на банката
                      </div>
                      <div className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Номер на поръчката
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded-lg border border-emerald-200">
                  <h4 className="font-bold text-gray-900 mb-2">Срок за Възстановяване</h4>
                  <p className="text-gray-700">
                    След получаване и одобрение на върнатия продукт, възстановяването се извършва в срок до <strong>7 работни дни</strong>.
                  </p>
                </div>
              </div>
            </section>

            {/* Разходи за върщане */}
            <section>
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <i className="ri-wallet-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Разходи за Връщане</h2>
                    <div className="space-y-4">
                      <p className="text-lg text-gray-800">
                        <strong>Купувачът носи пълна отговорност за всички разходи, свързани с връщането на продукта.</strong>
                      </p>
                      <div className="bg-white p-4 rounded-lg border border-red-300">
                        <h4 className="font-bold text-gray-900 mb-2">Включват се:</h4>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-center">
                            <i className="ri-arrow-right-s-line text-red-600 mr-2"></i>
                            Куриерски разходи за изпращане
                          </li>
                          <li className="flex items-center">
                            <i className="ri-arrow-right-s-line text-red-600 mr-2"></i>
                            Застрахователни такси (ако се прилагат)
                          </li>
                          <li className="flex items-center">
                            <i className="ri-arrow-right-s-line text-red-600 mr-2"></i>
                            Опаковъчни материали
                          </li>
                        </ul>
                      </div>
                      <p className="text-red-800 font-medium">
                        <i className="ri-information-line mr-2"></i>
                        Разходите за връщане НЕ се възстановяват
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Контакти за въпроси */}
            <section className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-customer-service-2-line text-emerald-600 mr-3"></i>
                Въпроси за Връщане?
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
                  <p className="text-gray-600 mb-3">
                    <i className="ri-time-line mr-2"></i>
                    Понеделник - Събота: 9:00 - 19:00
                  </p>
                  <p className="text-gray-600">
                    Нашият екип ще ви помогне с всички въпроси относно връщането на продукти.
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