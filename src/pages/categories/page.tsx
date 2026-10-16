import { Link, useNavigate } from 'react-router-dom';
import { useState, useLayoutEffect } from 'react';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import AboutSection from '../home/components/AboutSection';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';
import { loadCategoryCounts } from '../../utils/catalog';
import { useCustomerRead } from '../../hooks/useCustomerRead';
import AgeVerification from '../../components/AgeVerification';
import cosmeticsBanner from '../../assets/categories/k-food-cosmetics.webp';
import noodlesBanner from '../../assets/categories/k-food-noodles.webp';
import cookingBanner from '../../assets/categories/k-food-cooking.webp';
import dessertsBanner from '../../assets/categories/k-food-desserts.webp';
import saucesBanner from '../../assets/categories/k-food-sauces.webp';
import frozenBanner from '../../assets/categories/k-food-frozen.webp';
import drinksBanner from '../../assets/categories/k-food-drinks.webp';
import nonFoodBanner from '../../assets/categories/k-food-non-food.webp';
import snacksBanner from '../../assets/categories/k-food-snacks.webp';
import alcoholBanner from '../../assets/categories/k-food-alcohol.webp';

const categoryData = [
  {
    id: 'cosmetics',
    name: 'Корейска козметика',
    description: 'K-beauty продукти — грижа за кожата, маски, серуми и корейски козметични иновации',
    image: cosmeticsBanner,
    productCount: 0,
    isNew: true
  },
  {
    id: 'noodles',
    name: 'Нудъли и Рамен',
    description: 'Автентични корейски нудъли и рамен за бързо и вкусно ястие',
    image: noodlesBanner,
    productCount: 39
  },
  {
    id: 'cooking',
    name: 'Продукти за готвене',
    description: 'Оризи, брашна, сосове и всичко необходимо за корейска кухня',
    image: cookingBanner,
    productCount: 42
  },
  {
    id: 'desserts',
    name: 'Десерти',
    description: 'Популярни корейски сладкиши, бисквити и десерти',
    image: dessertsBanner,
    productCount: 34
  },
  {
    id: 'sauces',
    name: 'Сосове и Масла',
    description: 'Оригинални корейски сосове и масла за автентичен вкус',
    image: saucesBanner,
    productCount: 30
  },
  {
    id: 'frozen',
    name: 'Замразени продукти',
    description: 'Манду, кнедли и други замразени корейски специалитети',
    image: frozenBanner,
    productCount: 31
  },
  {
    id: 'drinks',
    name: 'Напитки',
    description: 'Освежаващи корейски напитки, сокове и традиционни чайове',
    image: drinksBanner,
    productCount: 47
  },
  {
    id: 'non-food',
    name: 'Нехранителни стоки',
    description: 'Кухненски принадлежности и аксесоари за корейска кухня',
    image: nonFoodBanner,
    productCount: 4
  },
  {
    id: 'snacks',
    name: 'Снакс и Чай',
    description: 'Чипсове, чайове и лекки закуски за всеки момент',
    image: snacksBanner,
    productCount: 10
  },
  {
    id: 'alcohol',
    name: 'Алкохол',
    description: 'Корейско соджу с различни вкусове - само за лица над 18 години',
    image: alcoholBanner,
    productCount: 6,
    requiresAge: true
  }
];

export default function Categories() {
  const navigate = useNavigate();
  const { data: counts, loading, error } = useCustomerRead(loadCategoryCounts, {});
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useSEO({
    title: 'Категории Корейска Храна | Рамен, Кимчи, Токбоки - K-FOOD Онлайн',
    description: 'Всички категории корейска храна на едно място. Корейски рамен Samyang и Nongshim, кимчи, токбоки, корейски сосове гочуджанг, снакове, напитки и замразени деликатеси. Онлайн корейски магазин с доставка в България.',
    keywords: 'категории корейска храна, корейски рамен категории, кимчи онлайн, токбоки купи, гочуджанг сос, корейски снакове категории, корейски напитки, замразени корейски продукти, корейски десерти, соджу, корейски сосове онлайн, Samyang категории, Nongshim продукти',
    canonical: '/categories',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'Категории Корейска Храна', url: '/categories' }
        ]),
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Категории Корейска Храна - K-FOOD',
          description: 'Пълен списък с категории автентична корейска храна',
          numberOfItems: categoryData.length,
          itemListElement: categoryData.map((cat, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: cat.name,
            url: `https://k-foodvelikotarnovo.com/category/${cat.id}`
          }))
        }
      ]
    }
  });

  const handleCategoryClick = (category: typeof categoryData[0], e: React.MouseEvent) => {
    if (category.requiresAge) {
      let ageVerified = false;
      try { ageVerified = sessionStorage.getItem('ageVerified') === 'true'; } catch { /* Require confirmation. */ }
      if (!ageVerified) {
        e.preventDefault();
        setSelectedCategory(category.id);
        setShowAgeVerification(true);
      }
    }
  };

  const handleAgeVerified = () => {
    setShowAgeVerification(false);
    if (selectedCategory) navigate(`/category/${selectedCategory}`);
    setSelectedCategory(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-hover text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 id="main-content" tabIndex={-1} className="text-4xl md:text-5xl font-bold mb-4">Категории Корейска Храна</h1>
          <p className="text-xl text-brand-petal max-w-2xl mx-auto mb-3">
            Онлайн магазин за корейски продукти — рамен, кимчи, токбоки, сосове и още
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Корейски Рамен', 'Кимчи', 'Токбоки', 'Гочуджанг', 'Корейски Снакове', 'Соджу'].map(tag => (
              <span key={tag} className="bg-white/20 text-white text-sm px-3 py-1 rounded-full border border-white/30 whitespace-nowrap">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categoryData.map((category, index) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              onClick={(e) => handleCategoryClick(category, e)}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
            >
              <div className="aspect-video bg-brand-blush">
                <img
                  src={category.image}
                  alt={category.name}
                  width={1920}
                  height={1080}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="block w-full h-full object-contain"
                />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="min-w-0 text-xl font-bold text-gray-900">{category.name}</h2>
                  {category.requiresAge && (
                    <span className="shrink-0 bg-brand-primary text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <i aria-hidden="true" className="ri-error-warning-line"></i>
                      18+
                    </span>
                  )}
                  {category.isNew && (
                    <span className="shrink-0 bg-brand-primary text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <i aria-hidden="true" className="ri-sparkling-line"></i>
                      NEW
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                  <i aria-hidden="true" className="ri-shopping-bag-line"></i>
                  {loading || error ? 'Разгледай продуктите' : `${counts[category.name] || 0} продукта`}
                </p>
                <p className="text-gray-600 mb-4 line-clamp-2">{category.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-brand-primary font-semibold group-hover:text-brand-hover flex items-center gap-2 whitespace-nowrap">
                    Разгледай продуктите
                    <i aria-hidden="true" className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 bg-brand-blush rounded-2xl p-8 text-center">
          <div className="max-w-3xl mx-auto">
            <i aria-hidden="true" className="ri-information-line text-4xl text-brand-primary mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Не намирате това, което търсите?</h2>
            <p className="text-gray-600 mb-6">
              Разгледайте всички наши продукти или се свържете с нас за специални поръчки
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/products"
                className="bg-brand-primary text-white px-8 py-3 rounded-full font-semibold hover:bg-brand-hover transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i aria-hidden="true" className="ri-grid-line"></i>
                Всички продукти
              </Link>
              <a
                href="tel:+359899897566"
                className="bg-white text-brand-primary px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors border-2 border-brand-primary flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <i aria-hidden="true" className="ri-phone-line"></i>
                Свържете се с нас
              </a>
            </div>
          </div>
        </div>
      </div>

      <AboutSection />
      
      <Footer />

      {showAgeVerification && (
        <AgeVerification onVerified={handleAgeVerified} onDenied={() => { setShowAgeVerification(false); setSelectedCategory(null); }} />
      )}
    </div>
  );
}
