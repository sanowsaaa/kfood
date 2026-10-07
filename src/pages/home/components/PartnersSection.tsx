import { Link } from 'react-router-dom';

export default function PartnersSection() {
  return (
    <section className="py-16 md:py-24 bg-gray-50/80 section-below-fold" id="partners">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="mb-10 md:mb-14">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-3">Партньори</p>
          <h2 className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight">Работим с Най-Добрите</h2>
        </div>

        <div className="border border-gray-100 bg-white rounded-xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Image */}
            <div className="lg:col-span-2 overflow-hidden bg-gray-50">
              <img
                src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/c9006c7c1a57b2e203512e7966da42f2.png"
                alt="Прясна гъба кладница и шийтаке — Sunrise Food партньор на K-FOOD"
                className="w-full h-full object-cover object-center"
                style={{ minHeight: '320px' }}
              />
            </div>

            {/* Content */}
            <div className="lg:col-span-3 p-8 md:p-12 lg:p-14 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <i className="ri-plant-line text-red-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-heading text-xl font-medium text-gray-900 tracking-tight">
                    <a href="https://sunrisefood.eu/" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">Sunrise Food</a>
                  </h3>
                  <p className="text-xs text-gray-400 font-light">с. Гложене, обл. Ловеч — Ферма за Прясни Гъби</p>
                </div>
              </div>

              <div className="w-14 h-[3px] bg-gradient-to-r from-red-500 to-red-600 rounded-full mb-5" />

              <p className="text-sm text-gray-600 leading-relaxed mb-5 font-light">
                K-FOOD си сътрудничи пряко с{' '}
                <a href="https://sunrisefood.eu/" target="_blank" rel="noopener noreferrer" className="text-red-600 font-semibold hover:text-red-700 transition-colors">Sunrise Food</a>
                {' '}за доставка на прясна <strong className="font-semibold text-gray-900">гъба кладница</strong> и <strong className="font-semibold text-gray-900">шийтаке</strong> — отглеждани без химикали, с доставка до 24 часа от фермата.
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {['Гъба Кладница', 'Шийтаке', 'Без Пестициди', 'Доставка 24ч'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold text-red-600 uppercase tracking-wider px-3 py-1.5 bg-red-50 rounded-lg whitespace-nowrap">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="border border-red-100 bg-red-50/50 rounded-lg p-4 mb-5">
                <p className="text-xs text-gray-600 font-light">
                  <strong className="font-semibold text-gray-900">Наличност при запитване</strong> — за прясна гъба кладница и шийтаке се обадете на{' '}
                  <a href="tel:+359899897566" className="font-semibold text-red-600 hover:text-red-700 transition-colors">0899 897 566</a>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a href="tel:+359899897566" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer rounded-lg">
                  <i className="ri-phone-line"></i>
                  Обади се
                </a>
                <a href="https://sunrisefood.eu/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-all whitespace-nowrap cursor-pointer rounded-lg">
                  <i className="ri-external-link-line"></i>
                  sunrisefood.eu
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4 font-light">
          Всички наши партньори са проверени и сертифицирани производители — <strong className="font-semibold text-gray-500">гаранция за качество и автентичност</strong>
        </p>
      </div>
    </section>
  );
}