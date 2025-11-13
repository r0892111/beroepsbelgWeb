import { Product } from './types';

export const products: Product[] = [
  {
    slug: 'guidebook-antwerp',
    title: {
      nl: 'Gidsboek Antwerpen',
      en: 'Guidebook Antwerp',
      fr: 'Guide Anvers',
      de: 'Reiseführer Antwerpen'
    },
    price: 24.95,
    label: '2e DRUK'
  },
  {
    slug: 'city-map-brussels',
    title: {
      nl: 'Stadskaart Brussel',
      en: 'City Map Brussels',
      fr: 'Plan de Ville Bruxelles',
      de: 'Stadtplan Brüssel'
    },
    price: 12.50
  },
  {
    slug: 'walking-routes-flanders',
    title: {
      nl: 'Wandelroutes Vlaanderen',
      en: 'Walking Routes Flanders',
      fr: 'Itinéraires de Randonnée Flandre',
      de: 'Wanderrouten Flandern'
    },
    price: 19.99
  },
  {
    slug: 'gift-voucher',
    title: {
      nl: 'Cadeaubon €50',
      en: 'Gift Voucher €50',
      fr: 'Bon Cadeau €50',
      de: 'Geschenkgutschein €50'
    },
    price: 50.00
  },
  {
    slug: 'history-book-belgium',
    title: {
      nl: 'Geschiedenisboek België',
      en: 'History Book Belgium',
      fr: 'Livre d\'Histoire Belgique',
      de: 'Geschichtsbuch Belgien'
    },
    price: 29.95
  },
  {
    slug: 'postcards-set',
    title: {
      nl: 'Ansichtkaarten Set (10 stuks)',
      en: 'Postcard Set (10 pieces)',
      fr: 'Ensemble de Cartes Postales (10 pièces)',
      de: 'Postkarten-Set (10 Stück)'
    },
    price: 8.50
  }
];
