import { useState, useEffect, useLayoutEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../../home/components/Header';
import Footer from '../../home/components/Footer';
import { supabase } from '@/utils/supabase';
import { sanitizeHtml } from '@/utils/security';
import { withBlogCover } from '@/utils/blogImages';
import { useSEO } from '@/utils/seo';
import { getArticleSEO } from '@/utils/articleSeo';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author: string;
  category: string;
  tags: string[];
  published: boolean;
  views: number;
  read_time: number;
  created_at: string;
  updated_at?: string;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Pick<BlogPost, 'id' | 'title' | 'slug' | 'excerpt' | 'cover_image' | 'category' | 'read_time' | 'created_at' | 'views'>[]>([]);
  const [loading, setLoading] = useState(true);

  const seoPost = post?.slug === slug ? post : null;
  useSEO(seoPost ? getArticleSEO(seoPost) : {
    title: loading ? 'Зареждане на статия | K-FOOD' : 'Статията не е намерена | K-FOOD',
    description: 'Истории, рецепти и нови вкусове от K-FOOD.',
    canonical: `/blog/${slug}`,
    robots: !loading && !seoPost ? 'noindex, follow' : undefined,
  });

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchPost(slug);
    }
  }, [slug]);

  const fetchPost = async (postSlug: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', postSlug)
        .eq('published', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPost(withBlogCover(data));
        // Increment views — skip bots and repeated views in same session
        const ua = navigator.userAgent.toLowerCase();
        const isBot = /bot|crawler|spider|crawling|googlebot|bingbot|slurp|duckduckbot|facebot|ia_archiver|facebookexternalhit|linkedinbot|twitterbot|rogerbot|embedly|quora|outbrain|showyoubot|outbrain|pinterest|developers\.google/i.test(ua);
        const sessionKey = `viewed_post_${data.id}`;
        const alreadyViewed = sessionStorage.getItem(sessionKey);
        if (!isBot && !alreadyViewed) {
          sessionStorage.setItem(sessionKey, '1');
          // Use Edge Function to increment views securely (avoids direct table writes)
          try {
            await supabase.functions.invoke('sitemap-blog', {
              body: { action: 'increment_view', post_id: data.id },
            });
          } catch {
            // Silently fail — views are not critical
          }
        }

        // Fetch related posts
        const { data: related } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, cover_image, category, read_time, created_at, views')
          .eq('published', true)
          .eq('category', data.category)
          .neq('id', data.id)
          .limit(3);
        setRelatedPosts((related || []).map(withBlogCover));
      }
    } catch {
      // Silently handle error — don't leak details
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Зареждане...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <i className="ri-article-line text-6xl text-gray-300 mb-4"></i>
            <h1 className="text-2xl font-bold text-gray-700 mb-2">Статията не е намерена</h1>
            <Link to="/blog" className="text-brand-primary hover:underline font-medium">
              Обратно към блога
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // XSS PROTECTION: Sanitize blog content before rendering
  const sanitizedContent = sanitizeHtml(post.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Cover Image */}
      <div className="w-full h-[420px] md:h-[520px] overflow-hidden relative">
        <img
          src={post.cover_image}
          alt={post.title}
          className="w-full h-full object-cover object-top"
        />
        <div className="brand-article-shade absolute inset-0"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-4xl mx-auto">
          <span className="inline-block bg-brand-primary text-white text-xs font-bold px-3 py-1.5 rounded-full mb-3 whitespace-nowrap">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            {post.title}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-brand-primary transition-colors">Начало</Link>
          <i className="ri-arrow-right-s-line"></i>
          <Link to="/blog" className="hover:text-brand-primary transition-colors">Блог</Link>
          <i className="ri-arrow-right-s-line"></i>
          <span className="text-gray-700 font-medium line-clamp-1">{post.title}</span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="w-8 h-8 flex items-center justify-center bg-brand-petal rounded-full">
              <i className="ri-user-line text-brand-primary"></i>
            </div>
            <span className="whitespace-nowrap">{post.author}</span>
          </div>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm whitespace-nowrap">
            <i className="ri-calendar-line"></i>
            {formatDate(post.created_at)}
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm whitespace-nowrap">
            <i className="ri-time-line"></i>
            {post.read_time} мин четене
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm whitespace-nowrap">
            <i className="ri-eye-line"></i>
            {post.views.toLocaleString()} прегледа
          </span>
        </div>

        {/* Excerpt */}
        <p className="text-xl text-gray-600 leading-relaxed mb-8 font-medium border-l-4 border-brand-primary pl-5">
          {post.excerpt}
        </p>

        {/* Content — SANITIZED to prevent XSS */}
        <article
          className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4 prose-ul:text-gray-700 prose-li:mb-1"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-8 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-500 mb-3">Тагове:</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-brand-blush text-brand-hover text-sm px-3 py-1.5 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-primary to-brand-primary rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">От историята към твоята маса</h3>
          <p className="text-brand-petal mb-6">Открий корейски и азиатски вкусове в K-FOOD, с доставка в България.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/products"
              className="bg-white text-brand-hover font-bold px-6 py-3 rounded-xl hover:bg-brand-blush transition-colors whitespace-nowrap"
            >
              Разгледай продуктите
            </Link>
            <Link
              to="/categories"
              className="border border-brand-petal/60 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Виж категориите
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-14">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Подобни статии</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  to={`/blog/${related.slug}`}
                  className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-brand-border transition-all cursor-pointer"
                >
                  <div className="h-40 overflow-hidden">
                    <img
                      src={related.cover_image}
                      alt={related.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-brand-primary font-semibold">{related.category}</span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1 group-hover:text-brand-hover transition-colors line-clamp-2">
                      {related.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-2 whitespace-nowrap">{related.read_time} мин четене</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-brand-primary font-semibold hover:underline cursor-pointer"
          >
            <i className="ri-arrow-left-line"></i>
            Обратно към блога
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
