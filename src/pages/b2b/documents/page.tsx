import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/utils/supabase';
import { useB2B } from '@/contexts/B2BContext';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

interface Document {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  created_at: string;
}

export default function B2BDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { companyId, company, sessionLoading } = useB2B();
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    fetchDocs();
  }, [companyId]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let query = supabase.from('b2b_documents').select('*').order('created_at', { ascending: false });

      if (company?.pricing_tier_id) {
        query = query.or(`visibility.eq.all,and(visibility.eq.tier,tier_id.eq.${company.pricing_tier_id}),and(visibility.eq.company,company_id.eq.${companyId})`);
      } else {
        query = query.or(`visibility.eq.all,and(visibility.eq.company,company_id.eq.${companyId})`);
      }

      const { data } = await query;
      setDocuments(data || []);
    } catch { /* silently handle */ } finally { setLoading(false); }
  };

  const categoryLabels: Record<string, string> = {
    catalogue: 'Каталог', price_list: 'Ценова листа', certificate: 'Сертификат',
    spec: 'Спецификация', marketing: 'Маркетинг', logo: 'Лого',
  };

  const filteredDocs = activeCategory ? documents.filter(d => d.category === activeCategory) : documents;
  const categories = [...new Set(documents.map(d => d.category))];

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <i className="ri-lock-line text-4xl text-gray-300 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Не сте влезли в портала</h2>
          <Link to="/login" className="text-emerald-600 hover:underline font-medium text-sm">Вход в портала</Link>
        </div>
        <B2BFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/b2b/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm mb-4 transition-colors cursor-pointer">
            <i className="ri-arrow-left-line"></i> Обратно към таблото
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 font-heading">Документи</h1>
          <p className="text-gray-500 text-sm mt-1">Ценови листи, каталози, сертификати и маркетинг материали</p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-16"><i className="ri-loader-4-line text-3xl text-emerald-600 animate-spin"></i></div>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <button onClick={() => setActiveCategory('')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${!activeCategory ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>
                  Всички
                </button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${activeCategory === cat ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'}`}>
                    {categoryLabels[cat] || cat}
                  </button>
                ))}
              </div>
            )}

            {filteredDocs.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <i className="ri-folder-open-line text-4xl text-gray-300 mb-4"></i>
                <p className="text-gray-500">Няма налични документи</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-300 transition-all group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 transition-colors">
                        <i className={`${doc.file_type === 'pdf' ? 'ri-file-pdf-line' : doc.file_type.includes('xls') ? 'ri-file-excel-2-line' : 'ri-file-line'} text-emerald-600 text-xl group-hover:text-white transition-colors`}></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">{doc.title}</h3>
                        {doc.description && <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{categoryLabels[doc.category] || doc.category}</span>
                          <span className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString('bg-BG')}</span>
                        </div>
                      </div>
                      <div className="p-2 text-gray-400 group-hover:text-emerald-600 transition-colors">
                        <i className="ri-download-line"></i>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <B2BFooter />
    </div>
  );
}