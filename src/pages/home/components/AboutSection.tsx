export default function AboutSection() {
  const features = [
    {
      icon: 'ri-checkbox-circle-line',
      title: 'Познати любими брандове',
      description: 'Автентични корейски продукти — Samyang, Nongshim, Yopokki и още'
    },
    {
      icon: 'ri-truck-line',
      title: 'Доставка с куриер',
      description: 'Доставката се определя от куриерската фирма и се заплаща при получаване.'
    },
    {
      icon: 'ri-shield-check-line',
      title: 'Намери своя вкус',
      description: 'Рамен, токбоки и сосове — от меки вкусове до огнено люто'
    },
    {
      icon: 'ri-customer-service-2-line',
      title: 'Поддръжка',
      description: 'Свържете се с нас: 0899 897 566'
    }
  ];

  return (
    <section id="about" className="brand-story py-16 md:py-24 section-below-fold">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Text */}
          <div>
            <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-brand-primary mb-3">
              За K-FOOD
            </p>
            <h2 className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight mb-7">
              Малко Корея в твоя ден
            </h2>
            <div className="w-16 h-[3px] bg-gradient-to-r from-brand-primary to-brand-primary rounded-full mb-7" />
            <p className="text-sm md:text-base text-gray-600 mb-4 leading-relaxed font-light">
              <strong className="font-semibold text-gray-900">K-FOOD</strong> събира корейски вкусове за всеки ден. Купа рамен за вечерта, кимчи за любимото ястие или снакове за споделяне — понякога едно малко откритие прави деня по-вкусен.
            </p>
            <p className="text-sm md:text-base text-gray-600 mb-9 leading-relaxed font-light">
              Избери познат фаворит или опитай нещо ново от Samyang, Nongshim, Yopokki и Paldo. Поръчай онлайн без регистрация или ела при нас във Велико Търново — ще се радваме да се срещнем.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-9">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-brand-border hover:bg-brand-blush/30 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-brand-blush flex items-center justify-center flex-shrink-0">
                    <i aria-hidden="true" className={`${feature.icon} text-brand-primary text-lg`}></i>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">{feature.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-light">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <a
                href="https://www.facebook.com/profile.php?id=61556516122723"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider hover:border-brand-primary hover:text-brand-primary hover:bg-brand-blush transition-all whitespace-nowrap cursor-pointer rounded-lg"
              >
                <i aria-hidden="true" className="ri-facebook-fill text-sm"></i>
                Facebook
              </a>
              <a
                href="https://www.instagram.com/kfood_veliko_tarnovo/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider hover:border-brand-primary hover:text-brand-primary hover:bg-brand-blush transition-all whitespace-nowrap cursor-pointer rounded-lg"
              >
                <i aria-hidden="true" className="ri-instagram-line text-sm"></i>
                Instagram
              </a>
              <a
                href="https://www.tiktok.com/@kfoodveliko"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider hover:border-brand-primary hover:text-brand-primary hover:bg-brand-blush transition-all whitespace-nowrap cursor-pointer rounded-lg"
              >
                <i aria-hidden="true" className="ri-tiktok-line text-sm"></i>
                TikTok
              </a>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="overflow-hidden rounded-xl">
              <img
                src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/d8f5371b22fd1e0c174087e828221718.jpeg"
                alt="K-FOOD Рамен Колекция"
                className="w-full object-cover hover:scale-[1.02] transition-transform duration-700"
                loading="lazy"
                style={{ maxHeight: '520px', objectFit: 'cover' }}
              />
            </div>
            {/* Stat card */}
            <div className="absolute -bottom-6 -left-4 md:-left-8 bg-white rounded-xl border border-brand-border p-5 max-w-[220px] shadow-[0_8px_30px_rgba(220,38,38,0.08)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-brand-blush flex items-center justify-center text-brand-primary"><i aria-hidden="true" className="ri-heart-line text-xl"></i></div>
                <div>
                  <div className="text-sm font-semibold text-brand-ink">Taste Everyday</div>
                  <div className="text-xs text-gray-600">Вкус за всеки ден</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">Открий. Опитай. Сподели.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
