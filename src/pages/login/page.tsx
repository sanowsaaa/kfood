import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../../utils/seo';

const CHECK_USER_URL = 'https://quqlovoiwgqfmgjumpgd.supabase.co/functions/v1/check-user';

async function checkUserRole() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { isAdmin: false, companyId: null };

  const response = await fetch(CHECK_USER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) return { isAdmin: false, companyId: null };
  return await response.json();
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  useSEO({
    title: 'Админ вход | K-FOOD Велико Търново',
    description: 'Вход за администратори на K-FOOD онлайн магазин за корейска храна.',
    keywords: 'админ вход, K-FOOD администратор, корейска храна админ',
    canonical: '/login',
    ogType: 'website',
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const result = await checkUserRole();
      if (result.isAdmin) {
        navigate('/admin');
      } else {
        setCheckingAuth(false);
      }
    } catch {
      setCheckingAuth(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Моля, въведете имейл адрес първо.');
      return;
    }
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (resendError) throw resendError;
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Грешка при изпращане на потвърждение.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccess(false);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.session) {
        const result = await checkUserRole();

        if (result.isAdmin) {
          navigate('/admin');
        } else {
          setError('Нямате администраторски достъп. B2B партньорите влизат през B2B портала.');
          await supabase.auth.signOut();
        }
      }
    } catch (err: any) {
      const msg = err.message || '';

      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        setError('Имейлът не е потвърден. Моля, проверете пощата си или натиснете бутона по-долу за ново потвърждение.');
      } else {
        setError(msg || 'Грешка при влизане. Моля, проверете имейл и парола.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex items-center justify-center px-4">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Проверка на достъпа...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-shield-user-line text-3xl text-white"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Админ вход</h1>
            <p className="text-sm text-gray-600 mt-2">
              Влезте в административния панел на K-FOOD
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <i className="ri-error-warning-fill text-red-600 text-xl flex-shrink-0"></i>
                <div className="flex-1">
                  <p className="text-sm text-red-800">{error}</p>
                  {(error.includes('не е потвърден') || error.includes('not confirmed')) && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                      className="mt-2 text-sm text-teal-700 hover:text-teal-800 font-medium underline whitespace-nowrap"
                    >
                      {resendLoading ? 'Изпращане...' : 'Изпрати нов линк за потвърждение'}
                    </button>
                  )}
                </div>
              </div>
            )}
            {resendSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <i className="ri-check-line text-green-600 text-xl flex-shrink-0"></i>
                <p className="text-sm text-green-800">
                  Линк за потвърждение е изпратен! Моля, проверете пощата си (включително папка Спам).
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имейл адрес
              </label>
              <div className="relative">
                <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@k-food.bg"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Парола
              </label>
              <div className="relative">
                <i className="ri-lock-password-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Влизане...
                </>
              ) : (
                <>
                  <i className="ri-login-box-line"></i>
                  Вход
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">B2B партньори</p>
            <a href="/b2b/dashboard" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Вход в B2B портала →
            </a>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium whitespace-nowrap"
            >
              ← Обратно към началната страница
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Защитен достъп само за администратори
          </p>
        </div>
      </div>
    </div>
  );
}