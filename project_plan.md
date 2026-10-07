# K-FOOD B2B Wholesale Portal

## 1. Project Description
Enterprise-grade B2B wholesale portal integrated into the existing K-FOOD e-commerce website. The platform enables restaurants, Asian grocery stores, supermarkets, distributors, hotels, and cafés to apply for wholesale accounts, receive custom pricing, place bulk orders, and manage their business relationship with K-FOOD.

**Target users:** B2B buyers (restaurants, stores, distributors, HoReCa)
**Core value:** Professional wholesale experience with custom pricing, bulk ordering, document management, and dedicated account support — completely separate from the retail store.

## 2. Page Structure

### Existing pages (unchanged):
- `/` - Home (retail)
- `/products` - Product List (retail)
- `/product/:id` - Product Detail (retail)
- `/cart` - Cart
- `/checkout` - Checkout
- `/admin` - Admin Dashboard
- `/admin/orders` - Admin Orders
- `/admin/blog` - Admin Blog
- `/admin/reviews` - Admin Reviews
- `/b2b` - B2B Landing (to be upgraded)

### New B2B pages:
- `/b2b` - B2B Wholesale Landing Page (upgraded)
- `/b2b/apply` - B2B Application Form
- `/b2b/dashboard` - B2B Customer Dashboard (after approval)
- `/b2b/quick-order` - Quick Order Interface
- `/b2b/documents` - Document Center
- `/b2b/support` - Support Tickets

### New Admin pages:
- `/admin/b2b` - B2B Management Dashboard
- `/admin/b2b/applications` - Application Review
- `/admin/b2b/companies` - Company Management
- `/admin/b2b/companies/:id` - Company Profile
- `/admin/b2b/pricing` - Pricing Management
- `/admin/b2b/documents` - Document Management
- `/admin/b2b/reports` - B2B Reports

## 3. Core Features

### Phase 1: Foundation (Database + Landing + Applications + Admin) ✅ COMPLETED
- [x] B2B database schema (companies, applications, pricing_tiers, contacts, addresses, documents) — 14 tables with RLS
- [x] Enterprise B2B landing page with benefits, how it works, CTA
- [x] B2B application form (company info, contacts, business info, legal)
- [x] Application workflow (Pending → Approved/Rejected/More Info)
- [x] Admin B2B dashboard with applications list
- [x] Application review (approve/reject/request info/suspend)
- [x] Company auto-creation on approval with contacts and addresses
- [x] B2B button in Admin header navigation
- [x] 7 pricing tiers seeded (Retail, Bronze, Silver, Gold, Restaurant, Distributor, VIP)
- [x] Routes: /b2b, /b2b/apply, /admin/b2b

### Phase 2: Pricing Engine & Company Management ✅ COMPLETED
- [x] Pricing tiers CRUD management (admin/b2b/pricing)
- [x] Individual product pricing per company (via edit modal)
- [x] Category-level discounts per tier/company
- [x] Brand-level discounts per tier/company
- [x] Global company discount (inline edit in companies table)
- [x] Price priority chain (Company > Product > Category > Brand > Tier > Retail)
- [x] Product visibility (Retail/Wholesale/Restaurant/Distributor/VIP/Hidden) — in ProductEditModal
- [x] Company profile detail page (admin/b2b/companies/:id)
- [x] Multiple contacts per company (add/delete in company profile)
- [x] Multiple addresses per company (add/delete in company profile)
- [x] Internal notes editable in company profile
- [x] Pricing tier assignment per company
- [x] Credit limit setting per company
- [x] Routes: /admin/b2b/pricing, /admin/b2b/companies/:id

### Phase 3: B2B Customer Experience ✅ COMPLETED
- [x] B2B customer dashboard (welcome, profile, discounts, orders summary, products)
- [x] Quick order interface (SKU search, bulk input, cart with B2B pricing)
- [x] Order rules management in Admin (min/max order value, min cart qty per company/tier)
- [x] Payment rules management in Admin (bank transfer, COD, card, Net7/15/30/60 per company)
- [x] Routes: /b2b/dashboard, /b2b/quick-order

### Phase 4: Documents & Support ✅ COMPLETED
- [x] Admin Document Center — upload to Supabase Storage, categorize, assign by tier/company
- [x] B2B Document Portal — view/download documents filtered by company's tier and direct assignments
- [x] Support tickets table in DB (ready for UI in next iteration)
- [x] Document categories: catalogue, price_list, certificate, spec, marketing, logo
- [x] Routes: /b2b/documents, /admin/b2b/documents

### Phase 5: Advanced
- [ ] Multi-user company accounts
- [ ] Credit limits
- [ ] Purchase orders
- [ ] Advanced reports
- [ ] CSV/Excel import for bulk orders
- [ ] API for ERP integration

## 4. Data Model Design

### Existing tables (unchanged):
- `products` — adds `visibility` field
- `orders` — adds `b2b_company_id`, `is_b2b_order` fields
- `user_roles` — adds `b2b` role options

### New tables:

#### b2b_companies
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_name | text | Company legal name |
| bulstat | text | Company registration number |
| vat_number | text | VAT number |
| mol | text | Legal representative |
| address | text | Company address |
| city | text | City |
| postal_code | text | Postal code |
| country | text | Country |
| phone | text | Company phone |
| email | text | Company email |
| website | text | Company website |
| business_type | text | Restaurant/Store/Distributor/etc |
| years_in_business | integer | Years operating |
| number_of_locations | integer | Number of locations |
| estimated_monthly_value | text | Estimated order value |
| status | text | active/suspended/inactive |
| pricing_tier_id | uuid | FK to pricing_tiers |
| global_discount | numeric | Company-wide discount % |
| credit_limit | numeric | Credit limit amount |
| sales_rep_id | uuid | FK to sales_reps |
| internal_notes | text | Admin-only notes |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

#### b2b_applications
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_name | text | Company name |
| bulstat | text | Registration number |
| vat_number | text | VAT number |
| mol | text | Legal representative |
| address | text | Address |
| city | text | City |
| postal_code | text | Postal code |
| country | text | Country |
| phone | text | Phone |
| email | text | Company email |
| website | text | Website |
| contact_first_name | text | Contact first name |
| contact_last_name | text | Contact last name |
| contact_position | text | Contact position |
| contact_mobile | text | Contact mobile |
| contact_email | text | Contact email |
| business_type | text | Business type |
| years_in_business | integer | Years in business |
| number_of_locations | integer | Number of locations |
| estimated_monthly_value | text | Estimated monthly order value |
| estimated_monthly_volume | text | Estimated monthly volume |
| existing_brands | text | Korean brands already sold |
| imports_products | boolean | Do they import? |
| requires_pallets | boolean | Pallet quantities? |
| additional_notes | text | Additional info |
| accept_terms | boolean | Accepted terms |
| accept_privacy | boolean | Accepted privacy policy |
| confirm_accurate | boolean | Confirmed info accurate |
| status | text | pending/approved/rejected/more_info |
| reviewer_id | uuid | Admin who reviewed |
| review_notes | text | Admin review notes |
| company_id | uuid | FK to company (after approval) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |
| reviewed_at | timestamptz | When reviewed |

#### b2b_pricing_tiers
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | text | Tier name (Bronze, Silver, etc.) |
| description | text | Tier description |
| default_discount | numeric | Default discount % |
| sort_order | integer | Display order |
| is_active | boolean | Active status |
| created_at | timestamptz | Auto |

#### b2b_company_contacts
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK to b2b_companies |
| first_name | text | First name |
| last_name | text | Last name |
| position | text | Job position |
| email | text | Email |
| mobile | text | Mobile phone |
| is_primary | boolean | Primary contact |
| created_at | timestamptz | Auto |

#### b2b_company_addresses
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK to b2b_companies |
| type | text | billing/shipping/warehouse |
| address | text | Street address |
| city | text | City |
| postal_code | text | Postal code |
| country | text | Country |
| is_default | boolean | Default address |
| created_at | timestamptz | Auto |

#### b2b_product_pricing
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK (optional, null = tier-level) |
| pricing_tier_id | uuid | FK (optional) |
| product_id | integer | FK to products |
| custom_price | numeric | Custom price |
| discount_percent | numeric | Discount % |
| is_active | boolean | Active |
| created_at | timestamptz | Auto |

#### b2b_category_discounts
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK (optional) |
| pricing_tier_id | uuid | FK (optional) |
| category | text | Product category |
| discount_percent | numeric | Discount % |
| created_at | timestamptz | Auto |

#### b2b_documents
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| title | text | Document title |
| description | text | Description |
| file_url | text | File URL (Supabase Storage) |
| file_type | text | pdf/xlsx/docx/image |
| category | text | price_list/catalogue/certificate/spec/marketing/logo |
| visibility | text | all/tier/company |
| tier_id | uuid | FK (if visibility=tier) |
| company_id | uuid | FK (if visibility=company) |
| created_at | timestamptz | Auto |

#### b2b_order_rules
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK (null = global default) |
| pricing_tier_id | uuid | FK (null = global default) |
| min_order_value | numeric | Minimum order value |
| min_cart_quantity | integer | Minimum cart items |
| min_product_quantity | integer | Minimum per product |
| max_order_value | numeric | Maximum order value |
| created_at | timestamptz | Auto |

#### b2b_payment_rules
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK |
| payment_method | text | bank_transfer/cod/card/net7/net15/net30/net60 |
| is_enabled | boolean | Enabled? |
| created_at | timestamptz | Auto |

#### b2b_sales_reps
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| name | text | Rep name |
| email | text | Rep email |
| phone | text | Rep phone |
| is_active | boolean | Active status |
| created_at | timestamptz | Auto |

#### b2b_support_tickets
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| company_id | uuid | FK |
| subject | text | Ticket subject |
| message | text | Ticket message |
| status | text | open/in_progress/resolved/closed |
| priority | text | low/medium/high/urgent |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

#### b2b_notifications
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| type | text | new_application/large_order/company_update/doc_download/support |
| title | text | Notification title |
| message | text | Notification message |
| is_read | boolean | Read status |
| related_id | uuid | Related entity ID |
| created_at | timestamptz | Auto |

### Products table additions:
| Field | Type | Description |
|-------|------|-------------|
| visibility | text | retail/wholesale/restaurant/distributor/vip/hidden |

### Orders table additions:
| Field | Type | Description |
|-------|------|-------------|
| b2b_company_id | uuid | FK to b2b_companies |
| is_b2b_order | boolean | Whether this is a B2B order |
| payment_terms | text | net7/net15/net30/net60 |

## 5. Backend / Third-party Integration Plan
- Supabase: Database + Auth + Storage (documents) + Edge Functions
- Stripe: Already connected for payments
- Resend: For admin notification emails (future)
- Shopify: Not needed for B2B

## 6. Development Phase Plan

### Phase 1: Foundation (Database + Landing + Applications + Admin) ✅ COMPLETED
- Goal: Create B2B database schema, enterprise landing page, application form, and admin management
- Deliverable: Working application workflow with admin approval system

### Phase 2: Pricing Engine & Company Management ✅ COMPLETED
- Goal: Custom pricing system with tiers, category/brand/company discounts, product visibility
- Deliverable: Complete pricing engine with admin management UI

### Phase 3: B2B Customer Experience ✅ COMPLETED
- Goal: Customer dashboard, quick order, order rules, wholesale cart
- Deliverable: Full B2B ordering experience

### Phase 4: Documents & Support ✅ COMPLETED
- Goal: Document center, support tickets, notifications, sales reps
- Deliverable: Complete B2B portal with support ecosystem

### Phase 5: Advanced Features
- Goal: Multi-user accounts, credit limits, reports, API, ERP readiness
- Deliverable: Enterprise-ready platform

## 7. Key Business Rules (latest decisions)

### Catalog Number (каталожен номер) — single source of truth
- The `sku` field on `products` IS the catalog number used for invoicing.
- Every product must have a unique catalog number. Admin panel shows red "Няма №" badge for missing and amber "Дубл." badge for duplicates, plus quick filters (Без № / Дублирани).
- Catalog number is displayed prominently in the B2B catalog, product detail, quick order, and order history.

### Invoices & trade documents — ADMIN ONLY
- Invoices and trade documents are generated EXCLUSIVELY by the admin (in `/admin/orders`), never by the B2B client.
- Removed all client-facing invoice/document buttons from `/b2b/orders` and `/b2b/dashboard`. Clients only see order number, status, items, and total.

### Backorder — everything orderable
- All products (including `in_stock = false`) remain visible and orderable in B2B with a "За заявка · 10–20 дни" label. No quantity limits.