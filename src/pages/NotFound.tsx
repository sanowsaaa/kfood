
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { updateSEO } from '../utils/seo';

export default function NotFound() {
  useEffect(() => {
    updateSEO({
      title: 'Страницата не е намерена | K-FOOD Корейска храна',
      description: 'Търсената от вас страница не съществува. Разгледайте нашите корейски продукти и специалитети.',
      keywords: 'корейска храна, корейски продукти, 404 страница, K-FOOD Велико Търново',
      robots: 'noindex, follow'
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blush to-brand-blush">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center cursor-pointer">
              <img 
                src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp" 
                alt="K-FOOD Logo" 
                className="h-16 w-auto object-contain"
              />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-brand-primary font-semibold transition-colors cursor-pointer whitespace-nowrap">
                Начало
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-brand-primary font-semibold transition-colors cursor-pointer whitespace-nowrap">
                Продукти
              </Link>
              <Link to="/categories" className="text-gray-700 hover:text-brand-primary font-semibold transition-colors cursor-pointer whitespace-nowrap">
                Категории
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] px-4 text-center">
        {/* 404 Image */}
        <div className="mb-8">
          <img 
            src="https://readdy.ai/api/search-image?query=Korean%20food%20bowl%20illustration%20with%20sad%20chopsticks%20and%20empty%20plate%2C%20minimalist%20cute%20cartoon%20style%20with%20pastel%20colors%20and%20friendly%20design&width=400&height=300&seq=404&orientation=landscape"
            alt="404 Korean Food Illustration"
            className="w-80 h-60 object-cover rounded-2xl shadow-lg"
          />
        </div>

        {/* 404 Text */}
        <div className="text-center max-w-2xl">
          <h1 className="text-6xl md:text-8xl font-bold text-brand-primary mb-4">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Страницата не е намерена
          </h2>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Съжаляваме, но страницата която търсите не съществува или е преместена. 
            Можете да се върнете към началната страница или да разгледате нашите продукти.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/"
              className="bg-gradient-to-r from-brand-primary to-brand-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-brand-hover hover:to-brand-hover transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-home-line text-xl"></i>
              <span>Към началото</span>
            </Link>

            <Link
              to="/products"
              className="bg-white text-brand-primary border-2 border-brand-primary px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-blush transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-shopping-bag-line text-xl"></i>
              <span>Всички продукти</span>
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16 max-w-4xl w-full">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Популярни страници
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Categories */}
            <Link
              to="/categories"
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-brand-primary to-brand-primary rounded-lg flex items-center justify-center">
                  <i className="ri-grid-line text-2xl text-white"></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Категории</h4>
                  <p className="text-gray-600 text-sm">Разгледайте по категории</p>
                </div>
              </div>
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <i className="ri-shopping-cart-line text-2xl text-white"></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Кошница</h4>
                  <p className="text-gray-600 text-sm">Вашите продукти</p>
                </div>
              </div>
            </Link>

            {/* Contact */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <i className="ri-mail-line text-2xl text-white"></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Контакти</h4>
                  <p className="text-gray-600 text-sm">kfoodtarnovo@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center text-gray-500">
          <p className="mb-2">🇰🇷 Автентична корейска храна във Велико Търново</p>
          <p>Телефон: 0899897566 • Email: kfoodtarnovo@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
