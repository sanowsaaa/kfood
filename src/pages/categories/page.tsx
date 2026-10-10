import { Link, useNavigate } from 'react-router-dom';
import { useState, useLayoutEffect } from 'react';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import AboutSection from '../home/components/AboutSection';
import { useSEO, getBreadcrumbSchema } from '../../utils/seo';
import { loadProducts } from '../../utils/catalog';
import { useCustomerRead } from '../../hooks/useCustomerRead';
import AgeVerification from '../../components/AgeVerification';

const categoryData = [
  {
    id: 'cosmetics',
    name: 'Корейска козметика',
    description: 'K-beauty продукти — грижа за кожата, маски, серуми и корейски козметични иновации',
    image: 'https://readdy.ai/api/search-image?query=Korean%20beauty%20skincare%20products%20K-beauty%20sheet%20masks%20serums%20creams%20arranged%20on%20clean%20white%20marble%20surface%20professional%20product%20photography%20minimalist%20composition%20elegant%20Korean%20cosmetics%20with%20soft%20pink%20and%20white%20tones%20luxurious%20skincare&width=600&height=600&seq=cat-cosmetics-001&orientation=squarish',
    productCount: 0,
    isNew: true
  },
  {
    id: 'noodles',
    name: 'Нудъли и Рамен',
    description: 'Автентични корейски нудъли и рамен за бързо и вкусно ястие',
    image: 'https://readdy.ai/api/search-image?query=Korean%20instant%20noodles%20ramyeon%20packages%20variety%20colorful%20packaging%20Korean%20ramen%20bowls%20on%20clean%20white%20background%20professional%20product%20photography%20minimalist%20style%20authentic%20Korean%20noodle%20products&width=600&height=600&seq=cat-noodles-002&orientation=squarish',
    productCount: 39
  },
  {
    id: 'cooking',
    name: 'Продукти за готвене',
    description: 'Оризи, брашна, сосове и всичко необходимо за корейска кухня',
    image: 'https://readdy.ai/api/search-image?query=Korean%20cooking%20ingredients%20rice%20flour%20sauces%20oils%20arranged%20on%20clean%20white%20marble%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20pantry%20essentials&width=600&height=600&seq=cat-cooking-003&orientation=squarish',
    productCount: 42
  },
  {
    id: 'desserts',
    name: 'Десерти',
    description: 'Популярни корейски сладкиши, бисквити и десерти',
    image: 'https://readdy.ai/api/search-image?query=Korean%20snacks%20and%20sweets%20colorful%20packaging%20rice%20cakes%20tteok%20Korean%20candies%20chips%20arranged%20beautifully%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20treats&width=600&height=600&seq=cat-snacks-004&orientation=squarish',
    productCount: 34
  },
  {
    id: 'sauces',
    name: 'Сосове и Масла',
    description: 'Оригинални корейски сосове и масла за автентичен вкус',
    image: 'https://readdy.ai/api/search-image?query=Korean%20sauces%20and%20condiments%20gochujang%20doenjang%20soy%20sauce%20sesame%20oil%20in%20traditional%20bottles%20and%20jars%20arranged%20on%20white%20marble%20surface%20clean%20background%20professional%20product%20photography%20authentic%20Korean%20cooking%20ingredients&width=600&height=600&seq=cat-sauces-005&orientation=squarish',
    productCount: 30
  },
  {
    id: 'frozen',
    name: 'Замразени продукти',
    description: 'Манду, кнедли и други замразени корейски специалитети',
    image: 'https://readdy.ai/api/search-image?query=Korean%20frozen%20food%20dumplings%20mandu%20rice%20cakes%20tteokbokki%20in%20packaging%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20frozen%20products&width=600&height=600&seq=cat-frozen-006&orientation=squarish',
    productCount: 31
  },
  {
    id: 'drinks',
    name: 'Напитки',
    description: 'Освежаващи корейски напитки, сокове и традиционни чайове',
    image: 'https://readdy.ai/api/search-image?query=Korean%20beverages%20drinks%20tea%20bottles%20cans%20traditional%20Korean%20drinks%20barley%20tea%20sikhye%20arranged%20on%20clean%20white%20background%20professional%20product%20photography%20minimalist%20style%20authentic%20Korean%20beverages&width=600&height=600&seq=cat-drinks-007&orientation=squarish',
    productCount: 47
  },
  {
    id: 'non-food',
    name: 'Нехранителни стоки',
    description: 'Кухненски принадлежности и аксесоари за корейска кухня',
    image: 'https://readdy.ai/api/search-image?query=Korean%20kitchen%20utensils%20chopsticks%20bamboo%20tools%20cooking%20accessories%20arranged%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20kitchenware&width=600&height=600&seq=cat-nonfood-008&orientation=squarish',
    productCount: 4
  },
  {
    id: 'snacks',
    name: 'Снакс и Чай',
    description: 'Чипсове, чайове и лекки закуски за всеки момент',
    image: 'https://readdy.ai/api/search-image?query=Korean%20tea%20bags%20and%20snack%20chips%20arranged%20beautifully%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20tea%20and%20light%20snacks&width=600&height=600&seq=cat-snackstea-009&orientation=squarish',
    productCount: 10
  },
  {
    id: 'alcohol',
    name: 'Алкохол',
    description: 'Корейско соджу с различни вкусове - само за лица над 18 години',
    image: 'https://readdy.ai/api/search-image?query=Korean%20soju%20bottles%20with%20fruit%20flavors%20colorful%20packaging%20plum%20lemon%20peach%20grapefruit%20grape%20strawberry%20arranged%20on%20clean%20white%20surface%20professional%20product%20photography%20minimalist%20composition%20authentic%20Korean%20alcoholic%20beverages&width=600&height=600&seq=cat-alcohol-010&orientation=squarish',
    productCount: 6,
    requiresAge: true
  }
];

export default function Categories() {
  const navigate = useNavigate();
  const { data: products, loading, error } = useCustomerRead(loadProducts, []);
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
          {categoryData.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              onClick={(e) => handleCategoryClick(category, e)}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                {category.requiresAge && (
                  <div className="absolute top-4 right-4 bg-brand-primary text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <i aria-hidden="true" className="ri-error-warning-line"></i>
                    18+
                  </div>
                )}
                {category.isNew && (
                  <div className="absolute top-4 right-4 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 animate-pulse-slow">
                    <i aria-hidden="true" className="ri-sparkling-line"></i>
                    NEW
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white mb-1">{category.name}</h3>
                  <p className="text-sm text-white/90 flex items-center gap-2">
                    <i aria-hidden="true" className="ri-shopping-bag-line"></i>
                    {loading || error ? 'Разгледай продуктите' : `${products.filter(p => p.category === category.name).length} продукта`}
                  </p>
                </div>
              </div>
              
              <div className="p-6">
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
                href="tel:+359123456789"
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
