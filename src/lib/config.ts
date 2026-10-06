/**
 * Application Configuration
 */

export const config = {
  app: {
    name: 'Fevzipaşa Tasarım Pazarı',
    description: 'Modern tasarım ve sanat ürünleri pazarı',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    version: '0.1.0',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 10000,
  },
  features: {
    products: true,
    search: true,
    reviews: true,
    wishlist: true,
    cart: true,
  },
  pagination: {
    defaultPageSize: 12,
    maxPageSize: 100,
  },
};

export default config;
