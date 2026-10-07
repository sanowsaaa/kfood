import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { updateSEO } from '../../utils/seo';

export default function PaymentPage() {
  useEffect(() => {
    updateSEO({
      title: 'Начини за Плащане - K-FOOD Велико Търново',
      description: 'Сигурни и удобни начини за плащане на корейски продукти. Кредитни карти, дебитни карти и стандартни онлайн плащания.',
      keywords: 'плащане, кредитна карта, дебитна карта, онлайн плащане, сигурно плащане'
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white">
          <div className="mb-12">
            <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
              <Link to="/" className="hover:text-emerald-600 cursor-pointer">Начало</Link>
              <i className="ri-arrow-right-s-line"></i>
              <span className="text-gray-900 font-medium">Плащане</span>
            </nav>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Начини за Плащане</h1>
            <p className="text-xl text-gray-600">
              Сигурни и удобни опции за плащане на вашите поръчки
            </p>
          </div>

          <div className="space-y-12">
            {/* Валута */}
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <i className="ri-money-euro-circle-line text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Валута</h2>
                  <p className="text-lg text-gray-700">
                    Всички цени се показват и плащат в <strong className="text-emerald-600">Евро (€)</strong>
                  </p>
                  <p className="text-gray-600 mt-2">
                    Валутният курс се актуализира автоматично при плащането
                  </p>
                </div>
              </div>
            </section>

            {/* Приети начини за плащане */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-bank-card-line text-emerald-600 mr-3"></i>
                Приети Начини за Плащане
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    <i className="ri-bank-card-2-line text-3xl text-blue-600 mr-4"></i>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Кредитни Карти</h3>
                      <p className="text-gray-600">Всички основни картови схеми</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Visa
                    </div>
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Mastercard
                    </div>
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      American Express
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    <i className="ri-bank-card-line text-3xl text-emerald-600 mr-4"></i>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Дебитни Карти</h3>
                      <p className="text-gray-600">Директно от банковата сметка</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Visa Debit
                    </div>
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Mastercard Debit
                    </div>
                    <div className="flex items-center text-gray-700">
                      <i className="ri-check-line text-emerald-600 mr-2"></i>
                      Maestro
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Онлайн плащания */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-smartphone-line text-emerald-600 mr-3"></i>
                Стандартни Онлайн Плащания
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-smartphone-line text-2xl text-green-600"></i>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Google Pay</h4>
                    <p className="text-gray-600 text-sm">Бързо мобилно плащане</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-apple-line text-2xl text-gray-600"></i>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Apple Pay</h4>
                    <p className="text-gray-600 text-sm">За iOS устройства</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-bank-card-line text-2xl text-emerald-600"></i>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Банкова карта</h4>
                    <p className="text-gray-600 text-sm">Visa, Mastercard, Amex</p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                  <p className="text-emerald-800">
                    <i className="ri-information-line mr-2"></i>
                    Всички плащания се обработват чрез сигурни SSL шифровани връзки
                  </p>
                </div>
              </div>
            </section>

            {/* Сигурност */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-shield-check-line text-emerald-600 mr-3"></i>
                Сигурност на Плащанията
              </h2>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">SSL Шифроване</h3>
                    <p className="text-gray-700 mb-4">
                      Всички финансови данни се предават чрез 256-битово SSL шифроване за максимална сигурност.
                    </p>
                    <div className="flex items-center text-emerald-600">
                      <i className="ri-lock-line mr-2"></i>
                      <span className="font-medium">Сертифицирана сигурност</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">PCI DSS Съответствие</h3>
                    <p className="text-gray-700 mb-4">
                      Нашата платежна система отговаря на всички PCI DSS стандарти за сигурност на картовите данни.
                    </p>
                    <div className="flex items-center text-emerald-600">
                      <i className="ri-shield-check-line mr-2"></i>
                      <span className="font-medium">Международни стандарти</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Процес на плащане */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-arrow-right-circle-line text-emerald-600 mr-3"></i>
                Как Работи Плащането
              </h2>
              
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-200">
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Избор на Продукти</h4>
                      <p className="text-gray-600">Добавете желаните корейски продукти в количката си</p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Преглед на Поръчката</h4>
                      <p className="text-gray-600">Проверете продуктите, количествата и общата сума в евро</p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Избор на Плащане</h4>
                      <p className="text-gray-600">Изберете предпочитания от вас начин за плащане</p>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-start space-x-4">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">Потвърждение</h4>
                      <p className="text-gray-600">Получавате имейл потвърждение и номер за проследяване</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Контакти за въпроси */}
            <section className="bg-gray-50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <i className="ri-question-line text-emerald-600 mr-3"></i>
                Въпроси за Плащане?
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
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Поддръжка</h4>
                  <p className="text-gray-600 mb-2">
                    Нашият екип е готов да помогне с всички въпроси относно плащането
                  </p>
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