import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Document {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  visibility: string;
  tier_id: string | null;
  company_id: string | null;
  created_at: string;
}

interface Tier { id: string; name: string; }
interface Company { id: string; company_name: string; }

export default function AdminB2BDocumentsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'catalogue',
    visibility: 'all', tier_id: '', company_id: '',
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/login');
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, tiersRes, companiesRes] = await Promise.all([
        supabase.from('b2b_documents').select('*').order('created_at', { ascending: false }),
        supabase.from('b2b_pricing_tiers').select('id, name').order('sort_order'),
        supabase.from('b2b_companies').select('id, company_name').eq('status', 'active'),
      ]);
      if (docsRes.data) setDocuments(docsRes.data);
      if (tiersRes.data) setTiers(tiersRes.data);
      if (companiesRes.data) setCompanies(companiesRes.data);
    } catch { /* silently handle */ } finally { setLoading(false); }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !form.title) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const filePath = `b2b-documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadErr } = await supabase.storage.from('public').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('public').getPublicUrl(filePath);

      await supabase.from('b2b_documents').insert({
        title: form.title,
        description: form.description,
        file_url: urlData.publicUrl,
        file_type: ext.toLowerCase(),
        category: form.category,
        visibility: form.visibility,
        tier_id: form.visibility === 'tier' ? form.tier_id : null,
        company_id: form.visibility === 'company' ? form.company_id : null,
      });

      setForm({ title: '', description: '', category: 'catalogue', visibility: 'all', tier_id: '', company_id: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err: any) {
      alert('Грешка при качване: ' + (err.message || ''));
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm('Изтриване на документа?')) return;
    try {
      await supabase.from('b2b_documents').delete().eq('id', id);
      fetchData();
    } catch { alert('Грешка при изтриване.'); }
  };

  const categoryLabels: Record<string, string> = {
    catalogue: 'Каталог', price_list: 'Ценова листа', certificate: 'Сертификат',
    spec: 'Спецификация', marketing: 'Маркетинг', logo: 'Лого',
  };

  const visibilityLabels: Record<string, string> = {
    all: 'Всички', tier: 'По ниво', company: 'Конкретна компания',
  };

  const getTierName = (id: string | null) => tiers.find(t => t.id === id)?.name || '—';
  const getCompanyName = (id: string | null) => companies.find(c => c.id === id)?.company_name || '—';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Проверка на достъпа...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/admin/b2b" className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <i className="ri-arrow-left-line text-xl"></i>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">B2B Документи</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/b2b" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">B2B</Link>
              <Link to="/admin/b2b/pricing" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">Ценообразуване</Link>
              <Link to="/admin/b2b/documents" className="text-sm text-emerald-600 bg-emerald-50 font-semibold px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap">Документи</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Качи нов документ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Заглавие</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Ценова листа 2026" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Категория</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Видимост</label>
              <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value, tier_id: '', company_id: '' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                <option value="all">Всички партньори</option>
                <option value="tier">По ценово ниво</option>
                <option value="company">Конкретна компания</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Файл</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.png,.webp"
                className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
            </div>
          </div>
          {form.visibility === 'tier' && (
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Ценово ниво</label>
              <select value={form.tier_id} onChange={e => setForm(f => ({ ...f, tier_id: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                <option value="">Избери ниво</option>
                {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {form.visibility === 'company' && (
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Компания</label>
              <select value={form.company_id} onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white">
                <option value="">Избери компания</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          )}
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">Описание</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Описание на документа" />
          </div>
          <button onClick={handleUpload} disabled={uploading || !form.title}
            className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-semibold text-sm cursor-pointer disabled:cursor-not-allowed">
            {uploading ? <><i className="ri-loader-4-line animate-spin mr-1"></i> Качване...</> : <><i className="ri-upload-line mr-1"></i> Качи документ</>}
          </button>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Заглавие</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Категория</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Тип</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Видимост</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Дата</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center"><i className="ri-loader-4-line animate-spin text-emerald-600"></i></td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Няма качени документи</td></tr>
                ) : documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs">{doc.title}</p>
                      {doc.description && <p className="text-[10px] text-gray-400">{doc.description}</p>}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs">{categoryLabels[doc.category] || doc.category}</span></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-mono uppercase bg-gray-100 px-1.5 py-0.5 rounded">{doc.file_type}</span></td>
                    <td className="px-4 py-3 text-xs">
                      {doc.visibility === 'all' ? 'Всички' :
                       doc.visibility === 'tier' ? `Ниво: ${getTierName(doc.tier_id)}` :
                       `Компания: ${getCompanyName(doc.company_id)}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('bg-BG')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer" title="Изтегли">
                          <i className="ri-download-line"></i>
                        </a>
                        <button onClick={() => handleDelete(doc.id, doc.file_url)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" title="Изтрий">
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}