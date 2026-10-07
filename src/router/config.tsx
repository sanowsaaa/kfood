import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const Home = lazy(() => import('../pages/home/page'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Products = lazy(() => import('../pages/products/page'));
const ProductDetail = lazy(() => import('../pages/product-detail/page'));
const Cart = lazy(() => import('../pages/cart/page'));
const Checkout = lazy(() => import('../pages/checkout/page'));
const OrderSuccess = lazy(() => import('../pages/order-success/page'));
const Category = lazy(() => import('../pages/category/page'));
const Categories = lazy(() => import('../pages/categories/page'));
const Admin = lazy(() => import('../pages/admin/page'));
const AdminOrders = lazy(() => import('../pages/admin/orders/page'));
const AdminBlog = lazy(() => import('../pages/admin/blog/page'));
const Blog = lazy(() => import('../pages/blog/page'));
const BlogDetail = lazy(() => import('../pages/blog/detail/page'));
const Login = lazy(() => import('../pages/login/page'));
const Shipping = lazy(() => import('../pages/shipping/page'));
const Payment = lazy(() => import('../pages/payment/page'));
const Returns = lazy(() => import('../pages/returns/page'));
const Privacy = lazy(() => import('../pages/privacy/page'));
const Terms = lazy(() => import('../pages/terms/page'));
const TrackOrder = lazy(() => import('../pages/track-order/page'));
const FAQ = lazy(() => import('../pages/faq/page'));
const AboutPage = lazy(() => import('../pages/about/page'));
const LeaveReview = lazy(() => import('../pages/leave-review/page'));
const AdminReviews = lazy(() => import('../pages/admin/reviews/page'));
const InvoicePage = lazy(() => import('../pages/invoice/page'));
const B2BPage = lazy(() => import('../pages/b2b/page'));
const B2BApplyPage = lazy(() => import('../pages/b2b/apply/page'));
const B2BDashboard = lazy(() => import('../pages/b2b/dashboard/page'));
const B2BQuickOrder = lazy(() => import('../pages/b2b/quick-order/page'));
const B2BDocumentsPage = lazy(() => import('../pages/b2b/documents/page'));
const AdminB2B = lazy(() => import('../pages/admin/b2b/page'));
const AdminB2BPricing = lazy(() => import('../pages/admin/b2b/pricing/page'));
const AdminB2BDocuments = lazy(() => import('../pages/admin/b2b/documents/page'));
const CompanyProfile = lazy(() => import('../pages/admin/b2b/companies/detail/page'));
const B2BProducts = lazy(() => import('../pages/b2b/products/page'));
const B2BProductDetail = lazy(() => import('../pages/b2b/product-detail/page'));
const B2BCart = lazy(() => import('../pages/b2b/cart/page'));
const B2BCheckout = lazy(() => import('../pages/b2b/checkout/page'));
const B2BRegister = lazy(() => import('../pages/b2b/register/page'));
const B2BLogin = lazy(() => import('../pages/b2b/login/page'));
const B2BOrders = lazy(() => import('../pages/b2b/orders/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/products',
    element: <Products />,
  },
  {
    path: '/product/:id',
    element: <ProductDetail />,
  },
  {
    path: '/categories',
    element: <Categories />,
  },
  {
    path: '/category/:id',
    element: <Category />,
  },
  {
    path: '/cart',
    element: <Cart />,
  },
  {
    path: '/checkout',
    element: <Checkout />,
  },
  {
    path: '/order-success',
    element: <OrderSuccess />,
  },
  {
    path: '/track-order',
    element: <TrackOrder />,
  },
  {
    path: '/shipping',
    element: <Shipping />,
  },
  {
    path: '/payment',
    element: <Payment />,
  },
  {
    path: '/returns',
    element: <Returns />,
  },
  {
    path: '/privacy',
    element: <Privacy />,
  },
  {
    path: '/terms',
    element: <Terms />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/faq',
    element: <FAQ />,
  },
  {
    path: '/blog',
    element: <Blog />,
  },
  {
    path: '/blog/:slug',
    element: <BlogDetail />,
  },
  {
    path: '/b2b',
    element: <B2BPage />,
  },
  {
    path: '/b2b/apply',
    element: <B2BApplyPage />,
  },
  {
    path: '/b2b/dashboard',
    element: <B2BDashboard />,
  },
  {
    path: '/b2b/quick-order',
    element: <B2BQuickOrder />,
  },
  {
    path: '/b2b/documents',
    element: <B2BDocumentsPage />,
  },
  {
    path: '/b2b/products',
    element: <B2BProducts />,
  },
  {
    path: '/b2b/product/:id',
    element: <B2BProductDetail />,
  },
  {
    path: '/b2b/cart',
    element: <B2BCart />,
  },
  {
    path: '/b2b/checkout',
    element: <B2BCheckout />,
  },
  {
    path: '/b2b/register',
    element: <B2BRegister />,
  },
  {
    path: '/b2b/login',
    element: <B2BLogin />,
  },
  {
    path: '/b2b/orders',
    element: <B2BOrders />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '/admin/orders',
    element: <AdminOrders />,
  },
  {
    path: '/admin/blog',
    element: <AdminBlog />,
  },
  {
    path: '/admin/reviews',
    element: <AdminReviews />,
  },
  {
    path: '/admin/b2b',
    element: <AdminB2B />,
  },
  {
    path: '/admin/b2b/pricing',
    element: <AdminB2BPricing />,
  },
  {
    path: '/admin/b2b/companies/:id',
    element: <CompanyProfile />,
  },
  {
    path: '/admin/b2b/documents',
    element: <AdminB2BDocuments />,
  },
  {
    path: '/invoice/:number',
    element: <InvoicePage />,
  },
  {
    path: '/leave-review',
    element: <LeaveReview />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
