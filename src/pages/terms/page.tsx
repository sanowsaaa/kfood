import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';

export default function TermsPage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'Общи Условия - K-FOOD Велико Търново',
    description: 'Общи условия за ползване на K-FOOD онлайн магазин за корейски продукти. Правила за поръчки, доставки, плащания и отговорности.',
    keywords: 'общи условия, правила, договор, поръчки, отговорности, K-FOOD, корейски продукти',
    canonical: '/terms',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${siteUrl}/terms`,
          url: `${siteUrl}/terms`,
          name: 'Общи Условия - K-FOOD Велико Търново',
          description: 'Общи условия за ползване на K-FOOD онлайн магазин за корейски продукти.',
          inLanguage: 'bg-BG',
          isPartOf: { '@id': `${siteUrl}/#website` },
        },
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Общи Условия', url: '/terms' },
        ]),
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
              <span className="text-gray-900 font-medium">Общи Условия</span>
            </nav>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Общи Условия</h1>
            <p className="text-xl text-gray-600">
              Правила и условия за ползване на нашите услуги
            </p>
            <div className="text-sm text-gray-500 mt-4">
              Последно обновяване: Декември 2024
            </div>
          </div>

          <div className="space-y-12">
            {/* Увод */}
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <i className="ri-file-text-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Добре дошли в K-FOOD</h2>
                  <p className="text-lg text-gray-700 mb-4">
                    Тези общи условия регулират ползването на нашия онлайн магазин за корейски продукти. Използвайки нашите услуги, вие се съгласявате да спазвате тези условия.
                  </p>
                  <p className="text-gray-600">
                    <strong>Търговец:</strong> K-FOOD, ул. "Велчо Джамджията" 6, Велико Търново, България
                  </p>
                </div>
              </div>
            </section>

            {/* Дефиниции */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-book-line text-emerald-600 mr-3"></i>
                Дефиниции
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900">„Ние", „Компанията", „K-FOOD"</h4>
                    <p className="text-gray-700">K-FOOD Велико Търново, собственик на онлайн магазина</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">„Вие", „Клиентът", „Потребителят"</h4>
                    <p className="text-gray-700">Лицето, което използва нашите услуги и прави поръчки</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">„Продукти"</h4>
                    <p className="text-gray-700">Корейски храни, напитки и свързани продукти, предлагани в магазина</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">„Услуги"</h4>
                    <p className="text-gray-700">Онлайн търговия, доставка и клиентско обслужване</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Условия за поръчки */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-shopping-cart-line text-emerald-600 mr-3"></i>
                Условия за Поръчки
              </h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Минимална Стойност и Валута</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Минимална стойност на поръчката: <strong>10.00 €</strong>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Всички цени се показват и плащат в <strong>Евро (€)</strong>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Цените включват ДДС, където се прилага
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Наличност и Потвърждение</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Продуктите са в наличност според показаното в сайта
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Запазваме правото да откажем поръчка при липса на наличност
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Ще бъдете уведомени при промяна в статуса на поръчката
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Доставка */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-truck-line text-emerald-600 mr-3"></i>
                Доставка
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Национални Доставки</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Куриери: Econt и Speedy
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        <strong>Доставката се определя от куриерската фирма и се заплаща при получаване на пратката.</strong>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Време за доставка: 1-3 работни дни
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-100 p-4 rounded-lg border border-amber-300">
                    <h4 className="font-bold text-amber-900 mb-2">Специални условия за Велико Търново</h4>
                    <p className="text-amber-800">
                      За град Велико Търново поръчките се обработват и доставят <strong>САМО</strong> чрез платформата <strong>Takeaway</strong>. 
                      Онлайн поръчки през този сайт НЕ се доставят в Велико Търново.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Плащане */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-bank-card-line text-emerald-600 mr-3"></i>
                Условия за Плащане
              </h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Приети Методи</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Картови Плащания</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• Кредитни карти (Visa, Mastercard, American Express)</li>
                        <li>• Дебитни карти (Visa Debit, Mastercard Debit, Maestro)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Онлайн Плащания</h4>
                      <ul className="space-y-1 text-gray-700">
                        <li>• PayPal</li>
                        <li>• Google Pay</li>
                        <li>• Apple Pay</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Условия за Плащане</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Плащането се извършва при поръчката
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Всички плащания се обработват сигурно чрез SSL шифроване
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Не съхраняваме данни за кредитни карти
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Връщане и рекламации */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-arrow-left-right-line text-emerald-600 mr-3"></i>
                Връщане и Рекламации
              </h2>
              
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Важни Условия</h3>
                <div className="space-y-3">
                  <p className="flex items-start text-gray-800">
                    <i className="ri-alert-line text-red-600 mr-2 mt-1"></i>
                    <strong>Разходите за връщането на продукта са изцяло за сметка на купувача.</strong>
                  </p>
                  <p className="flex items-start text-gray-800">
                    <i className="ri-bank-line text-emerald-600 mr-2 mt-1"></i>
                    Всички възстановявания се извършват <strong>само чрез банков превод</strong>.
                  </p>
                  <p className="flex items-start text-gray-700">
                    <i className="ri-time-line text-blue-600 mr-2 mt-1"></i>
                    Срок за връщане: до 14 дни от получаването на продукта.
                  </p>
                  <p className="flex items-start text-gray-700">
                    <i className="ri-checkbox-circle-line text-green-600 mr-2 mt-1"></i>
                    Продуктът трябва да бъде в оригинална опаковка и неотворен.
                  </p>
                </div>
              </div>
            </section>

            {/* Отговорности */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-shield-line text-emerald-600 mr-3"></i>
                Отговорности и Ограничения
              </h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Наша Отговорност</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Предоставяне на качествени корейски продукти
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Точно описание на продуктите и цените
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Сигурна обработка на поръчки и плащания
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Защита на личните данни според GDPR
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Ваша Отговорност</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Предоставяне на точни данни за поръчка и доставка
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Навременно плащане на поръчките
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Спазване на правилата за връщане на продукти
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Уведомяване при проблеми с доставката
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Ограничения на Отговорността</h3>
                  <p className="text-gray-700 mb-3">
                    Нашата отговорност е ограничена до стойността на конкретната поръчка. Не носим отговорност за:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start text-gray-700">
                      <i className="ri-close-line text-amber-600 mr-2 mt-1"></i>
                      Косвени или последващи щети
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-close-line text-amber-600 mr-2 mt-1"></i>
                      Загуба на печалба или данни
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-close-line text-amber-600 mr-2 mt-1"></i>
                      Забавяния, причинени от куриерски услуги
                    </li>
                    <li className="flex items-start text-gray-700">
                      <i className="ri-close-line text-amber-600 mr-2 mt-1"></i>
                      Форсмажорни обстоятелства
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Приложимо право */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-scales-3-line text-emerald-600 mr-3"></i>
                Приложимо Право и Юрисдикция
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="space-y-4">
                  <p className="text-gray-700">
                    <strong>Приложимо право:</strong> Тези общи условия се уреждат от българското законодателство.
                  </p>
                  <p className="text-gray-700">
                    <strong>Юрисдикция:</strong> Всички спорове се решават от компетентните български съдилища.
                  </p>
                  <p className="text-gray-700">
                    <strong>Потребителски права:</strong> Потребителите имат право да се обърнат към Комисията за защита на потребителите.
                  </p>
                  <p className="text-gray-700">
                    <strong>Алтернативно решаване на спорове:</strong> Предпочитаме доброволно и извънсъдебно решаване на спорове.
                  </p>
                </div>
              </div>
            </section>

            {/* Промени в условията */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-refresh-line text-emerald-600 mr-3"></i>
                Промени в Общите Условия
              </h2>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
                <div className="space-y-4">
                  <p className="text-lg text-gray-800">
                    Запазваме правото да променяме тези общи условия по всяко време.
                  </p>
                  <div className="space-y-2">
                    <p className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Промените влизат в сила от публикуването им на сайта
                    </p>
                    <p className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      При съществени промени ще бъдете уведомени по имейл
                    </p>
                    <p className="flex items-start text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2 mt-1"></i>
                      Продължавайки да използвате услугите, се съгласявате с новите условия
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Контакти */}
            <section className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-customer-service-2-line text-emerald-600 mr-3"></i>
                Контакт за Въпроси
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">K-FOOD Велико Търново</h4>
                  <div className="space-y-2">
                    <p className="flex items-center text-gray-600">
                      <i className="ri-map-pin-line mr-3"></i>
                      ул. "Велчо Джамджията" 6, Велико Търново, България
                    </p>
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
                    За всички въпроси относно общите условия и нашите услуги.
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