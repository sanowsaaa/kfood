import { useState } from 'react';
import { Link } from 'react-router-dom';

const homeFaqs = [
  { question: 'Каква е минималната стойност на поръчката?', answer: 'Минималната стойност на поръчката е 10.00 €. Доставката се заплаща при получаване директно на куриера.' },
  { question: 'Колко дни отнема доставката?', answer: 'Доставката в цяла България отнема 1-3 работни дни чрез Econt или Speedy. За Велико Търново поръчвайте чрез Takeaway.' },
  { question: 'Продуктите автентични корейски ли са?', answer: 'Да! Всички продукти са внесени директно от Южна Корея и са 100% автентични. Работим с проверени корейски производители.' },
  { question: 'Какви методи на плащане приемате?', answer: 'Приемаме плащане с карта (Visa, Mastercard) чрез Stripe.' },
  { question: 'Мога ли да върна продукт?', answer: 'Да, приемаме връщания в рамките на 14 дни от получаването, ако продуктът е неотворен и в оригинална опаковка.' },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: homeFaqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
};

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 bg-white section-below-fold" aria-labelledby="faq-heading">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10 md:mb-14">
            <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-3">Имаш въпрос?</p>
            <h2 id="faq-heading" className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight">Често задавани въпроси</h2>
          </div>

          <div className="divide-y divide-gray-100 border-t-2 border-gray-100 rounded-xl overflow-hidden">
            {homeFaqs.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  aria-expanded={openIndex === i}
                  className="w-full flex items-center justify-between py-5 px-4 text-left cursor-pointer group hover:bg-red-50/30 transition-colors"
                >
                  <span className="text-sm md:text-[15px] font-semibold text-gray-900 pr-6 group-hover:text-red-600 transition-colors">{faq.question}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${openIndex === i ? 'bg-red-600 text-white rotate-45' : 'bg-gray-100 text-gray-400 group-hover:bg-red-100 group-hover:text-red-600'}`}>
                    <i className="ri-add-line text-sm"></i>
                  </div>
                </button>
                {openIndex === i && (
                  <div className="pb-5 px-4">
                    <p className="text-sm text-gray-600 leading-relaxed font-light">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/faq" className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer tracking-wide uppercase">
              Виж всички въпроси
              <i className="ri-arrow-right-line"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}