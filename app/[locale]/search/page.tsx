'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, ShoppingBag, BookOpen, HelpCircle, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/data/types';
import { supabase } from '@/lib/supabase/client';

interface SearchResult {
  type: 'tour' | 'product' | 'lecture' | 'faq' | 'blog';
  id: string;
  title: string;
  description?: string;
  url: string;
  category?: string;
}

export default function SearchPage() {
  const params = useParams();
  const locale = params.locale as Locale;
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const t = useTranslations('search');
  
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lectures, setLectures] = useState<any[]>([]);
  const [faqItems, setFaqItems] = useState<any[]>([]);
  const [blogs, setBlogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!query.trim()) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tours
        const { data: toursData } = await supabase
          .from('tours_table_prod')
          .select('id, title, description, city, city_id, cities:city_id (slug)')
          .order('display_order', { ascending: true, nullsFirst: false });

        // Fetch products
        const { data: productsData } = await supabase
          .from('webshop_data')
          .select('uuid, Name, Description, Category')
          .order('Name', { ascending: true });

        // Fetch lectures
        const { data: lecturesData } = await supabase
          .from('lectures')
          .select('id, title_nl, title_en, title_fr, title_de, description_nl, description_en, description_fr, description_de')
          .order('created_at', { ascending: false });

        // Fetch FAQ items
        const { data: faqData } = await supabase
          .from('faq')
          .select('id, question_nl, question_en, question_fr, question_de, answer_nl, answer_en, answer_fr, answer_de')
          .order('display_order', { ascending: true, nullsFirst: false });

        // Fetch blogs
        const { data: blogsData } = await supabase
          .from('blogs')
          .select('id, slug, title, title_en, title_fr, title_de, excerpt, excerpt_en, excerpt_fr, excerpt_de')
          .eq('status', 'published')
          .order('published_at', { ascending: false });

        setTours(toursData || []);
        setProducts(productsData || []);
        setLectures(lecturesData || []);
        setFaqItems(faqData || []);
        setBlogs(blogsData || []);
      } catch (error) {
        console.error('Error fetching search data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query, locale]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const queryLower = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search tours
    tours.forEach((tour: any) => {
      const title = tour.title?.toLowerCase() || '';
      const descriptionNl = tour.description?.toLowerCase() || '';
      const descriptionEn = tour.description_en?.toLowerCase() || '';
      const descriptionFr = tour.description_fr?.toLowerCase() || '';
      const descriptionDe = tour.description_de?.toLowerCase() || '';
      const city = tour.city?.toLowerCase() || '';
      const citySlug = tour.cities?.slug || tour.city?.toLowerCase() || 'unknown';

      // Get description in current locale
      const getLocalizedDescription = () => {
        if (locale === 'en' && tour.description_en) return tour.description_en;
        if (locale === 'fr' && tour.description_fr) return tour.description_fr;
        if (locale === 'de' && tour.description_de) return tour.description_de;
        return tour.description;
      };

      if (title.includes(queryLower) || descriptionNl.includes(queryLower) ||
          descriptionEn.includes(queryLower) || descriptionFr.includes(queryLower) ||
          descriptionDe.includes(queryLower) || city.includes(queryLower)) {
        // Generate slug from title (matching the slugify function used in content.ts)
        const slug = tour.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        results.push({
          type: 'tour',
          id: tour.id,
          title: tour.title || 'Untitled Tour',
          description: getLocalizedDescription(),
          url: `/${locale}/tours/${citySlug}/${slug}`,
          category: tour.city,
        });
      }
    });

    // Search products
    products.forEach((product: any) => {
      const title = product.Name?.toLowerCase() || '';
      const description = product.Description?.toLowerCase() || '';
      const category = product.Category?.toLowerCase() || '';
      
      if (title.includes(queryLower) || description.includes(queryLower) || category.includes(queryLower)) {
        results.push({
          type: 'product',
          id: product.uuid,
          title: product.Name || 'Untitled Product',
          description: product.Description,
          url: `/${locale}/webshop/${product.uuid}`,
          category: product.Category,
        });
      }
    });

    // Search lectures
    lectures.forEach((lecture: any) => {
      const title = (locale === 'nl' ? lecture.title_nl :
                    locale === 'en' ? lecture.title_en :
                    locale === 'fr' ? lecture.title_fr :
                    lecture.title_de)?.toLowerCase() || '';
      const description = (locale === 'nl' ? lecture.description_nl :
                          locale === 'en' ? lecture.description_en :
                          locale === 'fr' ? lecture.description_fr :
                          lecture.description_de)?.toLowerCase() || '';
      
      if (title.includes(queryLower) || description.includes(queryLower)) {
        results.push({
          type: 'lecture',
          id: lecture.id,
          title: (locale === 'nl' ? lecture.title_nl :
                  locale === 'en' ? lecture.title_en :
                  locale === 'fr' ? lecture.title_fr :
                  lecture.title_de) || 'Untitled Lecture',
          description: locale === 'nl' ? lecture.description_nl :
                      locale === 'en' ? lecture.description_en :
                      locale === 'fr' ? lecture.description_fr :
                      lecture.description_de,
          url: `/${locale}/lezing`,
        });
      }
    });

    // Search FAQ
    faqItems.forEach((faq: any) => {
      const question = (locale === 'nl' ? faq.question_nl :
                       locale === 'en' ? faq.question_en :
                       locale === 'fr' ? faq.question_fr :
                       faq.question_de)?.toLowerCase() || '';
      const answer = (locale === 'nl' ? faq.answer_nl :
                     locale === 'en' ? faq.answer_en :
                     locale === 'fr' ? faq.answer_fr :
                     faq.answer_de)?.toLowerCase() || '';
      
      if (question.includes(queryLower) || answer.includes(queryLower)) {
        results.push({
          type: 'faq',
          id: faq.id,
          title: (locale === 'nl' ? faq.question_nl :
                  locale === 'en' ? faq.question_en :
                  locale === 'fr' ? faq.question_fr :
                  faq.question_de) || 'Untitled Question',
          description: locale === 'nl' ? faq.answer_nl :
                      locale === 'en' ? faq.answer_en :
                      locale === 'fr' ? faq.answer_fr :
                      faq.answer_de,
          url: `/${locale}/faq#${faq.id}`,
        });
      }
    });

    // Search blogs
    blogs.forEach((blog: any) => {
      const title = (locale === 'nl' ? blog.title : 
                    locale === 'en' ? blog.title_en :
                    locale === 'fr' ? blog.title_fr :
                    blog.title_de)?.toLowerCase() || '';
      const excerpt = (locale === 'nl' ? blog.excerpt :
                      locale === 'en' ? blog.excerpt_en :
                      locale === 'fr' ? blog.excerpt_fr :
                      blog.excerpt_de)?.toLowerCase() || '';
      
      if (title.includes(queryLower) || excerpt.includes(queryLower)) {
        results.push({
          type: 'blog',
          id: blog.id,
          title: (locale === 'nl' ? blog.title :
                  locale === 'en' ? blog.title_en :
                  locale === 'fr' ? blog.title_fr :
                  blog.title_de) || 'Untitled Blog',
          description: locale === 'nl' ? blog.excerpt :
                      locale === 'en' ? blog.excerpt_en :
                      locale === 'fr' ? blog.excerpt_fr :
                      blog.excerpt_de,
          url: `/${locale}/blog/${blog.slug}`,
        });
      }
    });

    return results;
  }, [query, tours, products, lectures, faqItems, blogs, locale]);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'tour':
        return <MapPin className="w-5 h-5" />;
      case 'product':
        return <ShoppingBag className="w-5 h-5" />;
      case 'lecture':
        return <BookOpen className="w-5 h-5" />;
      case 'faq':
        return <HelpCircle className="w-5 h-5" />;
      case 'blog':
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'tour':
        return 'Tour';
      case 'product':
        return 'Product';
      case 'lecture':
        return 'Lecture';
      case 'faq':
        return 'FAQ';
      case 'blog':
        return 'Blog';
    }
  };

  const groupedResults = useMemo(() => {
    const grouped: Record<SearchResult['type'], SearchResult[]> = {
      tour: [],
      product: [],
      lecture: [],
      faq: [],
      blog: [],
    };

    searchResults.forEach((result) => {
      grouped[result.type].push(result);
    });

    return grouped;
  }, [searchResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <div className="text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-neutral-400 animate-pulse" />
          <p className="text-neutral-600">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {t('title') || 'Search Results'}
          </h1>
          {query && (
            <p className="text-neutral-600 mb-8">
              {t('resultsFor') || 'Results for'}: <span className="font-semibold">"{query}"</span>
            </p>
          )}

          {!query.trim() ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600 text-lg">{t('noQuery') || 'Enter a search term to find tours, products, lectures, FAQs, and blogs.'}</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600 text-lg">{t('noResults') || 'No results found.'}</p>
              <p className="text-neutral-500 mt-2">{t('tryDifferent') || 'Try a different search term.'}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedResults).map(([type, results]) => {
                if (results.length === 0) return null;
                
                return (
                  <div key={type}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      {getTypeIcon(type as SearchResult['type'])}
                      {getTypeLabel(type as SearchResult['type'])} ({results.length})
                    </h2>
                    <div className="space-y-3">
                      {results.map((result) => (
                        <Link
                          key={result.id}
                          href={result.url}
                          className="block p-4 bg-white rounded-lg border border-neutral-200 hover:border-neutral-400 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1 text-neutral-500">
                              {getTypeIcon(result.type)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                              {result.description && (
                                <p className="text-neutral-600 text-sm line-clamp-2">
                                  {result.description}
                                </p>
                              )}
                              {result.category && (
                                <span className="inline-block mt-2 text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                                  {result.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

