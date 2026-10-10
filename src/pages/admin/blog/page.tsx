import { useAdminAction } from '@/hooks/useAdminAction';
import { useAdminRead } from '@/hooks/useAdminRead';
import { checkedData, confirmedRecord } from '@/utils/admin';
import AdminFeedback from '@/pages/admin/components/AdminFeedback';
import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminAccess from '@/pages/admin/components/AdminAccess';
import { supabase } from '@/utils/supabase';
import AdminHeader from '../components/AdminHeader';
import BlogPostModal, { type BlogPost as EditableBlogPost } from './components/BlogPostModal';
import { withBlogCover } from '@/utils/blogImages';

interface BlogPost extends EditableBlogPost { id: number; views: number; created_at: string; }

export default function AdminBlogPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, error: authError, retry: retryAuth } = useAdminAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const { loading, error: loadError, load } = useAdminRead();
  const action = useAdminAction();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchPosts();
    }
  }, [isAdmin]);

  const fetchPosts = () => load(async () => checkedData(await supabase.from('blog_posts')
    .select('id, title, slug, excerpt, content, cover_image, author, category, tags, published, views, read_time, created_at')
    .order('created_at', { ascending: false })) as BlogPost[], rows => setPosts(rows.map(withBlogCover)));

  const showNotification = (type: 'success' | 'error', text: string) => action.setMessage({ type, text });
  const handleTogglePublish = (post: BlogPost) => action.run(`publish:${post.id}`, async () => {
    confirmedRecord(await supabase.from('blog_posts').update({ published: !post.published }).eq('id', post.id).select('id').single(), post.id);
    setPosts(current => current.map(p => p.id === post.id ? { ...p, published: !post.published } : p));
  }, post.published ? 'Статията е скрита.' : 'Статията е публикувана.');

  const handleDelete = (id: number) => action.run(`delete:${id}`, async () => {
    confirmedRecord(await supabase.from('blog_posts').delete().eq('id', id).select('id').single(), id);
    setPosts(current => current.filter(p => p.id !== id));
    setDeleteConfirm(null);
  }, 'Статията е изтрита.');

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });

  if (authLoading || authError) return <AdminAccess error={authError} onRetry={retryAuth} />;

  if (!isAdmin) return <Navigate to="/login" replace />;

  const publishedCount = posts.filter((p) => p.published).length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);

  return (
    <div className="admin-page min-h-screen bg-gray-50">
      <AdminHeader />

      <main id="admin-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminFeedback message={loadError ? { type: 'error', text: loadError } : null} onRetry={fetchPosts} />
        <AdminFeedback message={action.message} onDismiss={action.clearMessage} />
        <fieldset disabled={!!action.pending} aria-busy={!!action.pending} className="min-w-0">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <i aria-hidden="true" className="ri-arrow-left-line text-xl"></i>
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Управление на блог</h1>
            </div>
            <p className="text-gray-500 ml-8">Създавай, редактирай и публикувай статии</p>
          </div>
          <button
            onClick={() => { setEditingPost(null); setIsModalOpen(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <i aria-hidden="true" className="ri-add-line text-xl"></i>
            Нова статия
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Общо статии</p>
            <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Публикувани</p>
            <p className="text-3xl font-bold text-emerald-600">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Общо прегледи</p>
            <p className="text-3xl font-bold text-teal-600">{totalViews.toLocaleString()}</p>
          </div>
        </div>

        {/* Posts Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <i aria-hidden="true" className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
              <p className="mt-3 text-gray-500">Зареждане...</p>
            </div>
          ) : loadError ? null : posts.length === 0 ? (
            <div className="p-12 text-center">
              <i aria-hidden="true" className="ri-article-line text-5xl text-gray-300 mb-3"></i>
              <p className="text-gray-500 font-medium">Няма статии</p>
              <button
                onClick={() => { setEditingPost(null); setIsModalOpen(true); }}
                className="mt-4 text-teal-600 font-semibold hover:underline cursor-pointer"
              >
                Създай първата статия
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Заглавие</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Категория</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Дата</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Прегледи</th>
                    <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Статус</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm line-clamp-1">{post.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{post.excerpt}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
                          {post.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
                        {formatDate(post.created_at)}
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-600 flex items-center gap-1 whitespace-nowrap">
                          <i aria-hidden="true" className="ri-eye-line text-gray-400"></i>
                          {post.views.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                            post.published
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          <i aria-hidden="true" className={post.published ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
                          {post.published ? 'Публикувана' : 'Скрита'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Преглед"
                          >
                            <i aria-hidden="true" className="ri-external-link-line"></i>
                          </a>
                          <button
                            onClick={() => { setEditingPost(post); setIsModalOpen(true); }}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Редактирай"
                          >
                            <i aria-hidden="true" className="ri-edit-line"></i>
                          </button>
                          {deleteConfirm === post.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Изтрий
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                Отказ
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(post.id)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Изтрий"
                            >
                              <i aria-hidden="true" className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </fieldset>
      </main>

      {isModalOpen && (
        <BlogPostModal
          post={editingPost}
          onClose={() => { setIsModalOpen(false); setEditingPost(null); }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingPost(null);
            fetchPosts();
            showNotification('success', editingPost ? 'Статията е обновена' : 'Статията е създадена');
          }}
        />
      )}
    </div>
  );
}
