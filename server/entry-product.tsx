import { renderToString } from 'react-dom/server';
import { StaticRouter, Route, Routes, Link } from 'react-router-dom';
import { CartProvider } from '../src/contexts/CartContext';
import ProductDetail, { type Product } from '../src/pages/product-detail/page';
import Header from '../src/pages/home/components/Header';
import Footer from '../src/pages/home/components/Footer';
import { getProductSchema, getBreadcrumbSchema } from '../src/utils/seo';

export function renderProduct(product: Product) {
  const path = `/product/${product.slug}`;
  const markup = renderToString(<StaticRouter location={path}><CartProvider>
    <Routes><Route path="/product/:id" element={<ProductDetail serverProduct={product} />} /></Routes>
  </CartProvider></StaticRouter>);
  const schema = { '@context': 'https://schema.org', '@graph': [
    getProductSchema({ ...product, productId: product.id, inStock: product.in_stock }),
    getBreadcrumbSchema([{ name: 'Начало', url: '/' }, { name: 'Продукти', url: '/products' }, { name: product.name, url: path }]),
  ] };
  return { markup, schema };
}

export function renderMissing(failure = false) {
  return renderToString(<StaticRouter location="/products"><CartProvider>
    <div className="min-h-screen bg-gray-50"><Header /><main className="min-h-[50vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-4">{failure ? 'Временно не успяхме да заредим продукта' : 'Продуктът не е намерен'}</h1>
      <Link to="/products" className="text-brand-primary underline">Към продуктите</Link>
    </main><Footer /></div>
  </CartProvider></StaticRouter>);
}
