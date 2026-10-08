import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section
      className="relative flex items-end justify-center overflow-hidden"
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
      <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 via-red-950/45 to-red-950/55" />

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 md:px-10 lg:px-16 pb-10 sm:pb-14 md:pb-20">
        <div className="max-w-[1440px] mx-auto">
          <div className="max-w-2xl">
            {/* Label */}
            <p className="text-xs sm:text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-3 md:mb-4 animate-fade-up opacity-0">
              Корейска храна · Козметика · Култура с доставка
            </p>

            {/* H1 - mobile optimized sizing */}
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-[3.25rem] font-light text-white leading-[1.1] sm:leading-[1.08] mb-3 md:mb-5 animate-fade-up delay-100 opacity-0 text-balance tracking-tight">
              Корейска Храна
              <br />
              <span className="font-normal italic text-lg sm:text-xl md:text-3xl lg:text-[3.25rem]">Доставка до Цяла България</span>
            </h1>

            {/* Description - tighter on mobile */}
            <p className="text-xs sm:text-sm md:text-base text-white/70 leading-relaxed mb-5 md:mb-7 max-w-xl animate-fade-up delay-200 opacity-0 font-light">
              Над 200 автентични корейски продукта — рамен Samyang и Buldak, кимчи, токбоки, корейски сосове гочуджанг, снакове, напитки и K-beauty корейска козметика. Поръчай корейска храна онлайн с бърза доставка 1-2 дни.
            </p>

            {/* CTAs - full width on very small screens */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 animate-fade-up delay-300 opacity-0">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-red-600 text-white text-sm font-semibold tracking-wide uppercase hover:bg-red-700 transition-colors whitespace-nowrap cursor-pointer rounded-lg shadow-[0_4px_14px_rgba(220,38,38,0.35)] touch-target"
              >
                Разгледай Продуктите
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
                { icon: 'ri-shield-check-line', text: '100% Оригинални от Корея' },
                { icon: 'ri-truck-line', text: 'Доставка 1-2 дни' },
                { icon: 'ri-star-fill', text: '4.9★ от 2,847+ клиенти' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-2 text-white/80 animate-fade-up delay-400 opacity-0">
                  <i aria-hidden="true" className={`${item.icon} text-red-400 text-xs sm:text-sm`}></i>
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