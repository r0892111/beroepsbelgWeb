import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Admin and system routes
          '/admin/',
          '/api/',
          '/auth/',

          // Booking flow pages (transactional, not for indexing)
          '/booking/cancelled/',
          '/booking/success/',
          '/booking/payment-success/',

          // Order flow pages
          '/order/cancelled/',
          '/order/success/',

          // Lecture flow pages
          '/lecture/payment-success/',
          '/lecture/cancelled/',

          // Guide-related internal pages
          '/choose-guide/',
          '/confirm-guide/',
          '/complete-tour/',
          '/aftercare/',
          '/form/',

          // User-specific pages
          '/account/',
          '/unsubscribe/',

          // Custom form pages
          '/op-maat-form/',
        ],
      },
    ],
    sitemap: 'https://beroepsbelg.be/sitemap.xml',
    host: 'https://beroepsbelg.be',
  };
}
