/**
 * Meta Pixel Utility
 * Стандартни Facebook Pixel събития за e-commerce проследяване
 * Pixel ID: 4367746813495227
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

type FBQEvent = 
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Search'
  | 'ViewCategory'
  | 'AddToWishlist'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'Schedule'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe';

interface ViewContentParams {
  content_ids?: string[];
  content_type?: 'product' | 'product_group';
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
}

interface AddToCartParams {
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  value?: number;
  currency?: string;
  num_items?: number;
}

interface InitiateCheckoutParams {
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
}

interface PurchaseParams {
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  transaction_id?: string;
}

interface SearchParams {
  search_string?: string;
}

const PIXEL_ID = '4367746813495227';

function fbq(event: FBQEvent, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
  }
}

/**
 * Засича PageView — вика се при промяна на маршрут
 */
export function trackPageView(url?: string): void {
  fbq('PageView', url ? { page_url: url } : undefined);
}

/**
 * Засича разглеждане на продукт (ViewContent)
 */
export function trackViewContent(params: ViewContentParams): void {
  fbq('ViewContent', {
    content_ids: params.content_ids,
    content_type: params.content_type || 'product',
    content_name: params.content_name,
    content_category: params.content_category,
    value: params.value,
    currency: params.currency || 'EUR',
  });
}

/**
 * Засича добавяне в количката (AddToCart)
 */
export function trackAddToCart(params: AddToCartParams): void {
  fbq('AddToCart', {
    content_ids: params.content_ids,
    content_type: params.content_type || 'product',
    content_name: params.content_name,
    value: params.value,
    currency: params.currency || 'EUR',
    num_items: params.num_items,
  });
}

/**
 * Засича започване на checkout (InitiateCheckout)
 */
export function trackInitiateCheckout(params: InitiateCheckoutParams): void {
  fbq('InitiateCheckout', {
    content_ids: params.content_ids,
    content_type: params.content_type || 'product',
    value: params.value,
    currency: params.currency || 'EUR',
    num_items: params.num_items,
  });
}

/**
 * Засича успешна покупка (Purchase)
 */
export function trackPurchase(params: PurchaseParams): void {
  fbq('Purchase', {
    content_ids: params.content_ids,
    content_type: params.content_type || 'product',
    value: params.value,
    currency: params.currency || 'EUR',
    num_items: params.num_items,
    transaction_id: params.transaction_id,
  });
}

/**
 * Засича търсене (Search)
 */
export function trackSearch(params: SearchParams): void {
  fbq('Search', {
    search_string: params.search_string,
  });
}

/**
 * Засича разглеждане на категория (ViewCategory)
 */
export function trackViewCategory(category: string): void {
  fbq('ViewCategory', { content_category: category });
}

export default { trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout, trackPurchase, trackSearch, trackViewCategory };