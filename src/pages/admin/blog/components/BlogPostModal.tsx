import { useAdminDialog } from '@/hooks/useAdminDialog';
import { adminErrorMessage, confirmedRecord, createActionLock } from '@/utils/admin';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { sanitizeHtml } from '@/utils/security';

export interface BlogPost {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  read_time: number;
}

interface Props {
  post: BlogPost | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = ['Бизнес', 'Корейска храна', 'Азиатска храна', 'Велико Търново', 'Рамен', 'Рецепти', 'Здраве', 'Култура', 'Общо'];

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[а-яА-Я]/g, (char) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
        и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
        р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
        ш: 'sh', щ: 'sht', ъ: 'a', ь: '', ю: 'yu', я: 'ya',
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const defaultPost: BlogPost = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image: '',
  author: 'K-FOOD Team',
  category: 'Корейска храна',
  tags: [],
  published: false,
  read_time: 5,
};

export default function BlogPostModal({ post, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<BlogPost>(post ? { ...post } : { ...defaultPost });
  const [tagInput, setTagInput] = useState('');
  const submitLock = useRef(createActionLock());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useAdminDialog(true, saving, onClose);

  useEffect(() => {
    if (post) {
      setForm({ ...post });
    } else {
      setForm({ ...defaultPost });
    }
  }, [post]);

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: post ? prev.slug : generateSlug(title),
    }));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Заглавието е задължително'); return; }
    if (!form.slug.trim()) { setError('Slug-ът е задължителен'); return; }
    if (!form.excerpt.trim()) { setError('Резюмето е задължително'); return; }
    if (!form.content.trim()) { setError('Съдържанието е задължително'); return; }

    if (!submitLock.current.acquire()) return;
    try {
      setSaving(true);
      setError('');

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        content: sanitizeHtml(form.content.trim()),
        cover_image: form.cover_image.trim(),
        author: form.author.trim() || 'K-FOOD Team',
        category: form.category,
        tags: form.tags,
        published: form.published,
        read_time: form.read_time,
        updated_at: new Date().toISOString(),
      };

      if (post?.id) {
        confirmedRecord(await supabase.from('blog_posts').update(payload).eq('id', post.id).select('id').single(), post.id);
      } else {
        confirmedRecord(await supabase.from('blog_posts').insert([payload]).select('id').single());
      }

      onSuccess();
    } catch (cause) {
      setError(adminErrorMessage(cause));
    } finally {
      submitLock.current.release();
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" tabIndex={-1} className="bg-white rounded-2xl w-full max-w-3xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 id="admin-dialog-title" className="text-xl font-bold text-gray-900">
            {post ? 'Редактирай статия' : 'Нова статия'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Затвори"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i aria-hidden="true" className="ri-close-line text-xl"></i>
          </button>
        </div>

        <fieldset disabled={saving} className="min-w-0 p-6 space-y-5">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <i aria-hidden="true" className="ri-error-warning-line"></i>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Заглавие *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Заглавие на статията..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              URL Slug *
              <span className="text-gray-400 font-normal ml-2 text-xs">(автоматично генериран)</span>
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
              <span className="bg-gray-50 px-3 py-2.5 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">/blog/</span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Category & Read time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Категория</label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Минути за четене</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.read_time}
                onChange={(e) => setForm((prev) => ({ ...prev, read_time: parseInt(e.target.value) || 5 }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL на корица</label>
            <input
              type="text"
              value={form.cover_image}
              onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {form.cover_image && (
              <div className="mt-2 h-32 rounded-lg overflow-hidden border border-gray-200">
                <img src={form.cover_image} alt="preview" className="w-full h-full object-cover object-top" />
              </div>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Резюме *</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Кратко описание на статията (1-2 изречения)..."
              rows={3}
              maxLength={500}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{form.excerpt.length}/500</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Съдържание * <span className="text-gray-400 font-normal text-xs">(поддържа HTML)</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="<h2>Заглавие</h2><p>Текст на статията...</p>"
              rows={12}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y font-mono"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Тагове</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Добави таг и натисни Enter..."
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={addTag}
                className="bg-teal-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Добави
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full flex items-center gap-1.5"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="text-emerald-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <i aria-hidden="true" className="ri-close-line text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Published */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4">
            <div>
              <p className="font-semibold text-gray-800 text-sm">Публикувана</p>
              <p className="text-xs text-gray-500 mt-0.5">Видима за всички посетители</p>
            </div>
            <button
              onClick={() => setForm((prev) => ({ ...prev, published: !prev.published }))}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                form.published ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.published ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>
        </fieldset>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Затвори"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Отказ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {saving ? (
              <>
                <i aria-hidden="true" className="ri-loader-4-line animate-spin"></i>
                Запазване...
              </>
            ) : (
              <>
                <i aria-hidden="true" className="ri-save-line"></i>
                {post ? 'Обнови' : 'Създай'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
