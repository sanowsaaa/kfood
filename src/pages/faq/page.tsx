import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { useSEO } from '@/utils/seo';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  { category: 'Поръчки', question: 'Каква е минималната стойност на поръчката?', answer: 'Минималната стойност на поръчката е 10.00 €. Поръчки под тази стойност не могат да бъдат обработени.' },
  { category: 'Поръчки', question: 'Как мога да проследя моята поръчка?', answer: 'След изпращане на поръчката ще получите имейл с номер за проследяване. Можете да проследите поръчката си и на страницата "Проследи поръчка".' },
  { category: 'Поръчки', question: 'Мога ли да отменя или промени поръчката си?', answer: 'Можете да отмените или промените поръчката си в рамките на 2 часа след направата й. Свържете се с нас на kfoodtarnovo@gmail.com или 0899 897 566.' },
  { category: 'Поръчки', question: 'Получавам ли потвърждение за поръчката?', answer: 'Да, веднага след успешна поръчка ще получите имейл с потвърждение с детайли за поръчката.' },
  { category: 'Доставка', question: 'Колко дни отнема доставката?', answer: 'Доставката в цяла България отнема 1-3 работни дни чрез Econt или Speedy. За Велико Търново поръчвайте чрез Takeaway.' },
  { category: 'Доставка', question: 'Колко струва доставката?', answer: 'Цената на доставката се определя от куриерската фирма (Econt или Speedy) и се заплаща при получаване на пратката.' },
  { category: 'Доставка', question: 'Доставяте ли в Европа?', answer: 'Към момента доставяме само в рамките на България.' },
  { category: 'Доставка', question: 'Как да поръчам ако съм от Велико Търново?', answer: 'За Велико Търново поръчките се правят САМО чрез платформата Takeaway. Намерете K-FOOD в списъка с ресторанти и поръчайте директно там.' },
  { category: 'Плащане', question: 'Какви методи на плащане приемате?', answer: 'Приемаме плащане с карта (Visa, Mastercard) чрез Stripe.' },
  { category: 'Плащане', question: 'Безопасно ли е плащането с карта?', answer: 'Да! Плащанията с карта се обработват от Stripe - световен лидер в онлайн плащанията. Ние никога не виждаме или съхраняваме данните на вашата карта.' },
  { category: 'Продукти', question: 'Продуктите автентични корейски ли са?', answer: 'Да! Всички наши продукти са внесени директно от Южна Корея и са 100% автентични.' },
  { category: 'Продукти', question: 'Продуктите имат ли информация на български?', answer: 'На нашия сайт предоставяме пълно описание на всеки продукт на български, включително съставки и начин на употреба.' },
  { category: 'Продукти', question: 'Как да разбера дали продуктът е подходящ за вегетарианци?', answer: 'В описанието на всеки продукт посочваме дали е подходящ за вегетарианци или вегани. Можете и да ни пишете за конкретен продукт.' },
  { category: 'Връщане', question: 'Мога ли да върна продукт?', answer: 'Да, приемаме връщания в рамките на 14 дни от получаването, ако продуктът е неотворен и в оригинална опаковка.' },
  { category: 'Връщане', question: 'Какво да направя ако получа повреден продукт?', answer: 'Свържете се с нас в рамките на 48 часа на kfoodtarnovo@gmail.com с снимки на проблема. Ще решим ситуацията незабавно.' },
];

const categories = ['Всички', ...Array.from(new Set(faqs.map((f) => f.category)))];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState('Всички');

  useSEO({
    title: 'Въпроси и Отговори | Онлайн Магазин Корейска Храна K-FOOD',
    description: 'Отговори на всички въпроси за нашия онлайн магазин за корейска храна. Как да поръчам корейска храна онлайн? Доставка, плащане, връщане. K-FOOD — корейски магазин онлайн с доставка в цяла България.',
    keywords: 'FAQ корейска храна онлайн, как да поръчам корейски продукти, доставка корейска храна България, плащане корейски магазин, K-FOOD въпроси',
    canonical: '/faq',
    schema: faqSchema,
  });

  const filtered = faqs.filter((f) => activeCategory === 'Всички' || f.category === activeCategory);
  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero - compact on mobile */}
      <section className="bg-gradient-to-br from-emerald-700 to-teal-600 text-white py-10 sm:py-14 md:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center bg-white/20 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4">
            <i className="ri-question-answer-line text-2xl sm:text-3xl text-white"></i>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-3">Често задавани въпроси</h1>
          <p className="text-emerald-100 text-sm sm:text-lg">Намери бързо отговор на въпроса си. Не намираш? Пиши ни!</p>
        </div>
      </section>

      {/* Category Filter - sticky with better mobile offset */}
      <div className="bg-white border-b border-gray-200 sticky top-14 sm:top-16 md:top-20 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 sm:py-3 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={`whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer touch-target-sm ${
                  activeCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Навигация" className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-5 sm:mb-8">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Начало</Link>
          <i className="ri-arrow-right-s-line"></i>
          <span className="text-gray-800 font-medium">FAQ</span>
        </nav>

        {/* FAQ Accordion */}
        <div className="space-y-2 sm:space-y-3" role="list">
          {filtered.map((faq, i) => (
            <div key={i} role="listitem" className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggle(i)}
                aria-expanded={openIndex === i}
                className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-5 text-left cursor-pointer hover:bg-gray-50 transition-colors touch-target"
              >
                <div className="flex items-start gap-2 sm:gap-3 flex-1 pr-3 sm:pr-4">
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap mt-0.5">
                    {faq.category}
                  </span>
                  <span className="font-semibold text-gray-900 text-xs sm:text-base leading-snug">{faq.question}</span>
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${openIndex === i ? 'bg-emerald-600 text-white rotate-180' : 'bg-gray-100 text-gray-500'}`}>
                  <i className="ri-arrow-down-s-line text-sm sm:text-lg"></i>
                </div>
              </button>
              {openIndex === i && (
                <div className="px-4 sm:px-6 pb-3.5 sm:pb-5 border-t border-gray-50">
                  <p className="text-gray-600 text-xs sm:text-base leading-relaxed pt-2.5 sm:pt-4">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA - compact on mobile */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 sm:p-8 text-white text-center">
          <h2 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Не намери отговора си?</h2>
          <p className="text-emerald-100 text-xs sm:text-base mb-4 sm:mb-6">Свържи се с нас директно - отговаряме бързо!</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <a href="mailto:kfoodtarnovo@gmail.com" className="bg-white text-emerald-700 font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-emerald-50 transition-colors whitespace-nowrap flex items-center justify-center gap-2 text-xs sm:text-base touch-target">
              <i className="ri-mail-line"></i>kfoodtarnovo@gmail.com
            </a>
            <a href="tel:+359899897566" className="bg-emerald-500 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-emerald-400 transition-colors whitespace-nowrap flex items-center justify-center gap-2 text-xs sm:text-base touch-target">
              <i className="ri-phone-line"></i>0899 897 566
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}