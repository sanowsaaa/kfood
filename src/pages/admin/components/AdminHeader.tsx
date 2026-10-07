import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';

export default function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isOrdersPage = location.pathname === '/admin/orders';
  const isProductsPage = location.pathname === '/admin';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900">Администрация</h1>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => navigate('/admin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isProductsPage
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-shopping-bag-line mr-2"></i>
                Продукти
              </button>
              <button
                onClick={() => navigate('/admin/orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isOrdersPage
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <i className="ri-file-list-3-line mr-2"></i>
                Поръчки
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              <i className="ri-home-line mr-2"></i>
              Към сайта
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium whitespace-nowrap"
            >
              <i className="ri-logout-box-line mr-2"></i>
              Изход
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
