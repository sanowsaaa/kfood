import { Link } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';

export default function B2BFooter() {
  const { company } = useB2B();

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <i className="ri-building-2-line text-emerald-600 text-sm"></i>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">B2B Портал &copy; {new Date().getFullYear()}</p>
              <p className="text-[10px] text-gray-400">K-FOOD Wholesale Distribution</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs min-w-0">
            <Link to="/b2b/dashboard" className="hover:text-emerald-600 transition-colors">Табло</Link>
            <Link to="/b2b/products" className="hover:text-emerald-600 transition-colors">Продукти</Link>
            {company && (
              <span className="text-gray-300">|</span>
            )}
            {company && (
              <span className="text-gray-500 break-words max-w-full">{company.company_name}</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
