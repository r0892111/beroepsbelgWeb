import { MetadataRoute } from 'next';
import { locales } from '@/i18n';
import { getCities, getTours, getProducts, getBlogs } from '@/lib/api/content';

const BASE_URL = 'https://beroepsbelg.be';

// Static pages that exist for all locales
// Note: Excludes private/transactional pages (admin, auth, booking flow, order flow, etc.)
const STATIC_PAGES = [
  '', // homepage
  '/tours',
  '/webshop',
  '/blog',
  '/faq',
  '/contact/contactformulier',
  '/lezing',
  '/pers',
  '/jobs/become-a-guide',
  '/b2b-offerte',
  '/airbnb',
  '/privacy',
  '/disclaimer',
  '/search',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Fetch all dynamic content
  const [cities, tours, products, blogs] = await Promise.all([
    getCities(),
    getTours(),
    getProducts(),
    getBlogs('nl'),
  ]);

  // 1. Static pages for all locales
  for (const page of STATIC_PAGES) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  // 2. City tour pages
  for (const city of cities) {
    if (city.status !== 'live') continue;
    
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/tours/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  // 3. Individual tour pages
  for (const tour of tours) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/tours/${tour.city}/${tour.slug}`,
        lastModified: tour.updatedAt ? new Date(tour.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // 4. Product pages
  for (const product of products) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/webshop/${product.uuid}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }
  }

  // 5. Blog posts
  for (const blog of blogs) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${blog.slug}`,
        lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return entries;
}
