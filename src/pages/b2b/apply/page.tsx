import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSEO, getBreadcrumbSchema } from '@/utils/seo';
import Header from '@/pages/home/components/Header';
import Footer from '@/pages/home/components/Footer';
import { supabase } from '@/utils/supabase';

export default function B2BApplyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const topRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    bulstat: '',
    vat_number: '',
    mol: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'България',
    phone: '',
    email: '',
    website: '',
    contact_first_name: '',
    contact_last_name: '',
    contact_position: '',
    contact_mobile: '',
    contact_email: '',
    business_type: '',
    years_in_business: '',
    number_of_locations: '1',
    estimated_monthly_value: '',
    estimated_monthly_volume: '',
    existing_brands: '',
    imports_products: false,
    requires_pallets: false,
    additional_notes: '',
    accept_terms: false,
    accept_privacy: false,
    confirm_accurate: false,
  });

  useSEO({
    title: 'Кандидатствайте за B2B Партньорство | K-FOOD Wholesale',
    description: 'Попълнете формата за B2B партньорство с K-FOOD. Ексклузивни цени на едро, личен мениджър и приоритетна доставка за вашия бизнес.',
    keywords: 'B2B апликация, партньорство, търговия на едро, кандидатстване, wholesale application',
    canonical: '/b2b/apply',
    ogType: 'website',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        getBreadcrumbSchema([
          { name: 'Начало', url: '/' },
          { name: 'B2B Партньорство', url: '/b2b' },
          { name: 'Кандидатстване', url: '/b2b/apply' },
        ]),
      ],
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    setError('');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStep(s => Math.min(s + 1, 4));
  };

  const goPrev = () => {
    setError('');
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setError('');
    if (!formData.accept_terms || !formData.accept_privacy || !formData.confirm_accurate) {
      setError('Моля, приемете всички условия и потвърдете точността на информацията.');
      return;
    }

    setSubmitting(true);
    try {
      // Check how many applications exist for this email (uses RPC to bypass RLS)
      const userEmail = formData.contact_email || formData.email;
      const { data: appCount, error: countError } = await supabase
        .rpc('check_b2b_application_limit', { user_email: userEmail });

      if (countError) {
        setError('Грешка при проверка на заявките. Моля, опитайте отново.');
        setSubmitting(false);
        return;
      }

      if (typeof appCount === 'number' && appCount >= 5) {
        setError('Достигнали сте лимита от 5 заявки за този имейл адрес. Моля, свържете се с нас за допълнителна информация.');
        setSubmitting(false);
        return;
      }

      const payload = {
        company_name: formData.company_name,
        bulstat: formData.bulstat,
        vat_number: formData.vat_number,
        mol: formData.mol,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        contact_first_name: formData.contact_first_name,
        contact_last_name: formData.contact_last_name,
        contact_position: formData.contact_position,
        contact_mobile: formData.contact_mobile,
        contact_email: formData.contact_email,
        business_type: formData.business_type,
        years_in_business: formData.years_in_business ? parseInt(formData.years_in_business) : null,
        number_of_locations: formData.number_of_locations ? parseInt(formData.number_of_locations) : 1,
        estimated_monthly_value: formData.estimated_monthly_value,
        estimated_monthly_volume: formData.estimated_monthly_volume,
        existing_brands: formData.existing_brands,
        imports_products: formData.imports_products,
        requires_pallets: formData.requires_pallets,
        additional_notes: formData.additional_notes,
        accept_terms: formData.accept_terms,
        accept_privacy: formData.accept_privacy,
        confirm_accurate: formData.confirm_accurate,
        status: 'pending',
      };

      const { error: insertError } = await supabase.from('b2b_applications').insert(payload);
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Грешка при изпращане. Моля, опитайте отново.');
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = formData.company_name && formData.email && formData.phone && formData.city;
  const isStep2Valid = formData.contact_first_name && formData.contact_last_name && formData.contact_mobile;
  const isStep3Valid = formData.business_type;

  const businessTypes = [
    { value: 'restaurant', label: 'Ресторант' },
    { value: 'asian_store', label: 'Азиатски магазин' },
    { value: 'supermarket', label: 'Супермаркет' },
    { value: 'distributor', label: 'Дистрибутор' },
    { value: 'wholesaler', label: 'Търговец на едро' },
    { value: 'online_shop', label: 'Онлайн магазин' },
    { value: 'hotel', label: 'Хотел' },
    { value: 'cafe', label: 'Кафене' },
    { value: 'retail_store', label: 'Магазин на дребно' },
    { value: 'other', label: 'Друг' },
  ];

  const steps = [
    { num: 1, label: 'Компания' },
    { num: 2, label: 'Контакт' },
    { num: 3, label: 'Бизнес' },
    { num: 4, label: 'Потвърждение' },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-check-line text-emerald-600 text-4xl"></i>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 font-heading">
            Благодарим ви за кандидатстването!
          </h1>
          <p className="text-gray-600 text-lg mb-4 leading-relaxed">
            Вашата апликация е получена и е в статус <strong className="text-amber-600">Изчаква одобрение</strong>.
          </p>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Нашият екип ще прегледа информацията за вашата компания и ще се свърже с вас скоро.
            Обикновено обработваме апликациите до 24 часа.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/b2b"
              className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="ri-arrow-left-line"></i>
              Обратно към B2B
            </Link>
            <Link
              to="/"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="ri-home-4-line"></i>
              Към началната страница
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50">
      <Header />
      <div ref={topRef} />

      {/* Header */}
      <section className="bg-gray-900 py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/b2b" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors cursor-pointer">
            <i className="ri-arrow-left-line"></i>
            Обратно към B2B страницата
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 font-heading">
            Кандидатстване за B2B Партньорство
          </h1>
          <p className="text-gray-400 text-lg">
            Попълнете формата и станете част от нашата wholesale мрежа
          </p>

          {/* Steps */}
          <div className="flex items-center gap-2 mt-8">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === s.num
                      ? 'bg-emerald-600 text-white'
                      : step > s.num
                      ? 'bg-emerald-600/30 text-emerald-300'
                      : 'bg-white/10 text-gray-500'
                  }`}
                >
                  {step > s.num ? <i className="ri-check-line"></i> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  step >= s.num ? 'text-white' : 'text-gray-600'
                }`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-px ${step > s.num ? 'bg-emerald-600/50' : 'bg-white/10'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-up">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10">

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <i className="ri-error-warning-line text-red-500 mt-0.5"></i>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Company Information */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-black">1</span>
                  Информация за компанията
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Име на компанията <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.company_name} onChange={e => updateField('company_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="Пример: Korean Food Market ООД" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">БУЛСТАТ / ЕИК</label>
                      <input type="text" value={formData.bulstat} onChange={e => updateField('bulstat', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors font-mono" placeholder="123456789" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">ДДС номер</label>
                      <input type="text" value={formData.vat_number} onChange={e => updateField('vat_number', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors font-mono" placeholder="BG123456789" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">МОЛ / Законен представител</label>
                    <input type="text" value={formData.mol} onChange={e => updateField('mol', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="Име на управителя" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Адрес на компанията <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.address} onChange={e => updateField('address', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="ул. Примерна №1" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Град <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.city} onChange={e => updateField('city', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="София" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Пощенски код</label>
                      <input type="text" value={formData.postal_code} onChange={e => updateField('postal_code', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="1000" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Държава</label>
                      <input type="text" value={formData.country} onChange={e => updateField('country', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="България" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон <span className="text-red-500">*</span></label>
                      <input type="tel" value={formData.phone} onChange={e => updateField('phone', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="0899 123 456" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email на компанията <span className="text-red-500">*</span></label>
                      <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="office@company.bg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Уебсайт</label>
                    <input type="url" value={formData.website} onChange={e => updateField('website', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="https://www.company.bg" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact Person */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-black">2</span>
                  Лице за контакт
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Име <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.contact_first_name} onChange={e => updateField('contact_first_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="Иван" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Фамилия <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.contact_last_name} onChange={e => updateField('contact_last_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="Иванов" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Длъжност</label>
                    <input type="text" value={formData.contact_position} onChange={e => updateField('contact_position', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="Управител / Мениджър покупки" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Мобилен телефон <span className="text-red-500">*</span></label>
                      <input type="tel" value={formData.contact_mobile} onChange={e => updateField('contact_mobile', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="0899 123 456" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                      <input type="email" value={formData.contact_email} onChange={e => updateField('contact_email', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="ivan@company.bg" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Business Information */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-black">3</span>
                  Бизнес информация
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Тип бизнес <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {businessTypes.map(bt => (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => updateField('business_type', formData.business_type === bt.value ? '' : bt.value)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                            formData.business_type === bt.value
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          {bt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Години в бизнеса</label>
                      <input type="number" min="0" value={formData.years_in_business} onChange={e => updateField('years_in_business', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="5" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Брой локации / обекти</label>
                      <input type="number" min="1" value={formData.number_of_locations} onChange={e => updateField('number_of_locations', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors" placeholder="1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Очаквана месечна стойност на поръчките</label>
                      <select value={formData.estimated_monthly_value} onChange={e => updateField('estimated_monthly_value', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors cursor-pointer">
                        <option value="">Изберете...</option>
                        <option value="under_500">Под 250 €</option>
                        <option value="500_2000">250 - 1,000 €</option>
                        <option value="2000_5000">1,000 - 2,500 €</option>
                        <option value="5000_10000">2,500 - 5,000 €</option>
                        <option value="10000_plus">Над 5,000 €</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Очакван месечен обем</label>
                      <select value={formData.estimated_monthly_volume} onChange={e => updateField('estimated_monthly_volume', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors cursor-pointer">
                        <option value="">Изберете...</option>
                        <option value="small">Малък (1-5 кашона)</option>
                        <option value="medium">Среден (5-20 кашона)</option>
                        <option value="large">Голям (20-50 кашона)</option>
                        <option value="pallet">Палети (50+ кашона)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Корейски брандове, които вече продавате</label>
                    <textarea
                      value={formData.existing_brands}
                      onChange={e => updateField('existing_brands', e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors"
                      placeholder="Пример: Samyang, Nongshim, Ottogi, CJ..."
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="checkbox" checked={formData.imports_products} onChange={e => updateField('imports_products', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
                      <span className="text-sm text-gray-700">Внасяте ли продукти в момента?</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input type="checkbox" checked={formData.requires_pallets} onChange={e => updateField('requires_pallets', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer" />
                      <span className="text-sm text-gray-700">Изисквате ли палетни количества?</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Допълнителна информация</label>
                    <textarea
                      value={formData.additional_notes}
                      onChange={e => updateField('additional_notes', e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-colors"
                      placeholder="Допълнителни бележки, специфични изисквания..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation & Legal */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-black">4</span>
                  Преглед и потвърждение
                </h2>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">Обобщение на апликацията</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <SummaryItem label="Компания" value={formData.company_name} />
                    <SummaryItem label="БУЛСТАТ" value={formData.bulstat || '—'} />
                    <SummaryItem label="Град" value={formData.city} />
                    <SummaryItem label="Телефон" value={formData.phone} />
                    <SummaryItem label="Email" value={formData.email} />
                    <SummaryItem label="Тип бизнес" value={businessTypes.find(b => b.value === formData.business_type)?.label || '—'} />
                    <SummaryItem label="Контакт" value={`${formData.contact_first_name} ${formData.contact_last_name}`} />
                    <SummaryItem label="Мобилен" value={formData.contact_mobile} />
                  </div>
                </div>

                {/* Legal Checkboxes */}
                <div className="space-y-4 mb-2">
                  <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors border border-gray-100">
                    <input type="checkbox" checked={formData.accept_terms}
                      onChange={e => updateField('accept_terms', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      Приемам{' '}
                      <Link to="/terms" className="text-emerald-600 hover:underline font-medium">Общите условия</Link>
                      {' '}за B2B партньорство
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors border border-gray-100">
                    <input type="checkbox" checked={formData.accept_privacy}
                      onChange={e => updateField('accept_privacy', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      Приемам{' '}
                      <Link to="/privacy" className="text-emerald-600 hover:underline font-medium">Политиката за поверителност</Link>
                      {' '}и обработката на лични данни
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-xl transition-colors border border-gray-100">
                    <input type="checkbox" checked={formData.confirm_accurate}
                      onChange={e => updateField('confirm_accurate', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      Потвърждавам, че предоставената информация за компанията е вярна и точна
                    </span>
                  </label>
                </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 mt-4">
                  <i className="ri-information-line text-amber-600 mt-0.5"></i>
                  <p className="text-sm text-amber-800">
                    С натискането на &bdquo;Изпрати апликацията&ldquo;, вашите данни ще бъдат изпратени към нашия B2B екип за преглед.
                    Акаунтът ви ще бъде активиран след одобрение.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <button
                  onClick={goPrev}
                  className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer"
                >
                  <i className="ri-arrow-left-line"></i>
                  Назад
                </button>
              ) : (
                <div></div>
              )}

              {step < 4 ? (
                <button
                  onClick={goNext}
                  disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid) || (step === 3 && !isStep3Valid)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer"
                >
                  Напред
                  <i className="ri-arrow-right-line"></i>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all whitespace-nowrap inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25"
                >
                  {submitting ? (
                    <><i className="ri-loader-4-line animate-spin"></i> Изпращане...</>
                  ) : (
                    <><i className="ri-send-plane-line"></i> Изпрати апликацията</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 text-xs">{label}</span>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}