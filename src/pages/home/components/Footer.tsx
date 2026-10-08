import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-5">
              <img
                src="https://static.readdy.ai/image/658b459fcf05a7723f8029c45615de2f/5f528752b53eacb04e7b1d8959de8155.webp"
                alt="K-FOOD"
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-gray-400 text-xs mb-5 leading-relaxed font-light">
              Специализиран <strong className="text-red-400 font-medium">онлайн магазин за корейска храна, кухня и култура</strong> в България.
            </p>
            <div className="flex gap-2.5">
              <a href="https://www.facebook.com/profile.php?id=61556516122723" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all cursor-pointer">
                <i aria-hidden="true" className="ri-facebook-fill text-sm"></i>
              </a>
              <a href="https://www.instagram.com/kfood_veliko_tarnovo/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all cursor-pointer">
                <i aria-hidden="true" className="ri-instagram-line text-sm"></i>
              </a>
              <a href="https://www.tiktok.com/@kfoodveliko" target="_blank" rel="noopener noreferrer" className="w-9 h-9 border border-gray-700 rounded-lg flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all cursor-pointer">
                <i aria-hidden="true" className="ri-tiktok-line text-sm"></i>
              </a>
            </div>
          </div>

          {/* Корейска Храна */}
          <div>
            <h4 className="text-[11px] font-semibold text-red-400 uppercase tracking-[0.15em] mb-5">Корейска Храна</h4>
            <ul className="space-y-2.5">
              <li><Link to="/products" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Всички Продукти</Link></li>
              <li><Link to="/category/cosmetics" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light flex items-center gap-1.5">Корейска Козметика <span className="text-[9px] bg-pink-500 text-white px-1.5 py-0.5 rounded-full font-bold">NEW</span></Link></li>
              <li><Link to="/category/noodles" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Корейски Рамен и Нудъли</Link></li>
              <li><Link to="/category/sauces" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Корейски Сосове и Масла</Link></li>
              <li><Link to="/category/snacks" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Корейски Снакове и Чай</Link></li>
              <li><Link to="/categories" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Всички Категории</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Блог за Корейска Кухня</Link></li>
            </ul>
          </div>

          {/* Бързи Връзки */}
          <div>
            <h4 className="text-[11px] font-semibold text-red-400 uppercase tracking-[0.15em] mb-5">Бързи Връзки</h4>
            <ul className="space-y-2.5">
              <li><Link to="/b2b" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">B2B Дистрибуция</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">За Нас</Link></li>
              <li><Link to="/track-order" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Проследи Поръчка</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Въпроси и Отговори</Link></li>
            </ul>
          </div>

          {/* Информация */}
          <div>
            <h4 className="text-[11px] font-semibold text-red-400 uppercase tracking-[0.15em] mb-5">Информация</h4>
            <ul className="space-y-2.5">
              <li><Link to="/faq" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">FAQ</Link></li>
              <li><Link to="/shipping" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Доставка</Link></li>
              <li><Link to="/payment" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Плащане</Link></li>
              <li><Link to="/returns" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Връщане</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Поверителност</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">Условия</Link></li>
            </ul>
          </div>

          {/* Контакти */}
          <div>
            <h4 className="text-[11px] font-semibold text-red-400 uppercase tracking-[0.15em] mb-5">Контакти</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <i aria-hidden="true" className="ri-map-pin-line text-red-400 text-sm mt-0.5"></i>
                <span className="text-gray-400 text-xs font-light">ул. "Велчо Джамджията" 6, Велико Търново</span>
              </li>
              <li className="flex items-start gap-3">
                <i aria-hidden="true" className="ri-phone-line text-red-400 text-sm mt-0.5"></i>
                <a href="tel:+359899897566" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">0899 897 566</a>
              </li>
              <li className="flex items-start gap-3">
                <i aria-hidden="true" className="ri-mail-line text-red-400 text-sm mt-0.5"></i>
                <a href="mailto:kfoodtarnovo@gmail.com" className="text-gray-400 hover:text-red-400 transition-colors text-xs font-light">kfoodtarnovo@gmail.com</a>
              </li>
              <li className="flex items-start gap-3">
                <i aria-hidden="true" className="ri-time-line text-red-400 text-sm mt-0.5"></i>
                <span className="text-gray-400 text-xs font-light">Пон-Съб: 9:00 - 19:00</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-[11px] font-light">
            © 2025 K-FOOD — Онлайн Магазин за Корейска Храна в България.
          </p>
          <p className="text-gray-600 text-[11px] font-light">
            Сайтът е създаден от{' '}
            <a href="https://imashnujnoto.com/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 transition-colors underline underline-offset-2">
              Владимир Атанасов
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}