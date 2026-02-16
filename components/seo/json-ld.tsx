/**
 * JSON-LD Structured Data Components for SEO
 * 
 * These components render Schema.org structured data that helps search engines
 * understand the content of the page and display rich snippets in search results.
 */

// Generic JSON-LD wrapper component
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// LocalBusiness schema for BeroepsBelg
export function LocalBusinessJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://beroepsbelg.be/#organization',
    name: 'BeroepsBelg',
    alternateName: 'Buro Beroepsbelg',
    description: 'Professionele stadsgids en city guide in België. Stadswandelingen, teambuilding en rondleidingen in Antwerpen, Brussel, Brugge, Gent, Mechelen en Leuven.',
    url: 'https://beroepsbelg.be',
    logo: 'https://beroepsbelg.be/Beroepsbelg Logo.png',
    image: 'https://beroepsbelg.be/Beroepsbelg Logo.png',
    priceRange: '€€',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BE',
      addressLocality: 'Antwerpen',
      addressRegion: 'Antwerpen',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 51.2194,
      longitude: 4.4025,
    },
    areaServed: [
      { '@type': 'City', name: 'Antwerpen', sameAs: 'https://www.wikidata.org/wiki/Q1286' },
      { '@type': 'City', name: 'Brussel', sameAs: 'https://www.wikidata.org/wiki/Q239' },
      { '@type': 'City', name: 'Brugge', sameAs: 'https://www.wikidata.org/wiki/Q12994' },
      { '@type': 'City', name: 'Gent', sameAs: 'https://www.wikidata.org/wiki/Q12968' },
      { '@type': 'City', name: 'Mechelen', sameAs: 'https://www.wikidata.org/wiki/Q162022' },
      { '@type': 'City', name: 'Leuven', sameAs: 'https://www.wikidata.org/wiki/Q118958' },
    ],
    sameAs: [
      'https://www.instagram.com/tanguyottomer/',
      'https://www.facebook.com/tanguy.ottomer/',
      'https://www.tiktok.com/@tanguyottomer',
    ],
    keywords: 'stadsgids antwerpen, guide in antwerp, stadswandelingen antwerpen, city tours antwerp, rondleidingen antwerpen',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Stadsgids Diensten',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Stadswandelingen Antwerpen',
            description: 'Professionele stadswandelingen met ervaren stadsgids in Antwerpen',
            areaServed: {
              '@type': 'City',
              name: 'Antwerpen',
            },
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Teambuilding',
            description: 'Teambuilding activiteiten en bedrijfsuitjes in Belgische steden, met focus op Antwerpen',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Zakelijke Rondleidingen',
            description: 'Op maat gemaakte rondleidingen voor bedrijven en organisaties in Antwerpen en andere Belgische steden',
          },
        },
      ],
    },
  };

  return <JsonLd data={data} />;
}

// TouristTrip schema for tour detail pages
interface TourJsonLdProps {
  name: string;
  description: string;
  image?: string;
  price?: number;
  currency?: string;
  duration: number; // in minutes
  startLocation?: string;
  city: string;
  url: string;
  languages?: string[];
}

export function TouristTripJsonLd({
  name,
  description,
  image,
  price,
  currency = 'EUR',
  duration,
  startLocation,
  city,
  url,
  languages = [],
}: TourJsonLdProps) {
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name,
    description,
    url,
    touristType: 'Cultural tourist',
    provider: {
      '@type': 'LocalBusiness',
      name: 'BeroepsBelg',
      url: 'https://beroepsbelg.be',
    },
  };

  if (image) {
    data.image = image;
  }

  if (price) {
    data.offers = {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url,
    };
  }

  if (duration) {
    // Convert minutes to ISO 8601 duration format
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    data.duration = hours > 0 
      ? `PT${hours}H${mins > 0 ? mins + 'M' : ''}`
      : `PT${mins}M`;
  }

  if (startLocation) {
    data.itinerary = {
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@type': 'Place',
            name: startLocation,
            address: {
              '@type': 'PostalAddress',
              addressLocality: city,
              addressCountry: 'BE',
            },
          },
        },
      ],
    };
  }

  if (languages.length > 0) {
    data.availableLanguage = languages.map((lang) => ({
      '@type': 'Language',
      name: lang,
    }));
  }

  return <JsonLd data={data} />;
}

// Product schema for webshop products
interface ProductJsonLdProps {
  name: string;
  description: string;
  image?: string;
  price: number;
  currency?: string;
  url: string;
  category?: string;
  sku?: string;
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  currency = 'EUR',
  url,
  category,
  sku,
}: ProductJsonLdProps) {
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: 'https://schema.org/InStock',
      url,
    },
    brand: {
      '@type': 'Brand',
      name: 'BeroepsBelg',
    },
  };

  if (image) {
    data.image = image;
  }

  if (category) {
    data.category = category;
  }

  if (sku) {
    data.sku = sku;
  }

  return <JsonLd data={data} />;
}

// FAQPage schema
interface FaqItem {
  question: string;
  answer: string;
}

interface FaqPageJsonLdProps {
  faqs: FaqItem[];
}

export function FaqPageJsonLd({ faqs }: FaqPageJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

// AggregateRating schema for reviews
interface AggregateRatingJsonLdProps {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export function AggregateRatingJsonLd({
  ratingValue,
  reviewCount,
  bestRating = 5,
  worstRating = 1,
}: AggregateRatingJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: ratingValue.toString(),
    reviewCount: reviewCount.toString(),
    bestRating: bestRating.toString(),
    worstRating: worstRating.toString(),
  };

  return <JsonLd data={data} />;
}

// Article schema for blog posts
interface ArticleJsonLdProps {
  title: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  url: string;
}

export function ArticleJsonLd({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
}: ArticleJsonLdProps) {
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: 'BeroepsBelg',
      logo: {
        '@type': 'ImageObject',
        url: 'https://beroepsbelg.be/Beroepsbelg Logo.png',
      },
    },
  };

  if (image) {
    data.image = image;
  }

  if (datePublished) {
    data.datePublished = datePublished;
  }

  if (dateModified) {
    data.dateModified = dateModified;
  }

  if (author) {
    data.author = {
      '@type': 'Person',
      name: author,
    };
  }

  return <JsonLd data={data} />;
}

// BreadcrumbList schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

// City/Place schema for city pages
interface CityJsonLdProps {
  name: string;
  nameEn?: string;
  nameFr?: string;
  nameDe?: string;
  description: string;
  descriptionEn?: string;
  descriptionFr?: string;
  descriptionDe?: string;
  url: string;
  image?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export function CityJsonLd({
  name,
  nameEn,
  nameFr,
  nameDe,
  description,
  descriptionEn,
  descriptionFr,
  descriptionDe,
  url,
  image,
  country = 'BE',
  coordinates,
}: CityJsonLdProps) {
  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'City',
    name,
    description,
    url,
    address: {
      '@type': 'PostalAddress',
      addressCountry: country,
      addressLocality: name,
    },
  };

  if (nameEn || nameFr || nameDe) {
    data.alternateName = [nameEn, nameFr, nameDe].filter(Boolean);
  }

  if (descriptionEn || descriptionFr || descriptionDe) {
    const descriptions = [descriptionEn, descriptionFr, descriptionDe].filter(Boolean);
    if (descriptions.length > 0) {
      data.description = [description, ...descriptions];
    }
  }

  if (image) {
    data.image = image;
  }

  if (coordinates) {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
  }

  return <JsonLd data={data} />;
}