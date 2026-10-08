import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/utils/supabase';
import { useAdminAction } from '@/hooks/useAdminAction';
import AdminFeedback from './AdminFeedback';
import '../admin.css';

const sections = [
  { path: '/admin', label: 'Продукти', icon: 'ri-shopping-bag-line' },
  { path: '/admin/orders', label: 'Поръчки', icon: 'ri-file-list-3-line' },
  { path: '/admin/b2b', label: 'B2B партньори', icon: 'ri-building-2-line' },
  { path: '/admin/b2b/documents', label: 'Документи', icon: 'ri-folder-line' },
  { path: '/admin/blog', label: 'Блог', icon: 'ri-article-line' },
  { path: '/admin/reviews', label: 'Ревюта', icon: 'ri-star-line' },
];

export default function AdminHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const action = useAdminAction();
  const current = [...sections].reverse().find(section => section.path === '/admin' ? pathname === '/admin' : pathname.startsWith(section.path));
  const handleLogout = () => action.run('logout', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate('/login');
  });
  return (
    <header className="admin-header sticky top-0 z-40 border-b border-white/10 text-slate-300">
      <a href="#admin-content" className="admin-skip">Към съдържанието</a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/admin" className="flex items-center gap-3 text-white" aria-label="K-FOOD администрация">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-300"><i aria-hidden="true" className="ri-dashboard-line text-xl" /></span>
            <span><span className="block text-base sm:text-lg font-bold tracking-tight">K-FOOD <span className="text-emerald-300">ADMIN</span></span><span className="block text-[10px] sm:text-xs text-slate-400">Управление на магазина</span></span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="rounded-lg px-3 py-2 hover:bg-white/10 hover:text-white"><i aria-hidden="true" className="ri-arrow-right-up-line sm:mr-2" /><span className="hidden sm:inline">Към сайта</span><span className="sm:hidden">Сайт</span></Link>
            <button type="button" onClick={handleLogout} disabled={!!action.pending} className="rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 disabled:opacity-50"><i aria-hidden="true" className="ri-logout-box-r-line mr-2" />{action.pending ? 'Излизане...' : 'Изход'}</button>
          </div>
        </div>
        <nav aria-label="Административни раздели" className="flex gap-1 overflow-x-auto pb-3">
          {sections.map(section => <Link key={section.path} to={section.path} aria-current={current?.path === section.path ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${current?.path === section.path ? 'bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-300/25' : 'hover:bg-white/5 hover:text-white'}`}><i aria-hidden="true" className={section.icon} />{section.label}</Link>)}
        </nav>
      </div>
      {action.message && <div className="max-w-7xl mx-auto px-4"><AdminFeedback message={action.message} onDismiss={action.clearMessage} /></div>}
    </header>
  );
}
