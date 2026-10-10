import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section
      className="brand-hero relative flex items-end justify-center overflow-hidden"
      style={{ minHeight: 'clamp(360px, 50vh, 560px)' }}
      aria-label="K-FOOD — Корейска Храна Онлайн с Доставка до Цяла България"
    >
      {/* Background image */}
      <img
        src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/7c3b0ad01c5499c798ab7897a6ed0ab2.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
        fetchPriority="high"
      />

      {/* Stronger overlay for mobile readability */}
      <div className="brand-hero-overlay absolute inset-0" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 md:px-10 lg:px-16 pb-10 sm:pb-14 md:pb-20">
        <div className="max-w-[1440px] mx-auto">
          <div className="max-w-2xl">
            {/* Label */}
            <p className="text-xs md:text-sm font-medium tracking-[0.16em] uppercase text-brand-petal mb-3 md:mb-4 animate-fade-up opacity-0">
              Taste Everyday · Вкус за всеки ден
            </p>

            {/* H1 - mobile optimized sizing */}
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] text-white leading-[1.15] mb-4 md:mb-5 animate-fade-up delay-100 opacity-0 text-balance tracking-tight">
              Корейска храна.
              <br />
              <span className="font-normal italic text-brand-petal">Твоят нов любим вкус.</span>
            </h1>

            {/* Description - tighter on mobile */}
            <p className="text-base md:text-lg text-white/90 leading-relaxed mb-6 md:mb-7 max-w-xl animate-fade-up delay-200 opacity-0">
              Люто, сладко или нещо съвсем ново? Открий рамен Samyang и Buldak, кимчи, сосове и снакове. Избери своя вкус — доставяме в цяла България.
            </p>

            {/* CTAs - full width on very small screens */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 animate-fade-up delay-300 opacity-0">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-petal text-brand-ink text-base font-semibold hover:bg-white transition-colors whitespace-nowrap cursor-pointer rounded-xl shadow-lg touch-target"
              >
                Разгледай продуктите
                <i aria-hidden="true" className="ri-arrow-right-line text-lg"></i>
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 border border-white/30 text-white text-sm font-medium tracking-wide uppercase hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer rounded-lg touch-target"
              >
                <i aria-hidden="true" className="ri-grid-line"></i>
                Категории
              </Link>
            </div>

            {/* Trust indicators - horizontal scroll on very small screens */}
            <div className="mt-5 sm:mt-8 flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-2 sm:gap-y-3">
              {[
                { icon: 'ri-truck-line', text: 'Доставка в България' },
                { icon: 'ri-shopping-bag-line', text: 'Поръчка без регистрация' },
                { icon: 'ri-map-pin-line', text: 'Магазин във Велико Търново' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-white/80 animate-fade-up delay-400 opacity-0">
                  <i aria-hidden="true" className={`${item.icon} text-brand-petal text-sm`}></i>
                  <span className="text-[11px] sm:text-xs md:text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
