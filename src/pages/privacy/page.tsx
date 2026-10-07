import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';

export default function PrivacyPage() {
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'Политика за Поверителност - K-FOOD Велико Търново',
    description: 'Политика за защита на личните данни в K-FOOD. Как събираме, използваме и защитаваме вашата информация при покупката на корейски продукти. GDPR съответствие.',
    keywords: 'поверителност, лични данни, GDPR, защита на данни, политика за поверителност, K-FOOD',
    canonical: '/privacy',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${siteUrl}/privacy`,
          url: `${siteUrl}/privacy`,
          name: 'Политика за Поверителност - K-FOOD Велико Търново',
          description: 'Политика за защита на личните данни в K-FOOD Велико Търново. GDPR съответствие.',
          inLanguage: 'bg-BG',
          isPartOf: { '@id': `${siteUrl}/#website` },
        },
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Поверителност', url: '/privacy' },
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
              <span className="text-gray-900 font-medium">Поверителност</span>
            </nav>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Политика за Поверителност</h1>
            <p className="text-xl text-gray-600">
              Как защитаваме и използваме вашите лични данни
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
                  <i className="ri-shield-check-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Нашият Ангажимент</h2>
                  <p className="text-lg text-gray-700 mb-4">
                    K-FOOD се ангажира да защитава поверителността на вашите лични данни в съответствие с Общия регламент за защита на данните (GDPR) и българското законодателство.
                  </p>
                  <p className="text-gray-600">
                    Тази политика обяснява как събираме, използваме, съхраняваме и защитаваме вашата лична информация.
                  </p>
                </div>
              </div>
            </section>

            {/* Събиране на данни */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-database-2-line text-emerald-600 mr-3"></i>
                Какви Данни Събираме
              </h2>
              
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <i className="ri-user-line text-emerald-600 mr-2"></i>
                    Лични Данни за Идентификация
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Име и фамилия
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Имейл адрес
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Телефонен номер
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Адрес за доставка
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <i className="ri-shopping-cart-line text-emerald-600 mr-2"></i>
                    Данни за Поръчки
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      История на поръчките
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Предпочитания при пазаруване
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Информация за плащането (частично)
                    </li>
                  </ul>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <i className="ri-computer-line text-emerald-600 mr-2"></i>
                    Технически Данни
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      IP адрес
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Тип браузър и операционна система
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Данни за използването на сайта
                    </li>
                    <li className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Cookies и подобни технологии
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Използване на данните */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-settings-3-line text-emerald-600 mr-3"></i>
                Как Използваме Данните
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Обработка на Поръчки</h3>
                    <p className="text-gray-700">
                      Използваме вашите данни за обработка, изпълнение и доставка на поръчки, както и за комуникация относно статуса им.
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Клиентско Обслужване</h3>
                    <p className="text-gray-700">
                      За отговаряне на въпроси, решаване на проблеми и предоставяне на техническа поддръжка.
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Подобрение на Услугите</h3>
                    <p className="text-gray-700">
                      Анализираме данните за използването, за да подобрим функционалността и потребителското изживяване.
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Маркетингови Съобщения</h3>
                    <p className="text-gray-700">
                      Изпращаме актуализации за нови продукти и оферти (само с вашето съгласие).
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Правна основа */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-scales-3-line text-emerald-600 mr-3"></i>
                Правна Основа за Обработка
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Изпълнение на Договор</h3>
                  <p className="text-gray-700">
                    За обработка на поръчки, доставки и предоставяне на услуги, които сте поискали.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Законов Интерес</h3>
                  <p className="text-gray-700">
                    За подобрение на услугите, предотвратяване на измами и осигуряване на сигурност.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Съгласие</h3>
                  <p className="text-gray-700">
                    За маркетингови съобщения и използване на cookies (където се изисква).
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Правно Задължение</h3>
                  <p className="text-gray-700">
                    За спазване на данъчни, счетоводни и други законови изисквания.
                  </p>
                </div>
              </div>
            </section>

            {/* Споделяне на данни */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-share-line text-emerald-600 mr-3"></i>
                Споделяне на Данни
              </h2>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Трети Страни</h3>
                <p className="text-gray-700 mb-4">
                  Споделяме данни само с доверени партньори, необходими за предоставяне на услугите:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Куриерски Услуги</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Econt - за национални доставки</li>
                      <li>• Speedy - за национални доставки</li>
                      <li>• Takeaway - за локални доставки</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Платежни Услуги</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Stripe - за обработка на плащания</li>
                      <li>• Банки - за банкови преводи</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium">
                    <i className="ri-shield-check-line mr-2"></i>
                    Всички партньори са задължени да защитават вашите данни и да ги използват само за предоставяне на услугите.
                  </p>
                </div>
              </div>
            </section>

            {/* Вашите права */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-user-settings-line text-emerald-600 mr-3"></i>
                Вашите Права (GDPR)
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-eye-line text-emerald-600 mr-2"></i>
                    Достъп до Данни
                  </h3>
                  <p className="text-gray-700">
                    Право да поискате копие от всички лични данни, които съхраняваме за вас.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-edit-line text-emerald-600 mr-2"></i>
                    Корекция
                  </h3>
                  <p className="text-gray-700">
                    Право да поискате корекция на неточни или непълни данни.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-delete-bin-line text-emerald-600 mr-2"></i>
                    Изтриване
                  </h3>
                  <p className="text-gray-700">
                    Право да поискате изтриване на данните при определени условия.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-pause-circle-line text-emerald-600 mr-2"></i>
                    Ограничаване
                  </h3>
                  <p className="text-gray-700">
                    Право да поискате ограничаване на обработката на данните.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-download-line text-emerald-600 mr-2"></i>
                    Преносимост
                  </h3>
                  <p className="text-gray-700">
                    Право да получите данните си в структуриран, машинно четим формат.
                  </p>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-forbid-line text-emerald-600 mr-2"></i>
                    Възражение
                  </h3>
                  <p className="text-gray-700">
                    Право да възразите срещу обработката на данните за директен маркетинг.
                  </p>
                </div>
              </div>
            </section>

            {/* Бисквитки */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-shield-check-line text-emerald-600 mr-3"></i>
                Политика за Бисквитки (Cookies)
              </h2>

              <div className="space-y-4">
                <p className="text-gray-700">
                  Нашият сайт използва бисквитки — малки текстови файлове, съхранявани на вашето устройство. Те ни помагат да осигурим правилното функциониране на сайта и да подобрим вашето преживяване.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-settings-3-line text-emerald-600 text-xl"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Задължителни</h3>
                    <p className="text-sm text-gray-600 mb-3">Необходими за основните функции на сайта. Не могат да бъдат изключени.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-emerald-500"></i> Съдържание на количката</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-emerald-500"></i> Сесия на потребителя</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-emerald-500"></i> Съгласие за бисквитки</li>
                    </ul>
                    <span className="inline-block mt-3 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Винаги активни</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-bar-chart-line text-amber-600 text-xl"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Аналитични</h3>
                    <p className="text-sm text-gray-600 mb-3">Помагат ни да разберем как посетителите използват сайта.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-amber-500"></i> Брой посещения</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-amber-500"></i> Разглеждани страници</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-amber-500"></i> Поведение на сайта</li>
                    </ul>
                    <span className="inline-block mt-3 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">По избор</span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center mb-3">
                      <i className="ri-megaphone-line text-rose-600 text-xl"></i>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">Маркетингови</h3>
                    <p className="text-sm text-gray-600 mb-3">Използват се за показване на персонализирани реклами.</p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-rose-500"></i> Персонализирани оферти</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-rose-500"></i> Ремаркетинг</li>
                      <li className="flex items-center gap-1"><i className="ri-checkbox-circle-line text-rose-500"></i> Социални мрежи</li>
                    </ul>
                    <span className="inline-block mt-3 text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-1 rounded-full">По избор</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 mt-2">
                  <h4 className="font-bold text-gray-900 mb-2">Как да управлявате бисквитките?</h4>
                  <p className="text-sm text-gray-600">
                    Можете да изтриете или блокирате бисквитките от настройките на вашия браузър. Имайте предвид, че блокирането на задължителните бисквитки може да наруши функционалността на сайта (напр. количката може да не работи правилно).
                  </p>
                </div>
              </div>
            </section>

            {/* Сигурност */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-shield-keyhole-line text-emerald-600 mr-3"></i>
                Сигурност на Данните
              </h2>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Технически Мерки</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        SSL шифроване за всички трансфери
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Сигурни сървъри и бази данни
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Редовни резервни копия
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Защита срещу неоторизиран достъп
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Организационни Мерки</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Ограничен достъп до данните
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Обучение на персонала
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Политики за сигурност
                      </li>
                      <li className="flex items-center text-gray-700">
                        <i className="ri-check-line text-emerald-600 mr-2"></i>
                        Редовни одити на сигурността
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Контакти */}
            <section className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-customer-service-2-line text-emerald-600 mr-3"></i>
                Контакт за Въпроси за Поверителност
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Администратор на Данни</h4>
                  <p className="text-gray-700 mb-3">K-FOOD Велико Търново</p>
                  <div className="space-y-2">
                    <a href="mailto:kfoodtarnovo@gmail.com" className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer">
                      <i className="ri-mail-line mr-3"></i>
                      kfoodtarnovo@gmail.com
                    </a>
                    <a href="tel:+359899897566" className="flex items-center text-gray-600 hover:text-emerald-600 transition-colors cursor-pointer">
                      <i className="ri-phone-line mr-3"></i>
                      0899 897 566
                    </a>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Упражняване на Права</h4>
                  <p className="text-gray-700 mb-3">
                    За упражняване на вашите права по GDPR, моля свържете се с нас чрез горепосочените контакти.
                  </p>
                  <p className="text-gray-600">
                    Ще отговорим в срок до 30 дни от получаване на заявката.
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