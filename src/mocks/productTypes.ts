export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  stock: number;
  weight?: string;
  volume?: string;
  alcohol?: string;
}
