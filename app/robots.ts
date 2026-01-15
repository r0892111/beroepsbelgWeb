import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/booking/cancelled/',
          '/order/cancelled/',
          '/choose-guide/',
          '/confirm-guide/',
          '/complete-tour/',
          '/aftercare/',
          '/unsubscribe/',
          '/form/',
        ],
      },
    ],
    sitemap: 'https://beroepsbelg.be/sitemap.xml',
  };
}
