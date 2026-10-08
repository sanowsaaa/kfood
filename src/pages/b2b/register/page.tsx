import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';

export default function B2BRegisterPage() {
  const { requestB2BActivation, registerB2B, companyId: alreadyLoggedIn } = useB2B();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    if (alreadyLoggedIn) navigate('/b2b/dashboard', { replace: true });
  }, [alreadyLoggedIn, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyId.trim() || !email.trim()) {
      setError('Моля, попълнете всички полета.');
      return;
    }

    if (!codeSent) {
      setLoading(true);
      const result = await requestB2BActivation(companyId.trim(), email.trim().toLowerCase());
      setLoading(false);
      if (result.success) setCodeSent(true);
      else setError(result.error || 'Кодът не беше изпратен. Опитайте отново.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Въведете шестцифрения код от фирмения имейл.');
      return;
    }
    if (password.length < 8) {
      setError('Паролата трябва да е поне 8 символа.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат.');
      return;
    }

    setLoading(true);
    const result = await registerB2B(companyId.trim(), email.trim().toLowerCase(), password, code);
    setLoading(false);

    if (!result.success) {
      if (result.alreadyRegistered) {
        setError('Този Company ID вече е активиран. Моля, влезте през страницата за вход.');
      } else {
        setError(result.error || 'Грешка при регистрация. Проверете данните си.');
      }
    }
    // Success → B2BContext handles session, dashboard will render
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/b2b" className="inline-block">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="ri-building-2-line text-3xl text-white"></i>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-900 font-heading">Активирайте B2B акаунт</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            Въведете данните от одобрението. Ще изпратим код на фирмения имейл, за да активирате достъпа си.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <i className="ri-error-warning-fill text-red-500 text-lg flex-shrink-0 mt-0.5"></i>
                <div>
                  <p className="text-sm text-red-600">{error}</p>
                  {error.includes('вече е активиран') && (
                    <Link to="/b2b/login" className="text-emerald-600 text-xs font-medium hover:underline mt-1 inline-block">
                      Отидете към вход &rarr;
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Company ID */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Company ID
              </label>
              <div className="relative">
                <i className="ri-key-2-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type="text"
                  value={companyId}
                  onChange={e => { setCompanyId(e.target.value); setCodeSent(false); setCode(''); }}
                  placeholder="От одобрителния имейл"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Намира се в имейла, който получихте след одобрение на B2B заявката.
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Имейл адрес
              </label>
              <div className="relative">
                <i className="ri-mail-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setCodeSent(false); setCode(''); }}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Същият имейл, с който кандидатствахте за B2B достъп.
              </p>
            </div>

            {codeSent && <>
            <div className="p-3 bg-emerald-50 rounded-xl text-sm text-emerald-800">
              Изпратихме код на фирмения имейл. Проверете и папката за спам.
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Код от имейла</label>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center tracking-widest" />
            </div>
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Парола
              </label>
              <div className="relative">
                <i className="ri-lock-password-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 8 символа"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  <i className={`text-lg ${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Потвърдете паролата
              </label>
              <div className="relative">
                <i className="ri-shield-check-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Повторете паролата"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1.5">Паролите не съвпадат.</p>
              )}
            </div>

            <button type="button" disabled={loading} onClick={() => { setCodeSent(false); setCode(''); setError(''); }}
              className="text-xs text-emerald-700 hover:underline">Поискай нов код</button>
            </>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap text-sm"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Обработване...
                </>
              ) : (
                <>
                  <i className="ri-user-add-line text-lg"></i>
                  {codeSent ? 'Активиране на акаунт' : 'Изпрати код на имейла'}
                </>
              )}
            </button>
          </form>

          {/* Link to login */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              Вече имате активиран акаунт?{' '}
              <Link to="/b2b/login" className="text-emerald-600 hover:underline font-medium">
                Влезте оттук
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Еднократна активация. След нея влизате с имейл и парола.
        </p>
      </div>
    </div>
  );
}
