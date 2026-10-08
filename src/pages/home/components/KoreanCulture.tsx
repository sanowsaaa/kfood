import { useState } from 'react';
import { Link } from 'react-router-dom';

const TABS = ['K-pop', 'K-drama', 'Традиции', 'Кухня'];

const CONTENT = {
  'K-pop': {
    icon: 'ri-music-2-line',
    title: 'K-pop — Музиката, Която Завладя Света',
    description:
      'K-pop (корейска поп музика) е глобален феномен, роден в Южна Корея. Групи като BTS, BLACKPINK, EXO и TWICE имат милиони фенове по целия свят. Корейската поп индустрия е известна с перфектните хореографии, визуалните концепции и дедикираните фен общности.',
    facts: [
      { label: 'BTS', value: 'Над 40 млн. последователи в Twitter' },
      { label: 'BLACKPINK', value: 'Първата K-pop група в Coachella' },
      { label: 'Hallyu', value: 'Корейската култура в 100+ страни' },
    ],
    image: 'https://readdy.ai/api/search-image?query=K-pop%20concert%20stage%20with%20colorful%20lights%20and%20energetic%20performance%2C%20Korean%20pop%20music%20aesthetic%2C%20vibrant%20neon%20colors%2C%20dynamic%20stage%20design%2C%20crowd%20atmosphere%2C%20modern%20entertainment%2C%20South%20Korean%20music%20culture%2C%20spectacular%20visual%20show&width=600&height=400&seq=kpop-culture-001&orientation=landscape',
    imageAlt: 'K-pop концерт',
  },
  'K-drama': {
    icon: 'ri-film-line',
    title: 'K-drama — Сериалите, Които Не Можеш да Спреш',
    description:
      'Корейските сериали (K-drama) са известни с емоционалните си истории, невероятната продукция и незабравимите герои. От романтични комедии до трилъри и исторически епоси — K-drama предлага нещо за всеки.',
    facts: [
      { label: 'Squid Game', value: '#1 в Netflix в 94 страни' },
      { label: 'Crash Landing', value: 'Най-гледан K-drama в историята' },
      { label: 'Netflix', value: 'Инвестира $2.5 млрд. в K-content' },
    ],
    image: 'https://readdy.ai/api/search-image?query=Korean%20drama%20filming%20set%20with%20beautiful%20cinematography%2C%20romantic%20Korean%20drama%20scene%2C%20elegant%20Korean%20actors%20in%20traditional%20and%20modern%20settings%2C%20cinematic%20lighting%2C%20emotional%20storytelling%20atmosphere%2C%20South%20Korean%20television%20production&width=600&height=400&seq=kdrama-culture-001&orientation=landscape',
    imageAlt: 'K-drama снимачна площадка',
  },
  'Традиции': {
    icon: 'ri-ancient-gate-line',
    title: 'Корейски Традиции — Богато Наследство',
    description:
      'Корейската култура е дълбоко вкоренена в конфуциански ценности — уважение към по-възрастните, семейни връзки и общностен дух. Традиционни празници като Чусок и Сеол се отбелязват с ритуали и специални ястия.',
    facts: [
      { label: 'Чусок', value: 'Фестивал на реколтата — 3 дни' },
      { label: 'Ханбок', value: 'Традиционно облекло 1600+ год.' },
      { label: 'Тхеквондо', value: 'Олимпийски спорт от Корея' },
    ],
    image: 'https://readdy.ai/api/search-image?query=Traditional%20Korean%20culture%20with%20hanbok%20clothing%2C%20ancient%20Korean%20palace%20architecture%2C%20traditional%20Korean%20ceremony%2C%20colorful%20traditional%20costumes%2C%20Gyeongbokgung%20palace%20Seoul%2C%20cultural%20heritage%2C%20historical%20Korean%20traditions%2C%20vibrant%20ceremonial%20colors&width=600&height=400&seq=korean-tradition-001&orientation=landscape',
    imageAlt: 'Корейски традиции и Ханбок',
  },
  'Кухня': {
    icon: 'ri-restaurant-2-line',
    title: 'Корейска Кухня — Вкус с Хиляди Години История',
    description:
      'Корейската кухня е балансирана, ароматна и изключително разнообразна. Основана на ферментирали храни (кимчи, доенджан), пресни зеленчуци и пикантни подправки, тя е призната от UNESCO за нематериално културно наследство.',
    facts: [
      { label: 'Кимчи', value: 'Над 200 вида — UNESCO' },
      { label: 'Корейско BBQ', value: 'Традиция за споделено хранене' },
      { label: 'Рамен', value: '73+ вида само в K-FOOD' },
    ],
    image: 'https://readdy.ai/api/search-image?query=Authentic%20Korean%20cuisine%20spread%20with%20kimchi%2C%20bibimbap%2C%20Korean%20BBQ%2C%20tteokbokki%2C%20various%20banchan%20side%20dishes%2C%20colorful%20traditional%20Korean%20food%20presentation%2C%20wooden%20table%20setting%2C%20appetizing%20food%20photography%2C%20rich%20flavors%20and%20textures&width=600&height=400&seq=korean-cuisine-001&orientation=landscape',
    imageAlt: 'Автентична корейска кухня',
  },
};

export default function KoreanCulture() {
  const [activeTab, setActiveTab] = useState<string>('K-pop');
  const current = CONTENT[activeTab as keyof typeof CONTENT];

  return (
    <section className="py-16 md:py-24 bg-white section-below-fold" id="korean-culture">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <div className="mb-10 md:mb-14">
          <p className="text-xs md:text-sm font-medium tracking-[0.2em] uppercase text-red-500 mb-3">
            Повече от храна
          </p>
          <h2 className="font-heading text-2xl md:text-4xl font-light text-gray-900 tracking-tight">
            Корейска Култура
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b-2 border-gray-100">
          {TABS.map((tab) => {
            const c = CONTENT[tab as keyof typeof CONTENT];
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-3 text-[13px] font-semibold tracking-wide uppercase transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-[2px] rounded-t-lg ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <i aria-hidden="true" className={`${c.icon} text-sm`}></i>
                {tab}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-100 bg-white rounded-xl overflow-hidden">
          {/* Image */}
          <div className="overflow-hidden bg-gray-50">
            <img
              src={current.image}
              alt={current.imageAlt}
              className="w-full h-full object-cover object-top transition-all duration-700"
              style={{ minHeight: '320px' }}
            />
          </div>

          {/* Text */}
          <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center mb-5">
              <i aria-hidden="true" className={`${current.icon} text-red-600 text-xl`}></i>
            </div>

            <h3 className="font-heading text-xl md:text-2xl font-light text-gray-900 mb-4 leading-snug tracking-tight">
              {current.title}
            </h3>
            <div className="w-10 h-[3px] bg-gradient-to-r from-red-500 to-red-600 rounded-full mb-5" />
            <p className="text-sm text-gray-600 leading-relaxed mb-7 font-light">
              {current.description}
            </p>

            {/* Facts */}
            <div className="space-y-2.5 mb-7">
              {current.facts.map((fact) => (
                <div key={fact.label} className="flex items-center gap-3 py-2.5 border-b border-gray-100">
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider whitespace-nowrap">{fact.label}</span>
                  <span className="text-gray-300 text-xs">/</span>
                  <span className="text-xs text-gray-500 font-light">{fact.value}</span>
                </div>
              ))}
            </div>

            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-red-600 uppercase tracking-wider hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Прочети повече в блога
              <i aria-hidden="true" className="ri-arrow-right-line"></i>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}