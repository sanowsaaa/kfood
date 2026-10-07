import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';
import { supabase } from '@/utils/supabase';
import B2BHeader from '@/pages/b2b/components/B2BHeader';
import B2BFooter from '@/pages/b2b/components/B2BFooter';

export default function B2BCheckoutPage() {
  const navigate = useNavigate();
  const { cart, cartItemsCount, cartTotal, company, clearB2BCart, companyId, sessionLoading } = useB2B();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState(company?.email || '');
  const [phone, setPhone] = useState(company?.phone || '');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(company?.city || '');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    const savedNotes = sessionStorage.getItem('b2b_order_notes');
    if (savedNotes) setDeliveryNotes(savedNotes);
  }, []);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validatePhone = (v: string) => /^(\+359\d{8,9}|0\d{9})$/.test(v.replace(/\s/g, ''));

  const handleSubmit = async () => {
    setError(''); setEmailError(''); setPhoneError(''); setNameError(''); setAddressError('');

    let valid = true;
    if (!validateEmail(email)) { setEmailError('Валиден имейл'); valid = false; }
    if (!validatePhone(phone)) { setPhoneError('Валиден телефон'); valid = false; }
    if (!fullName.trim()) { setNameError('Име'); valid = false; }
    if (!address.trim() || !city.trim()) { setAddressError('Адрес и град'); valid = false; }
    if (!valid) return;

    // Refresh session before sending — ensure token is not expired
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Сесията е изтекла. Моля, влезте отново в B2B портала.');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      const orderItems = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        image: item.product.image,
        sku: item.product.sku || null,
        pieces_per_carton: item.product.pieces_per_carton || 0,
      }));

      const body = {
        items: orderItems,
        b2b_company_id: companyId,
        company_name: company?.company_name || '',
        customer_email: email.trim(),
        customer_phone: phone.replace(/\s/g, ''),
        shipping_address: {
          full_name: fullName.trim(),
          address: address.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          notes: deliveryNotes.trim(),
        },
        notes: deliveryNotes.trim(),
      };

      const { data, error: fnError } = await supabase.functions.invoke('create-b2b-checkout', { body });

      if (fnError) {
        throw new Error(fnError.message || 'Грешка при изпращане на запитване');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Грешка при изпращане на запитване');
      }

      setOrderNumber(data.order_number);
      clearB2BCart();
      sessionStorage.removeItem('b2b_order_notes');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Грешка при запитването. Опитайте отново.');
      setIsProcessing(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="ri-loader-4-line text-4xl text-emerald-600 animate-spin"></i>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-mail-check-line text-emerald-600 text-4xl"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Поръчката е изпратена!</h2>
          <p className="text-gray-500 text-sm mb-2">
            Вашата поръчка <strong className="text-emerald-600 font-mono">#{orderNumber}</strong> е получена успешно.
          </p>
          <p className="text-gray-400 text-xs mb-8">
            Нашият екип ще я прегледа и ще ви изпрати оферта на посочения имейл.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/b2b/dashboard')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <i className="ri-dashboard-line"></i>
              Към таблото
            </button>
            <Link
              to="/b2b/products"
              className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <i className="ri-store-2-line"></i>
              Към каталога
            </Link>
          </div>
        </div>
        <B2BFooter />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <B2BHeader />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <i className="ri-shopping-cart-line text-4xl text-gray-300 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Количката е празна</h2>
          <Link to="/b2b/products" className="text-emerald-600 font-medium text-sm hover:underline">Към каталога</Link>
        </div>
        <B2BFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <B2BHeader />

      <section className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-extrabold text-gray-900 font-heading">Завършване на поръчка</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
            <p className="text-gray-500 text-sm">{company?.company_name} · Ще получите оферта на имейл</p>
            <span className="hidden sm:block text-gray-300">·</span>
            <p className="text-emerald-600/80 text-xs flex items-center gap-1">
              <i className="ri-archive-line"></i>
              Минимална поръчка: 1 кашон на продукт
            </p>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <i className="ri-error-warning-line text-red-500 mt-0.5"></i>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">Контактна информация</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Име и фамилия <span className="text-red-500">*</span></label>
                  <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setNameError(''); }} placeholder="Иван Иванов" className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${nameError ? 'border-red-400 focus:ring-red-500/30' : 'border-gray-300 focus:ring-emerald-500/50'}`} />
                  {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Имейл <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="company@example.com" className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${emailError ? 'border-red-400 focus:ring-red-500/30' : 'border-gray-300 focus:ring-emerald-500/50'}`} />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Телефон <span className="text-red-500">*</span></label>
                  <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setPhoneError(''); }} placeholder="0899 123 456" className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${phoneError ? 'border-red-400 focus:ring-red-500/30' : 'border-gray-300 focus:ring-emerald-500/50'}`} />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-bold text-gray-900 text-sm mb-4">Адрес за доставка</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Адрес <span className="text-red-500">*</span></label>
                  <input type="text" value={address} onChange={e => { setAddress(e.target.value); setAddressError(''); }} placeholder="ул. Примерна 12" className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${addressError ? 'border-red-400 focus:ring-red-500/30' : 'border-gray-300 focus:ring-emerald-500/50'}`} />
                  {addressError && <p className="text-xs text-red-500 mt-1">{addressError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Град <span className="text-red-500">*</span></label>
                  <input type="text" value={city} onChange={e => { setCity(e.target.value); setAddressError(''); }} placeholder="София" className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Пощенски код</label>
                  <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="1000" className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Бележки</label>
                  <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={3} placeholder="Допълнителни инструкции, срокове, специални изисквания..." className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <i className="ri-shopping-cart-line text-emerald-600"></i>
                Продукти в количката
              </h2>

              <div className="space-y-3 mb-5 max-h-60 overflow-y-auto">
                {cart.map(item => {
                  const isCarton = item.product.pieces_per_carton > 0;
                  const cartons = isCarton ? Math.round(item.quantity / item.product.pieces_per_carton) : item.quantity;
                  return (
                    <div key={item.product.id} className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-0">
                      <img src={item.product.image} alt={item.product.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 line-clamp-1">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500">
                          {isCarton ? (
                            <>{cartons} кашон{cartons !== 1 ? 'а' : ''} × {item.product.pieces_per_carton} бр.</>
                          ) : (
                            <>{item.quantity} бр.</>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 text-sm mb-5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Общо артикули</span>
                  <span className="font-semibold text-gray-900">{cartItemsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Междинен сбор (без ДДС)</span>
                  <span className="font-bold text-gray-900">€{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Доставка</span>
                  <span className="text-gray-400 text-xs">Ще бъде уточнена в офертата</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="w-full py-3.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isProcessing ? (
                  <><i className="ri-loader-4-line animate-spin"></i> Изпращане...</>
                ) : (
                  <><i className="ri-check-line"></i> Изпрати поръчка</>
                )}
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-gray-400">
                <i className="ri-information-line"></i> Ще получите оферта на посочения имейл
              </div>
            </div>
          </div>
        </div>
      </main>

      <B2BFooter />
    </div>
  );
}