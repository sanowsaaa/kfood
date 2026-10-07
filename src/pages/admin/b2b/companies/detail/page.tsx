import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface Company {
  id: string;
  company_name: string;
  bulstat: string;
  vat_number: string;
  mol: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  business_type: string;
  years_in_business: number;
  number_of_locations: number;
  estimated_monthly_value: string;
  status: string;
  pricing_tier_id: string;
  global_discount: number;
  credit_limit: number;
  sales_rep_id: string;
  internal_notes: string;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  mobile: string;
  is_primary: boolean;
}

interface Address {
  id: string;
  type: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface Tier {
  id: string;
  name: string;
}

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string>('');

  const [editData, setEditData] = useState<Partial<Company>>({});
  const [newContact, setNewContact] = useState({ first_name: '', last_name: '', position: '', email: '', mobile: '' });
  const [newAddress, setNewAddress] = useState({ type: 'shipping', address: '', city: '', postal_code: '', country: 'България' });

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/login');
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin && id) fetchCompany();
  }, [isAdmin, id]);

  const fetchCompany = async () => {
    setLoading(true);
    try {
      const [compRes, contactsRes, addressesRes, tiersRes] = await Promise.all([
        supabase.from('b2b_companies').select('*').eq('id', id).single(),
        supabase.from('b2b_company_contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }),
        supabase.from('b2b_company_addresses').select('*').eq('company_id', id).order('is_default', { ascending: false }),
        supabase.from('b2b_pricing_tiers').select('id, name').order('sort_order'),
      ]);
      if (compRes.data) {
        setCompany(compRes.data);
        setEditData(compRes.data);
      }
      if (contactsRes.data) setContacts(contactsRes.data);
      if (addressesRes.data) setAddresses(addressesRes.data);
      if (tiersRes.data) setTiers(tiersRes.data);
    } catch { /* silently handle */ } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await supabase.from('b2b_companies').update(editData).eq('id', company.id);
      setEditingSection('');
      fetchCompany();
    } catch { alert('Грешка при запис.'); } finally { setSaving(false); }
  };

  const handleAddContact = async () => {
    if (!company || !newContact.first_name) return;
    try {
      await supabase.from('b2b_company_contacts').insert({ company_id: company.id, ...newContact });
      setNewContact({ first_name: '', last_name: '', position: '', email: '', mobile: '' });
      fetchCompany();
    } catch { alert('Грешка при добавяне.'); }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Изтриване на контакт?')) return;
    await supabase.from('b2b_company_contacts').delete().eq('id', contactId);
    fetchCompany();
  };

  const handleAddAddress = async () => {
    if (!company || !newAddress.address) return;
    try {
      await supabase.from('b2b_company_addresses').insert({ company_id: company.id, ...newAddress });
      setNewAddress({ type: 'shipping', address: '', city: '', postal_code: '', country: 'България' });
      fetchCompany();
    } catch { alert('Грешка при добавяне.'); }
  };

  const handleDeleteAddress = async (addrId: string) => {
    if (!confirm('Изтриване на адрес?')) return;
    await supabase.from('b2b_company_addresses').delete().eq('id', addrId);
    fetchCompany();
  };

  const businessTypeLabels: Record<string, string> = {
    restaurant: 'Ресторант', asian_store: 'Азиатски магазин', supermarket: 'Супермаркет',
    distributor: 'Дистрибутор', wholesaler: 'Търговец на едро', online_shop: 'Онлайн магазин',
    hotel: 'Хотел', cafe: 'Кафене', retail_store: 'Магазин', other: 'Друг',
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Зареждане...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !company) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/admin/b2b" className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <i className="ri-arrow-left-line text-xl"></i>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">{company.company_name}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                company.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {company.status === 'active' ? 'Активен' : 'Суспендиран'}
              </span>
            </div>
            <Link to="/admin/b2b" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">
              Обратно към B2B
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Company Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <SectionCard title="Информация за компанията" icon="ri-building-2-line"
              editing={editingSection === 'company'}
              onEdit={() => setEditingSection('company')}
              onCancel={() => { setEditingSection(''); setEditData(company); }}
              onSave={handleSave} saving={saving}>
              {editingSection === 'company' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Име" value={editData.company_name || ''} onChange={v => setEditData(d => ({ ...d, company_name: v }))} />
                  <Field label="БУЛСТАТ" value={editData.bulstat || ''} onChange={v => setEditData(d => ({ ...d, bulstat: v }))} />
                  <Field label="ДДС номер" value={editData.vat_number || ''} onChange={v => setEditData(d => ({ ...d, vat_number: v }))} />
                  <Field label="МОЛ" value={editData.mol || ''} onChange={v => setEditData(d => ({ ...d, mol: v }))} />
                  <Field label="Телефон" value={editData.phone || ''} onChange={v => setEditData(d => ({ ...d, phone: v }))} />
                  <Field label="Email" value={editData.email || ''} onChange={v => setEditData(d => ({ ...d, email: v }))} />
                  <Field label="Уебсайт" value={editData.website || ''} onChange={v => setEditData(d => ({ ...d, website: v }))} />
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Бизнес тип</label>
                    <input value={editData.business_type || ''} onChange={e => setEditData(d => ({ ...d, business_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <Field label="Град" value={editData.city || ''} onChange={v => setEditData(d => ({ ...d, city: v }))} />
                  <Field label="Години в бизнеса" value={editData.years_in_business?.toString() || ''} onChange={v => setEditData(d => ({ ...d, years_in_business: parseInt(v) || 0 }))} />
                  <Field label="Брой локации" value={editData.number_of_locations?.toString() || '1'} onChange={v => setEditData(d => ({ ...d, number_of_locations: parseInt(v) || 1 }))} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <ReadField label="Име" value={company.company_name} />
                  <ReadField label="БУЛСТАТ" value={company.bulstat || '—'} />
                  <ReadField label="ДДС" value={company.vat_number || '—'} />
                  <ReadField label="МОЛ" value={company.mol || '—'} />
                  <ReadField label="Телефон" value={company.phone} />
                  <ReadField label="Email" value={company.email} />
                  <ReadField label="Уебсайт" value={company.website || '—'} />
                  <ReadField label="Тип" value={businessTypeLabels[company.business_type] || company.business_type} />
                  <ReadField label="Град" value={company.city} />
                  <ReadField label="Години" value={company.years_in_business ? `${company.years_in_business}` : '—'} />
                  <ReadField label="Локации" value={`${company.number_of_locations || 1}`} />
                </div>
              )}
            </SectionCard>

            {/* Addresses */}
            <SectionCard title="Адреси" icon="ri-map-pin-line">
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div key={addr.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">{addr.type}</span>
                        {addr.is_default && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Default</span>}
                      </div>
                      <p className="text-sm text-gray-900 mt-0.5">{addr.address}, {addr.city} {addr.postal_code}, {addr.country}</p>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><i className="ri-close-line"></i></button>
                  </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <input value={newAddress.address} onChange={e => setNewAddress(a => ({ ...a, address: e.target.value }))}
                    placeholder="Адрес" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newAddress.city} onChange={e => setNewAddress(a => ({ ...a, city: e.target.value }))}
                    placeholder="Град" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newAddress.postal_code} onChange={e => setNewAddress(a => ({ ...a, postal_code: e.target.value }))}
                    placeholder="Пощенски код" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <button onClick={handleAddAddress}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer">Добави</button>
                </div>
              </div>
            </SectionCard>

            {/* Internal Notes */}
            <SectionCard title="Вътрешни бележки" icon="ri-sticky-note-line"
              editing={editingSection === 'notes'}
              onEdit={() => setEditingSection('notes')}
              onCancel={() => { setEditingSection(''); setEditData(company); }}
              onSave={handleSave} saving={saving}>
              {editingSection === 'notes' ? (
                <textarea value={editData.internal_notes || ''} onChange={e => setEditData(d => ({ ...d, internal_notes: e.target.value }))}
                  rows={4} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Само за администратори..." />
              ) : (
                <p className="text-sm text-gray-600">{company.internal_notes || 'Няма бележки'}</p>
              )}
            </SectionCard>
          </div>

          {/* Right: Pricing & Contacts */}
          <div className="space-y-6">
            {/* Pricing */}
            <SectionCard title="Ценообразуване" icon="ri-price-tag-3-line"
              editing={editingSection === 'pricing'}
              onEdit={() => setEditingSection('pricing')}
              onCancel={() => { setEditingSection(''); setEditData(company); }}
              onSave={handleSave} saving={saving}>
              {editingSection === 'pricing' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Ценово ниво</label>
                    <select value={editData.pricing_tier_id || ''} onChange={e => setEditData(d => ({ ...d, pricing_tier_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer">
                      <option value="">Без ниво</option>
                      {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Глобална отстъпка (%)</label>
                    <input type="number" min="0" max="100" value={editData.global_discount || 0}
                      onChange={e => setEditData(d => ({ ...d, global_discount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Кредитен лимит (€)</label>
                    <input type="number" min="0" value={editData.credit_limit || 0}
                      onChange={e => setEditData(d => ({ ...d, credit_limit: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <ReadField label="Ценово ниво" value={tiers.find(t => t.id === company.pricing_tier_id)?.name || 'Без ниво'} />
                  <ReadField label="Отстъпка" value={`${company.global_discount || 0}%`} />
                  <ReadField label="Кредитен лимит" value={company.credit_limit ? `${company.credit_limit} €` : 'Неограничен'} />
                </div>
              )}
            </SectionCard>

            {/* Contacts */}
            <SectionCard title="Контактни лица" icon="ri-contacts-line">
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{c.first_name} {c.last_name}</span>
                        {c.is_primary && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Основен</span>}
                      </div>
                      <p className="text-xs text-gray-500">{c.position || ''}</p>
                      <p className="text-xs text-gray-500">{c.email} {c.mobile ? `· ${c.mobile}` : ''}</p>
                    </div>
                    <button onClick={() => handleDeleteContact(c.id)}
                      className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><i className="ri-close-line"></i></button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <input value={newContact.first_name} onChange={e => setNewContact(c => ({ ...c, first_name: e.target.value }))}
                    placeholder="Име" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newContact.last_name} onChange={e => setNewContact(c => ({ ...c, last_name: e.target.value }))}
                    placeholder="Фамилия" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newContact.position} onChange={e => setNewContact(c => ({ ...c, position: e.target.value }))}
                    placeholder="Длъжност" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))}
                    placeholder="Email" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input value={newContact.mobile} onChange={e => setNewContact(c => ({ ...c, mobile: e.target.value }))}
                    placeholder="Телефон" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <button onClick={handleAddContact}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer">Добави</button>
                </div>
              </div>
            </SectionCard>

            {/* Info */}
            <SectionCard title="Информация" icon="ri-information-line">
              <div className="space-y-2 text-sm">
                <ReadField label="Създаден" value={new Date(company.created_at).toLocaleDateString('bg-BG')} />
                <ReadField label="Очаквана месечна стойност" value={company.estimated_monthly_value || '—'} />
              </div>
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({ title, icon, children, editing, onEdit, onCancel, onSave, saving }: {
  title: string; icon: string; children: React.ReactNode;
  editing?: boolean; onEdit?: () => void; onCancel?: () => void; onSave?: () => void; saving?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
          <i className={`${icon} text-emerald-600`}></i> {title}
        </h3>
        {onEdit && (
          editing ? (
            <div className="flex gap-1.5">
              <button onClick={onSave} disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">
                {saving ? '...' : 'Запази'}
              </button>
              <button onClick={onCancel}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs cursor-pointer">Отказ</button>
            </div>
          ) : (
            <button onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer">
              <i className="ri-edit-line"></i>
            </button>
          )
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-0.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}