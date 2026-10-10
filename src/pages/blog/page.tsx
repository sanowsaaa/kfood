import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../home/components/Header';
import Footer from '../home/components/Footer';
import { supabase } from '@/utils/supabase';
import { useSEO } from '@/utils/seo';
import { withBlogCover } from '@/utils/blogImages';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  views: number;
  read_time: number;
  created_at: string;
}

const CATEGORIES = ['Всички', 'Бизнес', 'Корейска храна', 'Азиатска храна', 'Велико Търново', 'Рамен', 'Рецепти', 'Здраве', 'Култура'];

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Всички');
  const [searchQuery, setSearchQuery] = useState('');

  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://k-foodvelikotarnovo.com';

  useSEO({
    title: 'Блог - K-FOOD Велико Търново | Корейска храна, рецепти и туризъм',
    description: 'Открий статии за корейска храна, азиатска кухня, интересни места Велико Търново и най-лютите рамен в света. Блогът на K-FOOD - рецепти, ревюта и пътеводители.',
    keywords: 'корейска храна блог, азиатска храна, Велико Търново туризъм, рамен, рецепти, интересни места',
    canonical: '/blog',
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${siteUrl}/blog`,
          url: `${siteUrl}/blog`,
          name: 'Блог - K-FOOD Велико Търново',
          description: 'Статии за корейска храна, азиатска кухня, интересни места Велико Търново и рамен.',
          inLanguage: 'bg',
          isPartOf: { '@id': `${siteUrl}/#website` },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Начало', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Блог', item: `${siteUrl}/blog` },
          ],
        },
      ],
    },
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image, author, category, tags, published, views, read_time, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data || []).map(withBlogCover));
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesCategory = activeCategory === 'Всички' || post.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const featuredPost = filteredPosts[0];
  const restPosts = filteredPosts.slice(1);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <section className="brand-dark-section bg-gradient-to-br from-brand-ink via-brand-hover to-rose-900 text-white py-10 sm:py-14 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-4 tracking-wide">
            K-FOOD БЛОГ
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Корейска храна, рецепти<br />и Велико Търново
          </h1>
          <p className="text-brand-petal text-lg max-w-2xl mx-auto mb-8">
            Статии за азиатска кухня, интересни места, рамен предизвикателства и всичко за K-FOOD
          </p>
          <div className="relative max-w-md mx-auto">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
            <input
              type="text"
              placeholder="Търси статии..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="bg-white border-b border-gray-200 z-30 md:sticky md:top-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-brand-blush hover:text-brand-hover'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-52 bg-gray-200"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <i className="ri-article-line text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-600">Няма намерени статии</h3>
            <p className="text-gray-400 mt-2">Опитай с различна категория или търсене</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featuredPost && activeCategory === 'Всички' && searchQuery === '' && (
              <Link
                to={`/blog/${featuredPost.slug}`}
                className="group block mb-12 bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-border transition-all cursor-pointer"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  <div className="h-48 sm:h-56 md:h-72 lg:h-auto overflow-hidden">
                    <img
                      src={featuredPost.cover_image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-brand-petal text-brand-hover text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        {featuredPost.category}
                      </span>
                      <span className="text-gray-400 text-sm whitespace-nowrap">Препоръчано</span>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 group-hover:text-brand-hover transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <i className="ri-user-line"></i>
                        {featuredPost.author}
                      </span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <i className="ri-time-line"></i>
                        {featuredPost.read_time} мин
                      </span>
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <i className="ri-eye-line"></i>
                        {featuredPost.views.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(activeCategory === 'Всички' && searchQuery === '' ? restPosts : filteredPosts).map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-border transition-all cursor-pointer flex flex-col"
                >
                  <div className="h-40 sm:h-48 md:h-52 overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-brand-blush text-brand-hover text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                        {post.category}
                      </span>
                      <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(post.created_at)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-hover transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">{post.excerpt}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <i className="ri-time-line"></i>
                          {post.read_time} мин
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <i className="ri-eye-line"></i>
                          {post.views.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-brand-primary text-sm font-semibold group-hover:underline whitespace-nowrap">
                        Прочети →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
