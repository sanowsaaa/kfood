import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useB2B } from '@/contexts/B2BContext';

export default function B2BLoginPage() {
  const { loginB2B, companyId: alreadyLoggedIn } = useB2B();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (alreadyLoggedIn) {
    navigate('/b2b/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Моля, попълнете имейл и парола.');
      return;
    }

    setLoading(true);
    const result = await loginB2B(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || 'Грешка при вход. Проверете имейла и паролата.');
    }
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
          <h1 className="text-2xl font-extrabold text-gray-900 font-heading">B2B Портал</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            Влезте с вашия имейл и парола, за да достъпите B2B каталога и цените.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <i className="ri-error-warning-fill text-red-500 text-lg flex-shrink-0 mt-0.5"></i>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

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
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
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
                  placeholder="Вашата парола"
                  autoComplete="current-password"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap text-sm"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-lg"></i>
                  Проверка...
                </>
              ) : (
                <>
                  <i className="ri-login-box-line text-lg"></i>
                  Вход
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-gray-100 space-y-3 text-center">
            <p className="text-xs text-gray-500">
              Първо влизане?{' '}
              <Link to="/b2b/register" className="text-emerald-600 hover:underline font-medium">
                Активирайте акаунта си
              </Link>
            </p>
            <p className="text-xs text-gray-400">
              Забравена парола? Свържете се с вашия акаунт мениджър.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Защитен достъп само за одобрени B2B партньори.
        </p>
      </div>
    </div>
  );
}