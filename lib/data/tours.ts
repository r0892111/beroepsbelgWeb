import { Tour } from './types';

export const tours: Tour[] = [
  {
    citySlug: 'antwerpen',
    slug: 'cadeaubon',
    title: {
      nl: 'Cadeaubon',
      en: 'Gift Voucher',
      fr: 'Bon Cadeau',
      de: 'Geschenkgutschein'
    },
    thumbnail: '/Tours Images/Antwerp Images/Cadeaubon.png',
    images: ['/Tours Images/Antwerp Images/Cadeaubon.png'],
    shortDescription: {
      nl: 'Het perfecte geschenk: geef een unieke ervaring cadeau',
      en: 'The perfect gift: give a unique experience',
      fr: 'Le cadeau parfait: offrez une expérience unique',
      de: 'Das perfekte Geschenk: Schenken Sie ein einzigartiges Erlebnis'
    },
    description: {
      nl: 'Verken diverse en boeiende rondleidingen op het gebied van cultuur, geschiedenis, gastronomie en architectuur. Met slechts enkele klikken verschijnt deze unieke verrassing in je mailbox. Eenvoudig te bestellen en direct klaar om te delen met vrienden, familie of collega\'s. Geef geen gewoon cadeau, geef een ervaring! Ontdek de wereld om je heen met de magie van BeroepsBelg rondleidingen.',
      en: 'Explore diverse and fascinating tours in culture, history, gastronomy and architecture. With just a few clicks, this unique surprise appears in your mailbox. Easy to order and ready to share with friends, family or colleagues. Don\'t give an ordinary gift, give an experience! Discover the world around you with the magic of BeroepsBelg tours.',
      fr: 'Explorez des visites diverses et fascinantes dans la culture, l\'histoire, la gastronomie et l\'architecture. En quelques clics seulement, cette surprise unique apparaît dans votre boîte mail. Facile à commander et prêt à partager avec vos amis, votre famille ou vos collègues. N\'offrez pas un cadeau ordinaire, offrez une expérience! Découvrez le monde qui vous entoure avec la magie des visites BeroepsBelg.',
      de: 'Erkunden Sie vielfältige und faszinierende Touren in Kultur, Geschichte, Gastronomie und Architektur. Mit nur wenigen Klicks erscheint diese einzigartige Überraschung in Ihrer Mailbox. Einfach zu bestellen und bereit, mit Freunden, Familie oder Kollegen zu teilen. Schenken Sie kein gewöhnliches Geschenk, schenken Sie ein Erlebnis! Entdecken Sie die Welt um Sie herum mit der Magie der BeroepsBelg-Touren.'
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'local-stories-of-antwerp',
    title: {
      nl: 'Local Stories of Antwerp',
      en: 'Local Stories of Antwerp',
      fr: 'Histoires Locales d\'Anvers',
      de: 'Lokale Geschichten aus Antwerpen'
    },
    price: 35,
    badge: 'NIEUW',
    thumbnail: '/Tours Images/Antwerp Images/Local Stories Of Antwerp.jpg',
    images: ['/Tours Images/Antwerp Images/Local Stories Of Antwerp.jpg'],
    shortDescription: {
      nl: 'Elke zaterdag ontdek je de geheimen van de mooiste Stad van België',
      en: 'Every Saturday discover the secrets of the most beautiful city of Belgium',
      fr: 'Chaque samedi, découvrez les secrets de la plus belle ville de Belgique',
      de: 'Jeden Samstag entdecken Sie die Geheimnisse der schönsten Stadt Belgiens'
    },
    description: {
      nl: 'Elke zaterdag kan je mee aansluiten bij een groep met onze expert aan je zijde. Zo ontdek je de geheimen van de mooiste Stad van België. Diamanten, mode, architectuur en koekjes komen allemaal aan bod tijdens deze boeiende tour.',
      en: 'Every Saturday you can join a group with our expert by your side. Discover the secrets of the most beautiful city of Belgium. Diamonds, fashion, architecture and cookies all feature in this fascinating tour.',
      fr: 'Chaque samedi, vous pouvez rejoindre un groupe avec notre expert à vos côtés. Découvrez les secrets de la plus belle ville de Belgique. Diamants, mode, architecture et biscuits sont tous au programme de cette visite fascinante.',
      de: 'Jeden Samstag können Sie sich einer Gruppe mit unserem Experten an Ihrer Seite anschließen. Entdecken Sie die Geheimnisse der schönsten Stadt Belgiens. Diamanten, Mode, Architektur und Kekse sind alle Teil dieser faszinierenden Tour.'
    },
    details: {
      start: {
        nl: 'Hal Centraal Station (beneden aan de marmeren trap)',
        en: 'Central Station Hall (downstairs at the marble stairs)',
        fr: 'Hall de la Gare Centrale (en bas à l\'escalier en marbre)',
        de: 'Hauptbahnhof Halle (unten an der Marmortreppe)'
      },
      end: {
        nl: 'Grote Markt',
        en: 'Grote Markt',
        fr: 'Grote Markt',
        de: 'Grote Markt'
      },
      duration: {
        nl: '14-16u',
        en: '2-4 PM',
        fr: '14h-16h',
        de: '14-16 Uhr'
      },
      languages: {
        nl: 'Engels',
        en: 'English',
        fr: 'Anglais',
        de: 'Englisch'
      },
      extraInfo: {
        nl: 'Opgelet: plaatsen zijn beperkt',
        en: 'Please note: places are limited',
        fr: 'Attention: les places sont limitées',
        de: 'Achtung: Die Plätze sind begrenzt'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'antwerpen-op-maat',
    title: {
      nl: 'Antwerpen op Maat',
      en: 'Tailor-Made Antwerp',
      fr: 'Anvers sur Mesure',
      de: 'Antwerpen nach Maß'
    },
    price: 24.95,
    badge: 'EXCLUSIEF',
    thumbnail: '/Tours Images/Antwerp Images/Antwerpen Op Maat.jpg',
    images: ['/Tours Images/Antwerp Images/Antwerpen Op Maat.jpg'],
    shortDescription: {
      nl: 'Een tour geheel naar jouw wensen ontworpen',
      en: 'A tour completely designed to your wishes',
      fr: 'Une visite entièrement conçue selon vos souhaits',
      de: 'Eine Tour, die ganz nach Ihren Wünschen gestaltet ist'
    },
    description: {
      nl: 'Wil je graag een tour geheel naar jouw wensen laten ontwerpen? Kan je geen keuze maken tussen onze tours en wil je een mix van verschillende wandelingen? Of heb je een specifiek onderwerp waar je je graag laat in onderdompelen? Dan is "Antwerpen op Maat" de beste keuze voor jou.\n\nToch nog enkele vragen? Stel ze via onze chatbox rechtsonderaan de website of neem een kijkje op onze FAQ-pagina.\n\nBoek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'Would you like a tour completely designed to your wishes? Can\'t choose between our tours and want a mix of different walks? Or do you have a specific topic you\'d like to immerse yourself in? Then "Antwerpen op Maat" is the best choice for you.\n\nStill have questions? Ask them via our chatbox at the bottom right of the website or take a look at our FAQ page.\n\nBook via our online payment platform and receive 10% discount.',
      fr: 'Souhaitez-vous une visite entièrement conçue selon vos souhaits? Vous ne pouvez pas choisir entre nos visites et vous voulez un mélange de différentes promenades? Ou avez-vous un sujet spécifique dans lequel vous aimeriez vous plonger? Alors "Antwerpen op Maat" est le meilleur choix pour vous.\n\nVous avez encore des questions? Posez-les via notre chatbox en bas à droite du site web ou consultez notre page FAQ.\n\nRéservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Möchten Sie eine Tour, die ganz nach Ihren Wünschen gestaltet ist? Können Sie sich nicht zwischen unseren Touren entscheiden und möchten eine Mischung aus verschiedenen Spaziergängen? Oder haben Sie ein bestimmtes Thema, in das Sie eintauchen möchten? Dann ist "Antwerpen op Maat" die beste Wahl für Sie.\n\nHaben Sie noch Fragen? Stellen Sie sie über unsere Chatbox unten rechts auf der Website oder schauen Sie sich unsere FAQ-Seite an.\n\nBuchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Zelf te kiezen',
        en: 'Your choice',
        fr: 'Votre choix',
        de: 'Ihre Wahl'
      },
      end: {
        nl: 'Zelf te kiezen',
        en: 'Your choice',
        fr: 'Votre choix',
        de: 'Ihre Wahl'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'het-zuid-oud-en-nieuw',
    title: {
      nl: 'Het Zuid: Oud & Nieuw',
      en: 'Het Zuid: Old & New',
      fr: 'Het Zuid: Ancien & Nouveau',
      de: 'Het Zuid: Alt & Neu'
    },
    price: 19.95,
    thumbnail: '/Tours Images/Antwerp Images/hetzuid_oudennieuw2.jpg',
    images: ['/Tours Images/Antwerp Images/hetzuid_oudennieuw1.jpg', '/Tours Images/Antwerp Images/hetzuid_oudennieuw2.jpg', '/Tours Images/Antwerp Images/hetzuid_oudennieuw3.jpg', '/Tours Images/Antwerp Images/hetzuid_oudennieuw4.jpg'],
    shortDescription: {
      nl: 'Ontdek hoe het Oude Zuid tot stand is gekomen',
      en: 'Discover how the Old South came into being',
      fr: 'Découvrez comment le Vieux Sud est né',
      de: 'Entdecken Sie, wie das alte Süden entstanden ist'
    },
    description: {
      nl: 'Kom alles te weten over hoe het Oude Zuid tot stand is gekomen. Het KMSKA, het Zuidpark, de vernieuwde kaaien, het oude Zuidstation, het Nieuwe Justitiepaleis: alles kom je te weten tijdens deze boeiende tour. Ontdek de leuke weetjes van deze unieke buurt van Antwerpen.\n\nWandeling in het oude én het nieuwe Zuid.\n\nDeze tour is ook mogelijk als lezing.\n\nWil je graag de tour "Het Zuid: Oud & Nieuw" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'Learn all about how the Old South came into being. The KMSKA, the South Park, the renovated quays, the old South Station, the New Palace of Justice: you\'ll learn everything during this fascinating tour. Discover the fun facts of this unique neighborhood of Antwerp.\n\nWalk in the old and the new South.\n\nThis tour is also available as a lecture.\n\nWould you like to book the tour "Het Zuid: Oud & Nieuw", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'Apprenez tout sur la façon dont le Vieux Sud est né. Le KMSKA, le Parc du Sud, les quais rénovés, l\'ancienne gare du Sud, le Nouveau Palais de Justice: vous apprendrez tout lors de cette visite fascinante. Découvrez les faits amusants de ce quartier unique d\'Anvers.\n\nPromenade dans l\'ancien et le nouveau Sud.\n\nCette visite est également disponible sous forme de conférence.\n\nVous souhaitez réserver la visite "Het Zuid: Oud & Nieuw", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Erfahren Sie alles darüber, wie das alte Süden entstanden ist. Das KMSKA, der Südpark, die renovierten Kais, der alte Südbahnhof, der neue Justizpalast: Sie erfahren alles während dieser faszinierenden Tour. Entdecken Sie die lustigen Fakten dieses einzigartigen Viertels von Antwerpen.\n\nSpaziergang im alten und neuen Süden.\n\nDiese Tour ist auch als Vortrag verfügbar.\n\nMöchten Sie die Tour "Het Zuid: Oud & Nieuw" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Trappen van het KMSKA',
        en: 'Stairs of the KMSKA',
        fr: 'Escaliers du KMSKA',
        de: 'Treppen des KMSKA'
      },
      end: {
        nl: 'Trappen van het KMSKA',
        en: 'Stairs of the KMSKA',
        fr: 'Escaliers du KMSKA',
        de: 'Treppen des KMSKA'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'cafelegendes-in-centrum',
    title: {
      nl: 'Cafélegendes in \'t Centrum',
      en: 'Café Legends in the Center',
      fr: 'Légendes de Café au Centre',
      de: 'Café-Legenden im Zentrum'
    },
    price: 35,
    thumbnail: '/Tours Images/Antwerp Images/cafelegendesintcentrum.jpg',
    images: ['/Tours Images/Antwerp Images/cafelegendesintcentrum.jpg'],
    shortDescription: {
      nl: 'Stadslegendes met dorstlessende stops in bruine kroegjes',
      en: 'City legends with thirst-quenching stops in brown pubs',
      fr: 'Légendes de la ville avec des arrêts rafraîchissants dans des cafés bruns',
      de: 'Stadtlegenden mit durstlöschenden Stopps in braunen Kneipen'
    },
    description: {
      nl: 'De geheimen van enkele stadslegendes, aangevuld met leuke, dorstlessende stops in verschillende bruine kroegjes, is de rode draad van de succesvolle stadswandeling "Cafélegendes 1". Bedrijven, families en vrienden kunnen hier hun hart ophalen; want zeg nu zelf: wie drinkt er niet graag in goed gezelschap op een mooie plek een lekker drankje?\n\nWil je graag de tour "Cafélegendes in \'t Centrum" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'The secrets of some city legends, supplemented with fun, thirst-quenching stops in various brown pubs, is the common thread of the successful city walk "Cafélegendes 1". Companies, families and friends can have a great time here; because let\'s face it: who doesn\'t enjoy a nice drink in good company in a beautiful place?\n\nWould you like to book the tour "Cafélegendes in \'t Centrum", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'Les secrets de certaines légendes de la ville, complétés par des arrêts amusants et rafraîchissants dans divers cafés bruns, sont le fil conducteur de la promenade réussie "Cafélegendes 1". Les entreprises, les familles et les amis peuvent passer un bon moment ici; car avouons-le: qui n\'aime pas prendre un bon verre en bonne compagnie dans un bel endroit?\n\nVous souhaitez réserver la visite "Cafélegendes in \'t Centrum", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Die Geheimnisse einiger Stadtlegenden, ergänzt durch lustige, durstlöschende Stopps in verschiedenen braunen Kneipen, ist der rote Faden des erfolgreichen Stadtspaziergangs "Cafélegendes 1". Unternehmen, Familien und Freunde können sich hier austoben; denn mal ehrlich: Wer trinkt nicht gerne in guter Gesellschaft an einem schönen Ort ein leckeres Getränk?\n\nMöchten Sie die Tour "Cafélegendes in \'t Centrum" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Steenplein (beeld Lange Wapper)',
        en: 'Steenplein (Lange Wapper statue)',
        fr: 'Steenplein (statue de Lange Wapper)',
        de: 'Steenplein (Lange Wapper-Statue)'
      },
      end: {
        nl: 'Conscienceplein',
        en: 'Conscienceplein',
        fr: 'Conscienceplein',
        de: 'Conscienceplein'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      },
      extraInfo: {
        nl: 'Drankjes tijdens tour inbegrepen',
        en: 'Drinks during tour included',
        fr: 'Boissons pendant la visite incluses',
        de: 'Getränke während der Tour inbegriffen'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'het-jaar-2030',
    title: {
      nl: 'Het Jaar 2030',
      en: 'The Year 2030',
      fr: 'L\'Année 2030',
      de: 'Das Jahr 2030'
    },
    price: 19.95,
    badge: 'NIEUW',
    thumbnail: '/Tours Images/Antwerp Images/Hetjaar2030.png',
    images: ['/Tours Images/Antwerp Images/Hetjaar2030.png'],
    shortDescription: {
      nl: 'Ontdek hoe Antwerpen zich de komende jaren zal transformeren',
      en: 'Discover how Antwerp will transform in the coming years',
      fr: 'Découvrez comment Anvers se transformera dans les années à venir',
      de: 'Entdecken Sie, wie sich Antwerpen in den kommenden Jahren verändern wird'
    },
    description: {
      nl: 'Ontdek hoe Antwerpen zich de komende jaren zal transformeren tijdens deze unieke FIETS TOUR. Kom alles te weten over de toekomstplannen van de stad en zie hoe de skyline zal veranderen met nieuwe gebouwen en architectuurprojecten. Welke buurten gaan de komende jaren volledig vernieuwen? Hoe zal de Boerentoren eruit zien? Kom alles te weten tijdens deze gloednieuwe tour met steeds de meest recente info over Antwerpen.\n\nFietstocht in Antwerpen.\n\nFiets niet inbegrepen, gelieve deze zelf te voorzien\n\nWil je graag een fiets huren? Vanaf 15 deelnemers kunnen er fietsen geleverd worden (€30pp)\n\nDeze tour is ook mogelijk als lezing.\n\nWil je graag de tour "Het jaar 2030: hoe Antwerpen evolueert" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.',
      en: 'Discover how Antwerp will transform in the coming years during this unique BIKE TOUR. Learn all about the city\'s future plans and see how the skyline will change with new buildings and architectural projects. Which neighborhoods will be completely renewed in the coming years? What will the Boerentoren look like? Learn everything during this brand new tour with always the most recent information about Antwerp.\n\nBike tour in Antwerp.\n\nBike not included, please provide your own\n\nWould you like to rent a bike? From 15 participants bikes can be delivered (€30pp)\n\nThis tour is also available as a lecture.\n\nWould you like to book the tour "The year 2030: how Antwerp evolves", but still have some questions? Feel free to take a look at our FAQ page.',
      fr: 'Découvrez comment Anvers se transformera dans les années à venir lors de ce TOUR À VÉLO unique. Apprenez tout sur les projets futurs de la ville et voyez comment l\'horizon changera avec de nouveaux bâtiments et projets architecturaux. Quels quartiers seront complètement renouvelés dans les années à venir? À quoi ressemblera le Boerentoren? Apprenez tout lors de cette toute nouvelle visite avec toujours les informations les plus récentes sur Anvers.\n\nTour à vélo à Anvers.\n\nVélo non inclus, veuillez fournir le vôtre\n\nVous souhaitez louer un vélo? À partir de 15 participants, des vélos peuvent être livrés (30€ par personne)\n\nCette visite est également disponible sous forme de conférence.\n\nVous souhaitez réserver la visite "L\'année 2030: comment Anvers évolue", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.',
      de: 'Entdecken Sie, wie sich Antwerpen in den kommenden Jahren verändern wird, während dieser einzigartigen FAHRRADTOUR. Erfahren Sie alles über die Zukunftspläne der Stadt und sehen Sie, wie sich die Skyline mit neuen Gebäuden und Architekturprojekten verändern wird. Welche Stadtteile werden in den kommenden Jahren vollständig erneuert? Wie wird der Boerentoren aussehen? Erfahren Sie alles während dieser brandneuen Tour mit immer den neuesten Informationen über Antwerpen.\n\nFahrradtour in Antwerpen.\n\nFahrrad nicht inbegriffen, bitte bringen Sie Ihr eigenes mit\n\nMöchten Sie ein Fahrrad mieten? Ab 15 Teilnehmern können Fahrräder geliefert werden (30€ pro Person)\n\nDiese Tour ist auch als Vortrag verfügbar.\n\nMöchten Sie die Tour "Das Jahr 2030: wie Antwerpen sich entwickelt" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.'
    },
    details: {
      start: {
        nl: 'Steenplein',
        en: 'Steenplein',
        fr: 'Steenplein',
        de: 'Steenplein'
      },
      end: {
        nl: 'Steenplein',
        en: 'Steenplein',
        fr: 'Steenplein',
        de: 'Steenplein'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      },
      extraInfo: {
        nl: 'Fiets niet inbegrepen',
        en: 'Bike not included',
        fr: 'Vélo non inclus',
        de: 'Fahrrad nicht inbegriffen'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'de-modewandeling',
    title: {
      nl: 'De Modewandeling',
      en: 'The Fashion Walk',
      fr: 'La Promenade Mode',
      de: 'Der Modespaziergang'
    },
    price: 19.95,
    thumbnail: '/Tours Images/Antwerp Images/demodewandeling.jpg',
    images: ['/Tours Images/Antwerp Images/demodewandeling.jpg'],
    shortDescription: {
      nl: 'Antwerpen is de modecentrum van België',
      en: 'Antwerp is the fashion capital of Belgium',
      fr: 'Anvers est la capitale de la mode en Belgique',
      de: 'Antwerpen ist die Modehauptstadt Belgiens'
    },
    description: {
      nl: 'Antwerpen is de modecentrum van België. Sinds 1963 kan je aan de Koninklijke Academie voor Schone Kunsten van Antwerpen de opleiding Mode volgen. Het is daar waar de Antwerpse Zes elkaar leerden kennen en internationaal bekend werden. Hoe is dit allemaal begonnen en wie zijn deze Zes van Antwerpen? Uw BeroepsBelg, Tanguy Ottomer, vertelt er u alles over tijdens zijn meest succesvolle tour "De Modewandeling".\n\nWandeling in de het centrum van Antwerpen.\n\nWil je graag de "De Modewandeling" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'Antwerp is the fashion capital of Belgium. Since 1963, you can study Fashion at the Royal Academy of Fine Arts in Antwerp. It\'s where the Antwerp Six met each other and became internationally famous. How did this all begin and who are these Six of Antwerp? Your BeroepsBelg, Tanguy Ottomer, tells you all about it during his most successful tour "The Fashion Walk".\n\nWalk in the center of Antwerp.\n\nWould you like to book "The Fashion Walk", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'Anvers est la capitale de la mode en Belgique. Depuis 1963, vous pouvez étudier la mode à l\'Académie royale des Beaux-Arts d\'Anvers. C\'est là que les Six d\'Anvers se sont rencontrés et sont devenus célèbres dans le monde entier. Comment tout cela a-t-il commencé et qui sont ces Six d\'Anvers? Votre BeroepsBelg, Tanguy Ottomer, vous en dit tout lors de sa visite la plus réussie "La Promenade Mode".\n\nPromenade dans le centre d\'Anvers.\n\nVous souhaitez réserver "La Promenade Mode", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Antwerpen ist die Modehauptstadt Belgiens. Seit 1963 können Sie an der Königlichen Akademie der Schönen Künste in Antwerpen Mode studieren. Dort lernten sich die Antwerp Six kennen und wurden international berühmt. Wie hat das alles angefangen und wer sind diese Six von Antwerpen? Ihr BeroepsBelg, Tanguy Ottomer, erzählt Ihnen alles darüber während seiner erfolgreichsten Tour "Der Modespaziergang".\n\nSpaziergang im Zentrum von Antwerpen.\n\nMöchten Sie "Der Modespaziergang" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Vrijdagmarkt',
        en: 'Vrijdagmarkt',
        fr: 'Vrijdagmarkt',
        de: 'Vrijdagmarkt'
      },
      end: {
        nl: 'Nationalestraat MoMu',
        en: 'Nationalestraat MoMu',
        fr: 'Nationalestraat MoMu',
        de: 'Nationalestraat MoMu'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'eilandje-2-0',
    title: {
      nl: 'Eilandje 2.0',
      en: 'Eilandje 2.0',
      fr: 'Eilandje 2.0',
      de: 'Eilandje 2.0'
    },
    price: 19.95,
    thumbnail: '/Tours Images/Antwerp Images/Eilandje(3).jpg',
    images: ['/Tours Images/Antwerp Images/Eilandje(1).jpg', '/Tours Images/Antwerp Images/Eilandje(2).jpg', '/Tours Images/Antwerp Images/Eilandje(3).jpg', '/Tours Images/Antwerp Images/Eilandje(4).jpg', '/Tours Images/Antwerp Images/Eilandje(5).jpg'],
    shortDescription: {
      nl: 'Van havenbuurt tot de meest belovende wijk van Antwerpen',
      en: 'From port district to Antwerp\'s most promising neighborhood',
      fr: 'Du quartier portuaire au quartier le plus prometteur d\'Anvers',
      de: 'Vom Hafenviertel zum vielversprechendsten Viertel Antwerpens'
    },
    description: {
      nl: 'Sinds de zestiende eeuw behoort een groot deel van het Eilandje tot de stad. Eerst als havenbuurt, vandaag als de meest belovende wijk van Antwerpen. Met musea als het MAS en het Red Star Line, het gloednieuwe Havenhuis, oogverblindende lofts en dure jachten heeft deze voormalige havenbuurt veel te vertellen. De mix van cultuur, architectuur en een knap staaltje van stadsinnovatie komen hier allemaal aan bod.\n\nWil je graag de tour "Eilandje 2.0" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'Since the sixteenth century, a large part of het Eilandje has belonged to the city. First as a port district, today as Antwerp\'s most promising neighborhood. With museums like the MAS and Red Star Line, the brand new Port House, dazzling lofts and expensive yachts, this former port district has a lot to tell. The mix of culture, architecture and a fine example of urban innovation all come together here.\n\nWould you like to book the tour "Eilandje 2.0", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'Depuis le seizième siècle, une grande partie du Eilandje appartient à la ville. D\'abord en tant que quartier portuaire, aujourd\'hui en tant que quartier le plus prometteur d\'Anvers. Avec des musées comme le MAS et la Red Star Line, la toute nouvelle Maison du Port, des lofts éblouissants et des yachts coûteux, cet ancien quartier portuaire a beaucoup à raconter. Le mélange de culture, d\'architecture et un bel exemple d\'innovation urbaine se réunissent ici.\n\nVous souhaitez réserver la visite "Eilandje 2.0", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Seit dem sechzehnten Jahrhundert gehört ein großer Teil des Eilandje zur Stadt. Zuerst als Hafenviertel, heute als vielversprechendstes Viertel Antwerpens. Mit Museen wie dem MAS und der Red Star Line, dem brandneuen Hafenhaus, blendenden Lofts und teuren Yachten hat dieses ehemalige Hafenviertel viel zu erzählen. Die Mischung aus Kultur, Architektur und einem schönen Beispiel für städtische Innovation kommen hier alle zusammen.\n\nMöchten Sie die Tour "Eilandje 2.0" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Inkom MAS',
        en: 'MAS entrance',
        fr: 'Entrée du MAS',
        de: 'MAS Eingang'
      },
      end: {
        nl: 'MAS',
        en: 'MAS',
        fr: 'MAS',
        de: 'MAS'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'art-down-the-street',
    title: {
      nl: 'Art Down the Street',
      en: 'Art Down the Street',
      fr: 'L\'Art dans la Rue',
      de: 'Kunst auf der Straße'
    },
    price: 19.95,
    thumbnail: '/Tours Images/Antwerp Images/artdownthestreet(2).jpg',
    images: ['/Tours Images/Antwerp Images/artdownthestreet(1).jpg', '/Tours Images/Antwerp Images/artdownthestreet(2).jpg', '/Tours Images/Antwerp Images/artdownthestreet(3).jpg'],
    shortDescription: {
      nl: 'De stad is één groot openlucht museum',
      en: 'The city is one big open-air museum',
      fr: 'La ville est un grand musée à ciel ouvert',
      de: 'Die Stadt ist ein großes Freilichtmuseum'
    },
    description: {
      nl: 'De stad is eigenlijk één groot openlucht museum. Je kan er beelden, graffiti- en stripmuren, fonteinen en nog zoveel meer ontdekken. Kijk met een open geest naar al het schone wat het straatbeeld te bieden heeft met een expert aan je zijde. Wist je dat België het meeste striptekenaars heeft per vierkante kilometer? Of dat er maar liefst 200 beelden de straten sieren in Antwerpen? De meest verrassende stadswandeling bij BeroepsBelg, "Art down the street".\n\nWil je graag de tour "Art down the street" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'The city is actually one big open-air museum. You can discover statues, graffiti and comic strip walls, fountains and so much more. Look with an open mind at all the beauty the street scene has to offer with an expert by your side. Did you know that Belgium has the most comic strip artists per square kilometer? Or that no less than 200 statues grace the streets in Antwerp? The most surprising city walk at BeroepsBelg, "Art down the street".\n\nWould you like to book the tour "Art down the street", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'La ville est en fait un grand musée à ciel ouvert. Vous pouvez découvrir des statues, des murs de graffitis et de bandes dessinées, des fontaines et bien plus encore. Regardez avec un esprit ouvert toute la beauté que la scène de rue a à offrir avec un expert à vos côtés. Saviez-vous que la Belgique a le plus d\'auteurs de bandes dessinées par kilomètre carré? Ou que pas moins de 200 statues ornent les rues d\'Anvers? La promenade en ville la plus surprenante chez BeroepsBelg, "Art down the street".\n\nVous souhaitez réserver la visite "Art down the street", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Die Stadt ist eigentlich ein großes Freilichtmuseum. Sie können Statuen, Graffiti- und Comicwände, Brunnen und vieles mehr entdecken. Schauen Sie mit offenem Geist auf all die Schönheit, die die Straßenszene zu bieten hat, mit einem Experten an Ihrer Seite. Wussten Sie, dass Belgien die meisten Comic-Künstler pro Quadratkilometer hat? Oder dass nicht weniger als 200 Statuen die Straßen in Antwerpen schmücken? Der überraschendste Stadtspaziergang bei BeroepsBelg, "Art down the street".\n\nMöchten Sie die Tour "Art down the street" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Oever (beeld Jacob Jordaens)',
        en: 'Oever (Jacob Jordaens statue)',
        fr: 'Oever (statue de Jacob Jordaens)',
        de: 'Oever (Jacob Jordaens-Statue)'
      },
      end: {
        nl: 'Teniersplaats',
        en: 'Teniersplaats',
        fr: 'Teniersplaats',
        de: 'Teniersplaats'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'handelsbeurs-vroeger-en-nu',
    title: {
      nl: 'Handelsbeurs Vroeger & Nu',
      en: 'Stock Exchange Then & Now',
      fr: 'Bourse Avant & Maintenant',
      de: 'Börse Früher & Heute'
    },
    price: 19.95,
    badge: 'EXCLUSIEF',
    thumbnail: '/Tours Images/Antwerp Images/handelsbeurs_vroegerennu(1).jpg',
    images: ['/Tours Images/Antwerp Images/handelsbeurs_vroegerennu(1).jpg'],
    shortDescription: {
      nl: '"De moeder der beurzen ter wereld" staat in Antwerpen',
      en: '"The mother of all stock exchanges in the world" is in Antwerp',
      fr: '"La mère de toutes les bourses du monde" se trouve à Anvers',
      de: '"Die Mutter aller Börsen der Welt" steht in Antwerpen'
    },
    description: {
      nl: '"De moeder der beurzen ter wereld" staat in Antwerpen. De handelsbeurs in Antwerpen stond model voor die van Londen, Parijs en New York en heeft een ongelooflijk rijke geschiedenis. Tijdens de exclusieve rondleiding "Handelsbeurs vroeger & nu" kom je de vele geheimen te weten van deze parel aan de Antwerpse kroon. Ga mee op stap met een kenner die het verleden, het heden en de toekomst van dit paleis zal onthullen.\n\nWil je graag de tour "Handelsbeurs vroeger & nu" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: deze unieke tour is enkel bij BeroepsBelg te reserveren! Boek bovendien via ons online betalingsplatform en ontvang 10% korting.',
      en: '"The mother of all stock exchanges in the world" is in Antwerp. The Antwerp Stock Exchange was the model for those in London, Paris and New York and has an incredibly rich history. During the exclusive tour "Stock Exchange then & now" you will discover the many secrets of this pearl of the Antwerp crown. Come along with an expert who will reveal the past, present and future of this palace.\n\nWould you like to book the tour "Stock Exchange then & now", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: this unique tour is only available at BeroepsBelg! Book via our online payment platform and receive 10% discount.',
      fr: '"La mère de toutes les bourses du monde" se trouve à Anvers. La Bourse d\'Anvers a servi de modèle pour celles de Londres, Paris et New York et a une histoire incroyablement riche. Lors de la visite exclusive "Bourse avant & maintenant", vous découvrirez les nombreux secrets de cette perle de la couronne anversoise. Venez avec un expert qui révélera le passé, le présent et l\'avenir de ce palais.\n\nVous souhaitez réserver la visite "Bourse avant & maintenant", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: cette visite unique n\'est disponible qu\'à BeroepsBelg! Réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: '"Die Mutter aller Börsen der Welt" steht in Antwerpen. Die Antwerpener Börse war das Modell für die in London, Paris und New York und hat eine unglaublich reiche Geschichte. Während der exklusiven Tour "Börse früher & heute" entdecken Sie die vielen Geheimnisse dieser Perle der Antwerpener Krone. Kommen Sie mit einem Experten mit, der die Vergangenheit, Gegenwart und Zukunft dieses Palastes enthüllen wird.\n\nMöchten Sie die Tour "Börse früher & heute" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Diese einzigartige Tour ist nur bei BeroepsBelg verfügbar! Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Grote Markt (beeld Brabo)',
        en: 'Grote Markt (Brabo statue)',
        fr: 'Grote Markt (statue de Brabo)',
        de: 'Grote Markt (Brabo-Statue)'
      },
      end: {
        nl: 'Handelsbeurs Borzestraat',
        en: 'Stock Exchange Borzestraat',
        fr: 'Bourse Borzestraat',
        de: 'Börse Borzestraat'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'time-machine',
    title: {
      nl: 'Time Machine Antwerpen',
      en: 'Time Machine Antwerp',
      fr: 'Machine à Remonter le Temps Anvers',
      de: 'Zeitmaschine Antwerpen'
    },
    price: 19.95,
    thumbnail: '/Tours Images/Antwerp Images/timemachineantwerpen(2).jpg',
    images: ['/Tours Images/Antwerp Images/timemachineantwerpen(1).jpg', '/Tours Images/Antwerp Images/timemachineantwerpen(2).jpg', '/Tours Images/Antwerp Images/timemachineantwerpen(3).jpg', '/Tours Images/Antwerp Images/timemachineantwerpen(4).jpg'],
    shortDescription: {
      nl: 'Een nostalgische wandeling door de geschiedenis van Antwerpen',
      en: 'A nostalgic walk through Antwerp\'s history',
      fr: 'Une promenade nostalgique à travers l\'histoire d\'Anvers',
      de: 'Ein nostalgischer Spaziergang durch die Geschichte Antwerpens'
    },
    description: {
      nl: 'Auteur en BeroepsBelg, Tanguy Ottomer, dook verschillende archieven in om een unieke verzameling te presenteren in het boek "Time Machine Antwerpen". Een tour langs de verschillende plekken in de Stad waar telkens een boeiend verhaal aan gekoppeld is! Deze nostalgische wandeling is werkelijk "a trip down memory lane" voor de minder jonge deelnemer of een boeiende ontdekking voor anderen.\n\nWil je graag de tour "Time Machine Antwerpen" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'Author and BeroepsBelg, Tanguy Ottomer, delved into various archives to present a unique collection in the book "Time Machine Antwerp". A tour along the different places in the City where a fascinating story is always linked! This nostalgic walk is truly "a trip down memory lane" for the less young participant or a fascinating discovery for others.\n\nWould you like to book the tour "Time Machine Antwerp", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'L\'auteur et BeroepsBelg, Tanguy Ottomer, a plongé dans diverses archives pour présenter une collection unique dans le livre "Time Machine Anvers". Une visite le long des différents endroits de la ville où une histoire fascinante est toujours liée! Cette promenade nostalgique est vraiment "un voyage dans le temps" pour le participant moins jeune ou une découverte fascinante pour d\'autres.\n\nVous souhaitez réserver la visite "Time Machine Anvers", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Autor und BeroepsBelg, Tanguy Ottomer, tauchte in verschiedene Archive ein, um eine einzigartige Sammlung im Buch "Zeitmaschine Antwerpen" zu präsentieren. Eine Tour entlang der verschiedenen Orte in der Stadt, wo immer eine faszinierende Geschichte damit verbunden ist! Dieser nostalgische Spaziergang ist wirklich "eine Reise in die Vergangenheit" für den weniger jungen Teilnehmer oder eine faszinierende Entdeckung für andere.\n\nMöchten Sie die Tour "Zeitmaschine Antwerpen" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Hal Centraal Station',
        en: 'Central Station Hall',
        fr: 'Hall de la Gare Centrale',
        de: 'Hauptbahnhof Halle'
      },
      end: {
        nl: 'Groenplaats',
        en: 'Groenplaats',
        fr: 'Groenplaats',
        de: 'Groenplaats'
      },
      duration: {
        nl: 'ca. 2u',
        en: 'approx. 2h',
        fr: 'env. 2h',
        de: 'ca. 2h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'antwerpen',
    slug: 'nello-en-patrasche',
    title: {
      nl: 'Nello & Patrasche: hét Antwerps Kerstverhaal',
      en: 'Nello & Patrasche: the Antwerp Christmas Story',
      fr: 'Nello & Patrasche: l\'histoire de Noël d\'Anvers',
      de: 'Nello & Patrasche: die Antwerpener Weihnachtsgeschichte'
    },
    price: 24.99,
    thumbnail: '/Tours Images/Antwerp Images/nelloenpatrache(1).jpg',
    images: ['/Tours Images/Antwerp Images/nelloenpatrache(1).jpg', '/Tours Images/Antwerp Images/nelloenpatrache(2).jpg'],
    shortDescription: {
      nl: 'Het meest gelezen verhaal ter wereld over Vlaanderen',
      en: 'The most read story in the world about Flanders',
      fr: 'L\'histoire la plus lue au monde sur la Flandre',
      de: 'Die meistgelesene Geschichte der Welt über Flandern'
    },
    description: {
      nl: 'Het meest gelezen verhaal ter wereld over Vlaanderen speelt zich volledig af in de Koekenstad. Nello & zijn hond Patrasche zijn enorm gekend in Japan; er zijn zelfs 5 Hollywoodfilms gemaakt over dit verhaal, en amper iemand kent het hier. Waarom is het zo bekend in het buitenland? Wie schreef dit succesvolle verhaal in 1872? Leer dit sprookje vol vriendschap en trots kennen met een BeroepsAntwerpenaar - Tanguy Ottomer - aan je zijde… tijdens de tour "Nello & Patrasche: hét Antwerps Kerstverhaal".\n\nWil je graag de tour "Nello & Patrasche: hét Antwerps Kerstverhaal" reserveren, maar heb je toch nog enkele vragen? Neem gerust een kijkje op onze FAQ-pagina.\n\nPS: boek via ons online betalingsplatform en ontvang 10% korting.',
      en: 'The most read story in the world about Flanders takes place entirely in the Cookie City. Nello & his dog Patrasche are hugely known in Japan; there are even 5 Hollywood films made about this story, and hardly anyone knows it here. Why is it so well known abroad? Who wrote this successful story in 1872? Learn this fairy tale full of friendship and pride with a professional Antwerpenaar - Tanguy Ottomer - by your side… during the tour "Nello & Patrasche: the Antwerp Christmas Story".\n\nWould you like to book the tour "Nello & Patrasche: the Antwerp Christmas Story", but still have some questions? Feel free to take a look at our FAQ page.\n\nPS: book via our online payment platform and receive 10% discount.',
      fr: 'L\'histoire la plus lue au monde sur la Flandre se déroule entièrement dans la Ville des Biscuits. Nello et son chien Patrasche sont extrêmement connus au Japon; il y a même 5 films hollywoodiens réalisés sur cette histoire, et presque personne ne la connaît ici. Pourquoi est-elle si connue à l\'étranger? Qui a écrit cette histoire à succès en 1872? Apprenez ce conte de fées plein d\'amitié et de fierté avec un Anversois professionnel - Tanguy Ottomer - à vos côtés… lors de la visite "Nello & Patrasche: l\'histoire de Noël d\'Anvers".\n\nVous souhaitez réserver la visite "Nello & Patrasche: l\'histoire de Noël d\'Anvers", mais vous avez encore quelques questions? N\'hésitez pas à consulter notre page FAQ.\n\nPS: réservez via notre plateforme de paiement en ligne et recevez 10% de réduction.',
      de: 'Die meistgelesene Geschichte der Welt über Flandern spielt sich vollständig in der Keksstadt ab. Nello & sein Hund Patrasche sind in Japan enorm bekannt; es wurden sogar 5 Hollywood-Filme über diese Geschichte gemacht, und kaum jemand kennt sie hier. Warum ist sie im Ausland so bekannt? Wer schrieb diese erfolgreiche Geschichte 1872? Lernen Sie dieses Märchen voller Freundschaft und Stolz mit einem professionellen Antwerpenaar - Tanguy Ottomer - an Ihrer Seite… während der Tour "Nello & Patrasche: die Antwerpener Weihnachtsgeschichte".\n\nMöchten Sie die Tour "Nello & Patrasche: die Antwerpener Weihnachtsgeschichte" buchen, haben aber noch einige Fragen? Schauen Sie sich gerne unsere FAQ-Seite an.\n\nPS: Buchen Sie über unsere Online-Zahlungsplattform und erhalten Sie 10% Rabatt.'
    },
    details: {
      start: {
        nl: 'Groenplaats (beeld Rubens)',
        en: 'Groenplaats (Rubens statue)',
        fr: 'Groenplaats (statue de Rubens)',
        de: 'Groenplaats (Rubens-Statue)'
      },
      end: {
        nl: 'Handschoenmarkt',
        en: 'Handschoenmarkt',
        fr: 'Handschoenmarkt',
        de: 'Handschoenmarkt'
      },
      duration: {
        nl: 'ca. 1,5u',
        en: 'approx. 1.5h',
        fr: 'env. 1,5h',
        de: 'ca. 1,5h'
      },
      languages: {
        nl: 'Nederlands, Frans, Engels, Duits',
        en: 'Dutch, French, English, German',
        fr: 'Néerlandais, Français, Anglais, Allemand',
        de: 'Niederländisch, Französisch, Englisch, Deutsch'
      }
    }
  },
  {
    citySlug: 'brussel',
    slug: 'time-machine-brussel',
    title: {
      nl: 'Time Machine Brussel',
      en: 'Time Machine Brussels',
      fr: 'Machine à Remonter le Temps Bruxelles',
      de: 'Zeitmaschine Brüssel'
    },
    price: 19.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek het nostalgische Brussel van de jaren \'50',
      en: 'Discover the nostalgic Brussels of the 1950s',
      fr: 'Découvrez le Bruxelles nostalgique des années 50',
      de: 'Entdecken Sie das nostalgische Brüssel der 50er Jahre'
    },
    description: {
      nl: 'Ga mee op stap doorheen de nostalgische wereld van Brussel. Wist jij dat vanaf de jaren \'50 de stad enorm is hertekend? Wil je weten wat er allemaal afgebroken is? Ga dan mee op stap met een expert aan je zijde.',
      en: 'Join us on a journey through the nostalgic world of Brussels. Did you know that from the 1950s onwards the city was massively redesigned? Want to know what was demolished? Then join us with an expert by your side.',
      fr: 'Rejoignez-nous dans un voyage à travers le monde nostalgique de Bruxelles. Saviez-vous qu\'à partir des années 50, la ville a été massivement redessinée? Vous voulez savoir ce qui a été démoli? Alors rejoignez-nous avec un expert à vos côtés.',
      de: 'Begleiten Sie uns auf einer Reise durch die nostalgische Welt von Brüssel. Wussten Sie, dass die Stadt ab den 1950er Jahren massiv umgestaltet wurde? Möchten Sie wissen, was abgerissen wurde? Dann begleiten Sie uns mit einem Experten an Ihrer Seite.'
    }
  },
  {
    citySlug: 'brussel',
    slug: 'best-of-brussels',
    title: {
      nl: 'Best of Brussels',
      en: 'Best of Brussels',
      fr: 'Best of Brussels',
      de: 'Best of Brussels'
    },
    price: 24.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek het hart van Europa met een expert',
      en: 'Discover the heart of Europe with an expert',
      fr: 'Découvrez le cœur de l\'Europe avec un expert',
      de: 'Entdecken Sie das Herz Europas mit einem Experten'
    },
    description: {
      nl: 'De hoofdstad van België heeft ongelooflijke monumenten, prachtige architectuur en verschillende lekkernijen die iedere levensgenieter weet te verleiden. Wandel met een expert aan je zijde doorheen het hart van Europa dankzij onze tour Best of Brussels.',
      en: 'The capital of Belgium has incredible monuments, beautiful architecture and various delicacies that can seduce any bon vivant. Walk with an expert by your side through the heart of Europe thanks to our Best of Brussels tour.',
      fr: 'La capitale de la Belgique possède des monuments incroyables, une architecture magnifique et diverses délices qui peuvent séduire tout bon vivant. Promenez-vous avec un expert à vos côtés à travers le cœur de l\'Europe grâce à notre visite Best of Brussels.',
      de: 'Die Hauptstadt Belgiens hat unglaubliche Denkmäler, schöne Architektur und verschiedene Köstlichkeiten, die jeden Lebensgenießer verführen können. Spazieren Sie mit einem Experten an Ihrer Seite durch das Herz Europas dank unserer Best of Brussels Tour.'
    }
  },
  {
    citySlug: 'brussel',
    slug: 'brussel-op-maat',
    title: {
      nl: 'Brussel op Maat',
      en: 'Tailor-Made Brussels',
      fr: 'Bruxelles sur Mesure',
      de: 'Brüssel nach Maß'
    },
    price: 29.95,
    badge: 'EXCLUSIEF',
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Een tour geheel naar jouw wensen ontworpen',
      en: 'A tour completely designed to your wishes',
      fr: 'Une visite entièrement conçue selon vos souhaits',
      de: 'Eine Tour, die ganz nach Ihren Wünschen gestaltet ist'
    },
    description: {
      nl: 'Wil je graag een tour geheel naar jouw wensen laten ontwerpen? Kan je geen keuze maken tussen onze tours en wil je een mix van verschillende stadswandelingen? Of heb je een specifiek onderwerp waar je je graag laat in onderdompelen? Dan is de tour Brussel op maat de beste keuze voor jou!',
      en: 'Would you like a tour completely designed to your wishes? Can\'t choose between our tours and want a mix of different city walks? Or do you have a specific topic you\'d like to immerse yourself in? Then the Tailor-Made Brussels tour is the best choice for you!',
      fr: 'Souhaitez-vous une visite entièrement conçue selon vos souhaits? Vous ne pouvez pas choisir entre nos visites et vous voulez un mélange de différentes promenades en ville? Ou avez-vous un sujet spécifique dans lequel vous aimeriez vous plonger? Alors la visite Bruxelles sur Mesure est le meilleur choix pour vous!',
      de: 'Möchten Sie eine Tour, die ganz nach Ihren Wünschen gestaltet ist? Können Sie sich nicht zwischen unseren Touren entscheiden und möchten eine Mischung aus verschiedenen Stadtspaziergängen? Oder haben Sie ein bestimmtes Thema, in das Sie eintauchen möchten? Dann ist die Brüssel nach Maß Tour die beste Wahl für Sie!'
    }
  },
  {
    citySlug: 'brugge',
    slug: 'brugge-op-maat',
    title: {
      nl: 'Brugge op Maat',
      en: 'Tailor-Made Bruges',
      fr: 'Bruges sur Mesure',
      de: 'Brügge nach Maß'
    },
    price: 24.95,
    badge: 'EXCLUSIEF',
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Een tour geheel naar jouw wensen ontworpen',
      en: 'A tour completely designed to your wishes',
      fr: 'Une visite entièrement conçue selon vos souhaits',
      de: 'Eine Tour, die ganz nach Ihren Wünschen gestaltet ist'
    },
    description: {
      nl: 'Wil je graag een tour geheel naar jouw wensen laten ontwerpen? Kan je geen keuze maken tussen onze tours en wil je een mix van verschillende stadswandelingen? Of heb je een specifiek onderwerp waar je je graag laat in onderdompelen? Dan is de tour Brugge op maat de beste keuze voor jou!',
      en: 'Would you like a tour completely designed to your wishes? Can\'t choose between our tours and want a mix of different city walks? Or do you have a specific topic you\'d like to immerse yourself in? Then the Tailor-Made Bruges tour is the best choice for you!',
      fr: 'Souhaitez-vous une visite entièrement conçue selon vos souhaits? Vous ne pouvez pas choisir entre nos visites et vous voulez un mélange de différentes promenades en ville? Ou avez-vous un sujet spécifique dans lequel vous aimeriez vous plonger? Alors la visite Bruges sur Mesure est le meilleur choix pour vous!',
      de: 'Möchten Sie eine Tour, die ganz nach Ihren Wünschen gestaltet ist? Können Sie sich nicht zwischen unseren Touren entscheiden und möchten eine Mischung aus verschiedenen Stadtspaziergängen? Oder haben Sie ein bestimmtes Thema, in das Sie eintauchen möchten? Dann ist die Brügge nach Maß Tour die beste Wahl für Sie!'
    }
  },
  {
    citySlug: 'brugge',
    slug: 'best-of-brugge',
    title: {
      nl: 'Best of Brugge',
      en: 'Best of Bruges',
      fr: 'Best of Bruges',
      de: 'Best of Brügge'
    },
    price: 19.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek de middeleeuwse parel van België',
      en: 'Discover the medieval pearl of Belgium',
      fr: 'Découvrez la perle médiévale de la Belgique',
      de: 'Entdecken Sie die mittelalterliche Perle Belgiens'
    },
    description: {
      nl: 'Leer de middeleeuwse parel van België kennen tijdens een stadswandeling met onze BeroepsBruggeling, Tanguy Ottomer. De stad uit de 15e eeuw die tijdens de 21e eeuw nog steeds bezoekers doet verbazen - er zijn weinig steden die dat kunnen zeggen. De verschillende kerken, bruggetjes en heerlijke pleinen worden allemaal met plezier belicht tijdens de tour Best of Brugge.',
      en: 'Get to know the medieval pearl of Belgium during a city walk with our BeroepsBruggeling, Tanguy Ottomer. The 15th century city that still amazes visitors during the 21st century - few cities can say that. The various churches, bridges and delightful squares are all highlighted with pleasure during the Best of Bruges tour.',
      fr: 'Apprenez à connaître la perle médiévale de la Belgique lors d\'une promenade en ville avec notre BeroepsBruggeling, Tanguy Ottomer. La ville du XVe siècle qui étonne encore les visiteurs au XXIe siècle - peu de villes peuvent le dire. Les différentes églises, ponts et places délicieuses sont tous mis en évidence avec plaisir lors de la visite Best of Bruges.',
      de: 'Lernen Sie die mittelalterliche Perle Belgiens bei einem Stadtspaziergang mit unserem BeroepsBruggeling, Tanguy Ottomer, kennen. Die Stadt aus dem 15. Jahrhundert, die Besucher im 21. Jahrhundert immer noch erstaunt - wenige Städte können das sagen. Die verschiedenen Kirchen, Brücken und herrlichen Plätze werden alle mit Vergnügen während der Best of Brügge Tour hervorgehoben.'
    }
  },
  {
    citySlug: 'gent',
    slug: 'time-machine-gent',
    title: {
      nl: 'Time Machine Gent',
      en: 'Time Machine Ghent',
      fr: 'Machine à Remonter le Temps Gand',
      de: 'Zeitmaschine Gent'
    },
    price: 24.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek hoe Gent er vroeger uitzag',
      en: 'Discover how Ghent used to look',
      fr: 'Découvrez à quoi ressemblait Gand autrefois',
      de: 'Entdecken Sie, wie Gent früher aussah'
    },
    description: {
      nl: 'Heeft u zich ooit afgevraagd hoe Gent er vroeger uitzag? Ga mee op een nostalgische stadswandeling met de tour Time Machine Gent, gecreëerd door Tanguy Ottomer, uw stadsgids in Gent.',
      en: 'Have you ever wondered how Ghent used to look? Join us on a nostalgic city walk with the Time Machine Ghent tour, created by Tanguy Ottomer, your city guide in Ghent.',
      fr: 'Vous êtes-vous déjà demandé à quoi ressemblait Gand autrefois? Rejoignez-nous pour une promenade nostalgique en ville avec la visite Time Machine Gand, créée par Tanguy Ottomer, votre guide de la ville à Gand.',
      de: 'Haben Sie sich jemals gefragt, wie Gent früher aussah? Begleiten Sie uns auf einem nostalgischen Stadtspaziergang mit der Zeitmaschine Gent Tour, erstellt von Tanguy Ottomer, Ihrem Stadtführer in Gent.'
    }
  },
  {
    citySlug: 'gent',
    slug: 'gent-op-maat',
    title: {
      nl: 'Gent op Maat',
      en: 'Tailor-Made Ghent',
      fr: 'Gand sur Mesure',
      de: 'Gent nach Maß'
    },
    price: 24.95,
    badge: 'EXCLUSIEF',
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Een tour geheel naar jouw wensen ontworpen',
      en: 'A tour completely designed to your wishes',
      fr: 'Une visite entièrement conçue selon vos souhaits',
      de: 'Eine Tour, die ganz nach Ihren Wünschen gestaltet ist'
    },
    description: {
      nl: 'Wil je graag een tour geheel naar jouw wensen laten ontwerpen? Kan je geen keuze maken tussen onze tours en wil je een mix van verschillende stadswandelingen? Of heb je een specifiek onderwerp waar je je graag laat in onderdompelen? Dan is de tour Gent op maat de beste keuze voor jou!',
      en: 'Would you like a tour completely designed to your wishes? Can\'t choose between our tours and want a mix of different city walks? Or do you have a specific topic you\'d like to immerse yourself in? Then the Tailor-Made Ghent tour is the best choice for you!',
      fr: 'Souhaitez-vous une visite entièrement conçue selon vos souhaits? Vous ne pouvez pas choisir entre nos visites et vous voulez un mélange de différentes promenades en ville? Ou avez-vous un sujet spécifique dans lequel vous aimeriez vous plonger? Alors la visite Gand sur Mesure est le meilleur choix pour vous!',
      de: 'Möchten Sie eine Tour, die ganz nach Ihren Wünschen gestaltet ist? Können Sie sich nicht zwischen unseren Touren entscheiden und möchten eine Mischung aus verschiedenen Stadtspaziergängen? Oder haben Sie ein bestimmtes Thema, in das Sie eintauchen möchten? Dann ist die Gent nach Maß Tour die beste Wahl für Sie!'
    }
  },
  {
    citySlug: 'gent',
    slug: 'best-of-gent',
    title: {
      nl: 'Best of Gent',
      en: 'Best of Ghent',
      fr: 'Best of Gand',
      de: 'Best of Gent'
    },
    price: 24.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Wandel langs de kanalen van de stad van Karel V',
      en: 'Walk along the canals of the city of Charles V',
      fr: 'Promenez-vous le long des canaux de la ville de Charles Quint',
      de: 'Spazieren Sie entlang der Kanäle der Stadt Karls V.'
    },
    description: {
      nl: 'Wandel langs de verschillende kanalen van deze stad van Karel V en de gebroeders Van Eyck met onze expert aan je zijde. De magische architectuur van verschillende eeuwen laat altijd een verpletterende indruk na. Onze BeroepsBelg, Tanguy Ottomer, vergezelt jou en je gezelschap langs de mooiste plekken van de lichtstad van België. Onze tour Best of Gent is een stadswandeling waar je mond van open valt!',
      en: 'Walk along the various canals of this city of Charles V and the Van Eyck brothers with our expert by your side. The magical architecture of different centuries always leaves an overwhelming impression. Our BeroepsBelg, Tanguy Ottomer, accompanies you and your company along the most beautiful spots of the light city of Belgium. Our Best of Ghent tour is a city walk that will leave you speechless!',
      fr: 'Promenez-vous le long des différents canaux de cette ville de Charles Quint et des frères Van Eyck avec notre expert à vos côtés. L\'architecture magique de différents siècles laisse toujours une impression écrasante. Notre BeroepsBelg, Tanguy Ottomer, vous accompagne, vous et votre compagnie, le long des plus beaux endroits de la ville lumière de la Belgique. Notre visite Best of Gand est une promenade en ville qui vous laissera sans voix!',
      de: 'Spazieren Sie entlang der verschiedenen Kanäle dieser Stadt Karls V. und der Gebrüder Van Eyck mit unserem Experten an Ihrer Seite. Die magische Architektur verschiedener Jahrhunderte hinterlässt immer einen überwältigenden Eindruck. Unser BeroepsBelg, Tanguy Ottomer, begleitet Sie und Ihre Gesellschaft entlang der schönsten Orte der Lichtstadt Belgiens. Unsere Best of Gent Tour ist ein Stadtspaziergang, der Sie sprachlos machen wird!'
    }
  },
  {
    citySlug: 'knokke-heist',
    slug: 'boulevard-nostalgie',
    title: {
      nl: 'Knokke-Heist: Boulevard Nostalgie',
      en: 'Knokke-Heist: Boulevard Nostalgie',
      fr: 'Knokke-Heist: Boulevard Nostalgie',
      de: 'Knokke-Heist: Boulevard Nostalgie'
    },
    price: 35,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek het Saint-Tropez van België',
      en: 'Discover the Saint-Tropez of Belgium',
      fr: 'Découvrez le Saint-Tropez de la Belgique',
      de: 'Entdecken Sie das Saint-Tropez Belgiens'
    },
    description: {
      nl: 'Het Saint-Tropez van België heeft door de eeuwen heen haar schitterende status meer dan verdiend. De crème de la crème van kunstenaars, architecten, beroemdheden én vogels kan je hier allemaal terugvinden. Wist je dat Marlène Dietrich, Frank Sinatra en Keith Haring hier vroeger wel eens vertoefden? Het Casino werd ontworpen door dezelfde architect die De Singel in Antwerpen bouwde. Kortom, spring op je fiets en ga mee op fietstocht met een expert in het \'Knokke van vroeger\'...',
      en: 'The Saint-Tropez of Belgium has more than earned its brilliant status over the centuries. The crème de la crème of artists, architects, celebrities and birds can all be found here. Did you know that Marlène Dietrich, Frank Sinatra and Keith Haring used to stay here? The Casino was designed by the same architect who built De Singel in Antwerp. In short, jump on your bike and join us on a bike tour with an expert in the \'Knokke of the past\'...',
      fr: 'Le Saint-Tropez de la Belgique a plus que mérité son statut brillant au fil des siècles. La crème de la crème des artistes, architectes, célébrités et oiseaux peut être trouvée ici. Saviez-vous que Marlène Dietrich, Frank Sinatra et Keith Haring séjournaient ici? Le Casino a été conçu par le même architecte qui a construit De Singel à Anvers. Bref, montez sur votre vélo et rejoignez-nous pour un tour à vélo avec un expert du \'Knokke d\'autrefois\'...',
      de: 'Das Saint-Tropez Belgiens hat seinen brillanten Status über die Jahrhunderte mehr als verdient. Die Crème de la Crème der Künstler, Architekten, Prominenten und Vögel kann hier gefunden werden. Wussten Sie, dass Marlène Dietrich, Frank Sinatra und Keith Haring hier früher verweilten? Das Casino wurde vom selben Architekten entworfen, der De Singel in Antwerpen baute. Kurz gesagt, steigen Sie auf Ihr Fahrrad und begleiten Sie uns auf einer Fahrradtour mit einem Experten im \'Knokke von damals\'...'
    }
  },
  {
    citySlug: 'leuven',
    slug: 'leuven-time-machine',
    title: {
      nl: 'Leuven Time Machine',
      en: 'Leuven Time Machine',
      fr: 'Machine à Remonter le Temps Louvain',
      de: 'Löwen Zeitmaschine'
    },
    price: 19.95,
    thumbnail: '',
    images: [],
    shortDescription: {
      nl: 'Ontdek het Leuven van toen en nu',
      en: 'Discover Leuven then and now',
      fr: 'Découvrez Louvain d\'hier et d\'aujourd\'hui',
      de: 'Entdecken Sie Löwen damals und heute'
    },
    description: {
      nl: 'Leuven is veel meer dan een studentenstad. Ontdek het Leuven van toen en nu met onze nieuwe wandeling Time Machine Leuven. Tijdens deze unieke tour neemt onze deskundige gids u mee op een tijdreis door de rijke geschiedenis van Leuven. U ziet hoe de stad er vroeger uitzag met prachtige historische beelden en leert over de evolutie tot het moderne Leuven van vandaag. Onze expert voorziet u van diepgaande en enthousiaste uitleg, waardoor de culturele en maatschappelijke transformaties tot leven komen. Of u nu een lokale inwoner bent of een bezoeker, de Time Machine Leuven wandeling biedt een verrijkende ervaring die uw kijk op Leuven voor altijd zal veranderen.',
      en: 'Leuven is much more than a student city. Discover Leuven then and now with our new Time Machine Leuven walk. During this unique tour, our expert guide takes you on a time travel through the rich history of Leuven. You will see how the city used to look with beautiful historical images and learn about the evolution to the modern Leuven of today. Our expert provides you with in-depth and enthusiastic explanations, bringing the cultural and social transformations to life. Whether you are a local resident or a visitor, the Time Machine Leuven walk offers an enriching experience that will change your view of Leuven forever.',
      fr: 'Louvain est bien plus qu\'une ville étudiante. Découvrez Louvain d\'hier et d\'aujourd\'hui avec notre nouvelle promenade Time Machine Louvain. Au cours de cette visite unique, notre guide expert vous emmène dans un voyage dans le temps à travers la riche histoire de Louvain. Vous verrez à quoi ressemblait la ville autrefois avec de belles images historiques et apprendrez sur l\'évolution vers le Louvain moderne d\'aujourd\'hui. Notre expert vous fournit des explications approfondies et enthousiastes, donnant vie aux transformations culturelles et sociales. Que vous soyez un résident local ou un visiteur, la promenade Time Machine Louvain offre une expérience enrichissante qui changera votre vue de Louvain pour toujours.',
      de: 'Löwen ist viel mehr als eine Studentenstadt. Entdecken Sie Löwen damals und heute mit unserem neuen Spaziergang Zeitmaschine Löwen. Während dieser einzigartigen Tour nimmt Sie unser Expertenführer mit auf eine Zeitreise durch die reiche Geschichte von Löwen. Sie werden sehen, wie die Stadt früher aussah mit schönen historischen Bildern und lernen über die Entwicklung zum modernen Löwen von heute. Unser Experte versorgt Sie mit ausführlichen und enthusiastischen Erklärungen, die die kulturellen und sozialen Transformationen zum Leben erwecken. Ob Sie ein lokaler Einwohner oder ein Besucher sind, der Spaziergang Zeitmaschine Löwen bietet eine bereichernde Erfahrung, die Ihre Sicht auf Löwen für immer verändern wird.'
    }
  }
];
