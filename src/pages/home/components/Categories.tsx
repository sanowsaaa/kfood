import { Link } from 'react-router-dom';

const categories = [
  {
    id: 7,
    name: 'Корейска козметика',
    description: 'K-beauty продукти за грижа за кожата — маски, серуми, кремове и корейски козметични иновации',
    image: 'https://readdy.ai/api/search-image?query=Korean%20beauty%20skincare%20products%20K-beauty%20sheet%20masks%20serums%20creams%20arranged%20on%20clean%20white%20marble%20surface%20professional%20product%20photography%20minimalist%20composition%20elegant%20Korean%20cosmetics%20with%20soft%20pink%20and%20white%20tones%20luxurious%20skincare&width=600&height=600&seq=cat-cosmetics-hp-001&orientation=squarish',
    icon: 'ri-heart-pulse-line',
    color: 'from-pink-400 to-rose-500',
  },
  {
    id: 1,
    name: 'Кимчи и Ферментирани',
    description: 'Традиционно корейско кимчи и ферментирали продукти',
    image: 'https://readdy.ai/api/search-image?query=Traditional%20Korean%20kimchi%20in%20glass%20jar%20with%20napa%20cabbage%20radish%20cucumber%20fermented%20vegetables%20on%20clean%20white%20marble%20surface%20natural%20lighting%20professional%20food%20photography%20minimalist%20composition%20authentic%20Korean%20side%20dishes&width=600&height=600&seq=cat-kimchi-001&orientation=squarish',
    icon: 'ri-leaf-line',
    color: 'from-brand-primary to-brand-primary',
  },
  {
    id: 2,
    name: 'Лапша и Рамен',
    description: 'Разнообразие от корейски лапши и рамен',
    image: 'https://readdy.ai/api/search-image?query=Korean%20instant%20noodles%20ramyeon%20packages%20variety%20colorful%20packaging%20Korean%20ramen%20bowls%20on%20clean%20white%20background%20professional%20product%20photography%20minimalist%20style%20authentic%20Korean%20noodle%20products&width=600&height=600&seq=cat-noodles-002&orientation=squarish',
    icon: 'ri-bowl-line',
    color: 'from-amber-500 to-orange-500',
  },
  {
    id: 3,
    name: 'Сосове и Подправки',
    description: 'Автентични корейски сосове и подправки',
    image: 'https://readdy.ai/api/search-image?query=Korean%20sauces%20and%20condiments%20gochujang%20doenjang%20soy%20sauce%20sesame%20oil%20in%20traditional%20bottles%20and%20jars%20arranged%20on%20white%20marble%20surface%20clean%20background%20professional%20product%20photography%20authentic%20Korean%20cooking%20ingredients&width=600&height=600&seq=cat-sauces-003&orientation=squarish',
    icon: 'ri-drop-line',
    color: 'from-brand-primary to-rose-700',
  },
  {
    id: 4,
    name: 'Снакове и Сладкиши',
    description: 'Популярни корейски снакове и десерти',
    image: 'https://readdy.ai/api/search-image?query=Korean%20snacks%20and%20sweets%20colorful%20packaging%20rice%20cakes%20tteok%20Korean%20candies%20chips%20arranged%20beautifully%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20treats&width=600&height=600&seq=cat-snacks-004&orientation=squarish',
    icon: 'ri-cake-3-line',
    color: 'from-pink-400 to-brand-primary',
  },
  {
    id: 5,
    name: 'Напитки',
    description: 'Корейски чайове, сокове и традиционни напитки',
    image: 'https://readdy.ai/api/search-image?query=Korean%20beverages%20drinks%20tea%20bottles%20cans%20traditional%20Korean%20drinks%20barley%20tea%20sikhye%20arranged%20on%20clean%20white%20background%20professional%20product%20photography%20minimalist%20style%20authentic%20Korean%20beverages&width=600&height=600&seq=cat-drinks-005&orientation=squarish',
    icon: 'ri-cup-line',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 6,
    name: 'Замразени Продукти',
    description: 'Манду, оризови кейкове и други замразени деликатеси',
    image: 'https://readdy.ai/api/search-image?query=Korean%20frozen%20food%20dumplings%20mandu%20rice%20cakes%20tteokbokki%20in%20packaging%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20frozen%20products&width=600&height=600&seq=cat-frozen-006&orientation=squarish',
    icon: 'ri-fridge-line',
    color: 'from-sky-500 to-blue-600',
  },
];

export default function Categories() {
  return (
    <section className="py-16 md:py-24 bg-gray-50/80 section-below-fold">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div className="mb-10 md:mb-14">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-brand-primary mb-3">
            Разгледай
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight">
            Категории Продукти
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5" data-product-shop>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="group bg-white cursor-pointer contain-layout rounded-xl border border-gray-100 overflow-hidden hover:border-brand-border transition-all duration-300 hover:shadow-[0_4px_20px_rgba(220,38,38,0.08)]"
            >
              <div className="relative overflow-hidden aspect-[16/10] bg-gray-50">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                <div className={`absolute bottom-3 left-3 w-9 h-9 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center shadow-sm`}>
                  <i className={`${category.icon} text-white text-base`}></i>
                </div>
              </div>
              <div className="p-5 md:p-6">
                <h3 className="font-heading text-lg md:text-xl font-medium text-gray-900 group-hover:text-brand-primary transition-colors tracking-tight mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 font-light mb-4 leading-relaxed">{category.description}</p>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-primary uppercase tracking-wider">
                  Разгледай
                  <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform duration-300"></i>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}