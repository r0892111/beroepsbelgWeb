import { Product } from './types';

export const products: Product[] = [
  {
    slug: 'antwerpen-zwart-wit',
    uuid: '00e77558-78fe-41db-bd68-cdbc26f3de17',
    title: {
      nl: 'Antwerpen Zwart Wit',
      en: 'Antwerpen Zwart Wit',
      fr: 'Antwerpen Zwart Wit',
      de: 'Antwerpen Zwart Wit'
    },
    category: 'Book',
    price: 45.00,
    description: {
      nl: 'Fotoboek met 182 pakkende zwart-witbeelden van Antwerpen (fin de siècle tot jaren 1990), gerangschikt per wijk met begeleidende toelichtingen door stadsgids Tanguy Ottomer.',
      en: 'Photo book with 182 striking black and white images of Antwerp (fin de siècle to the 1990s), organized by district with accompanying explanations by city guide Tanguy Ottomer.',
      fr: 'Livre photo avec 182 images frappantes en noir et blanc d\'Anvers (fin de siècle jusqu\'aux années 1990), organisé par quartier avec des explications par le guide Tanguy Ottomer.',
      de: 'Fotobuch mit 182 beeindruckenden Schwarz-Weiß-Bildern von Antwerpen (fin de siècle bis in die 1990er Jahre), nach Stadtteilen gegliedert mit Erläuterungen von Stadtführer Tanguy Ottomer.'
    },
    additionalInfo: {
      nl: 'Formaat 21,5×27 cm; 240 blz; hardcover (linnen rug); Nederlands; ISBN 9789460583926; Verschijningsdatum 25 november',
      en: 'Format 21.5×27 cm; 240 pages; hardcover (linen spine); Dutch; ISBN 9789460583926; Release date November 25',
      fr: 'Format 21,5×27 cm; 240 pages; couverture rigide (dos en lin); néerlandais; ISBN 9789460583926; Date de sortie 25 novembre',
      de: 'Format 21,5×27 cm; 240 Seiten; Hardcover (Leinenrücken); Niederländisch; ISBN 9789460583926; Erscheinungsdatum 25. November'
    }
  },
  {
    slug: 'uitgaan-in-t-stad-van-vroeger',
    uuid: '06f563b8-6fbd-4431-8054-32972ef59e40',
    title: {
      nl: 'Uitgaan in \'t Stad van Vroeger',
      en: 'Uitgaan in \'t Stad van Vroeger',
      fr: 'Uitgaan in \'t Stad van Vroeger',
      de: 'Uitgaan in \'t Stad van Vroeger'
    },
    category: 'Book',
    price: 21.95,
    description: {
      nl: 'Boeiend boek over het uitgaansleven in het oude Antwerpen – van legendarische variététheaters en danszalen uit de jaren \'20 tot de verdwenen bioscopen en clubs van latere decennia – een nostalgische terugblik op Antwerpens bruisende nachtleven.',
      en: 'Fascinating book about nightlife in old Antwerp – from legendary variety theaters and dance halls of the \'20s to the disappeared cinemas and clubs of later decades – a nostalgic look back at Antwerp\'s vibrant nightlife.',
      fr: 'Livre fascinant sur la vie nocturne de l\'ancien Anvers – des théâtres de variétés et salles de danse légendaires des années 20 aux cinémas et clubs disparus des décennies suivantes – un regard nostalgique sur la vie nocturne animée d\'Anvers.',
      de: 'Faszinierendes Buch über das Nachtleben im alten Antwerpen – von legendären Varietétheatern und Tanzsälen der 20er Jahre bis zu den verschwundenen Kinos und Clubs späterer Jahrzehnte – ein nostalgischer Rückblick auf Antwerpens pulsierendes Nachtleben.'
    },
    additionalInfo: {
      nl: 'Softcover; 176 blz; 17×22 cm; Nederlands; ISBN 9789460582875; verschenen okt 2015',
      en: 'Softcover; 176 pages; 17×22 cm; Dutch; ISBN 9789460582875; published Oct 2015',
      fr: 'Couverture souple; 176 pages; 17×22 cm; néerlandais; ISBN 9789460582875; publié oct 2015',
      de: 'Softcover; 176 Seiten; 17×22 cm; Niederländisch; ISBN 9789460582875; erschienen Okt 2015'
    }
  },
  {
    slug: 'ondernemen-in-t-stad-van-vroeger',
    uuid: '139893ba-5942-4486-b4f4-3d03778cc2d8',
    title: {
      nl: 'Ondernemen in \'t Stad van Vroeger',
      en: 'Ondernemen in \'t Stad van Vroeger',
      fr: 'Ondernemen in \'t Stad van Vroeger',
      de: 'Ondernemen in \'t Stad van Vroeger'
    },
    category: 'Book',
    price: 21.95,
    description: {
      nl: 'Nostalgische ode aan Antwerpse bedrijven van weleer – verhalen van legendarische Antwerpse ondernemingen (zoals oude snoepfabrieken, koffiebranders, warenhuizen) en de gedreven ondernemers erachter, verzameld door Tanguy Ottomer.',
      en: 'Nostalgic ode to Antwerp businesses of yesteryear – stories of legendary Antwerp enterprises (such as old candy factories, coffee roasters, department stores) and the driven entrepreneurs behind them, compiled by Tanguy Ottomer.',
      fr: 'Ode nostalgique aux entreprises anversoises d\'autrefois – histoires d\'entreprises légendaires d\'Anvers (comme les anciennes fabriques de bonbons, torréfacteurs, grands magasins) et les entrepreneurs passionnés derrière elles, compilées par Tanguy Ottomer.',
      de: 'Nostalgische Ode an Antwerpener Unternehmen von einst – Geschichten legendärer Antwerpener Betriebe (wie alte Süßwarenfabriken, Kaffeeröster, Warenhäuser) und die engagierten Unternehmer dahinter, zusammengestellt von Tanguy Ottomer.'
    },
    additionalInfo: {
      nl: 'Softcover; ~180 blz; Nederlands; reeks \'t Stad van Vroeger deel 3 (nieuwe druk 2023)',
      en: 'Softcover; ~180 pages; Dutch; series \'t Stad van Vroeger part 3 (new edition 2023)',
      fr: 'Couverture souple; ~180 pages; néerlandais; série \'t Stad van Vroeger partie 3 (nouvelle édition 2023)',
      de: 'Softcover; ~180 Seiten; Niederländisch; Reihe \'t Stad van Vroeger Teil 3 (Neuauflage 2023)'
    }
  },
  {
    slug: '50-flemish-icons',
    uuid: '17689fb6-ecfe-4f3a-b52e-083a93ac6b86',
    title: {
      nl: '50 Flemish Icons',
      en: '50 Flemish Icons',
      fr: '50 Flemish Icons',
      de: '50 Flemish Icons'
    },
    category: 'Book',
    price: 24.95,
    description: {
      nl: 'Boek dat aan de hand van 50 typisch Vlaamse iconen de regio Vlaanderen belicht – van historische figuren en gebeurtenissen tot culinaire tradities en unieke innovaties – in 50 korte toegankelijke verhalen door stadsgids Tanguy Ottomer.',
      en: 'Book that highlights the Flanders region through 50 typically Flemish icons – from historical figures and events to culinary traditions and unique innovations – in 50 short accessible stories by city guide Tanguy Ottomer.',
      fr: 'Livre qui met en lumière la région flamande à travers 50 icônes typiquement flamandes – des personnages et événements historiques aux traditions culinaires et innovations uniques – en 50 courtes histoires accessibles par le guide Tanguy Ottomer.',
      de: 'Buch, das die Region Flandern anhand von 50 typisch flämischen Ikonen beleuchtet – von historischen Persönlichkeiten und Ereignissen bis hin zu kulinarischen Traditionen und einzigartigen Innovationen – in 50 kurzen, zugänglichen Geschichten von Stadtführer Tanguy Ottomer.'
    },
    additionalInfo: {
      nl: 'Tweetalige editie Nederlands & English (parallelle tekst)',
      en: 'Bilingual edition Dutch & English (parallel text)',
      fr: 'Édition bilingue néerlandais & anglais (texte parallèle)',
      de: 'Zweisprachige Ausgabe Niederländisch & Englisch (Paralleltext)'
    }
  },
  {
    slug: 'op-stap-in-antwerpen',
    uuid: '2291d69f-ecb3-4ddf-bdee-c81f59a40a72',
    title: {
      nl: 'Op Stap in Antwerpen',
      en: 'Op Stap in Antwerpen',
      fr: 'Op Stap in Antwerpen',
      de: 'Op Stap in Antwerpen'
    },
    category: 'Book',
    price: 19.95,
    description: {
      nl: '9 WANDELINGEN LANGS DE MOOISTE PLEKKEN VAN DE STAD AAN DE STAD STROOM - MET VERHALEN EN DE LEUKSTE ADRESSEN\n\nNa het succes van \'De stad van vroeger\' I en II brengt de Beroepsantwerpenaar nu zijn beste wandelingen in boekvorm. Tanguy Ottomer leidt je in 9 thematische wandelingen met wegbeschrijvingen door zijn stad; er is o.a. een modewandeling, een wandeling met architecturale highlights, een wandeling over cafélegendes, en een waarin je ontdekt waarom Antwerpen \'de koekenstad\' wordt genoemd. Bij elke stopplaats krijg je een korte uitleg, geschreven in Tanguy\'s eigenzinnige, spontane en enthousiaste stijl, en ook tips over waar je iets kunt gaan eten en drinken, of waar je leuke winkels vindt. Bij elke wandeling staat ook aangegeven hoe lang ze is, en een overzichtskaart toont welk deel van de stad wordt verkend. Als je geen live wandeling met de meest gepassioneerde gids van \'t stad kunt meemaken, dan is dit boek, rijkelijk geïllustreerd met up-to-date foto\'s van Roel Hendrickx, the next best thing. Je begrijpt meteen waarom Tanguy Ottomer door CNN werd uitgeroepen tot \'one of the savviest tour guides in the world\'.',
      en: '9 WALKS THROUGH THE MOST BEAUTIFUL SPOTS OF THE CITY ON THE STREAM - WITH STORIES AND THE BEST ADDRESSES\n\nAfter the success of \'De stad van vroeger\' I and II, the Professional Antwerpenaar now brings his best walks in book form. Tanguy Ottomer guides you through 9 thematic walks with directions through his city; including a fashion walk, a walk with architectural highlights, a walk about café legends, and one where you discover why Antwerp is called \'the cookie city\'. At each stop you get a short explanation, written in Tanguy\'s distinctive, spontaneous and enthusiastic style, and also tips about where you can eat and drink, or where you can find nice shops. Each walk also indicates how long it is, and an overview map shows which part of the city is being explored. If you can\'t experience a live walk with the most passionate guide of the city, then this book, richly illustrated with up-to-date photos by Roel Hendrickx, is the next best thing. You immediately understand why Tanguy Ottomer was named by CNN as \'one of the savviest tour guides in the world\'.',
      fr: '9 PROMENADES À TRAVERS LES PLUS BEAUX ENDROITS DE LA VILLE SUR LE FLEUVE - AVEC DES HISTOIRES ET LES MEILLEURES ADRESSES\n\nAprès le succès de \'De stad van vroeger\' I et II, le Professionnel Anversois présente maintenant ses meilleures promenades sous forme de livre. Tanguy Ottomer vous guide à travers 9 promenades thématiques avec des directions à travers sa ville; y compris une promenade de la mode, une promenade avec des points forts architecturaux, une promenade sur les légendes des cafés, et une où vous découvrez pourquoi Anvers est appelée \'la ville des biscuits\'. À chaque arrêt, vous obtenez une courte explication, écrite dans le style distinctif, spontané et enthousiaste de Tanguy, ainsi que des conseils sur où vous pouvez manger et boire, ou où vous pouvez trouver de belles boutiques. Chaque promenade indique également sa durée, et une carte d\'ensemble montre quelle partie de la ville est explorée. Si vous ne pouvez pas vivre une promenade en direct avec le guide le plus passionné de la ville, alors ce livre, richement illustré avec des photos récentes de Roel Hendrickx, est la meilleure alternative. Vous comprenez immédiatement pourquoi Tanguy Ottomer a été nommé par CNN comme \'l\'un des guides touristiques les plus avisés au monde\'.',
      de: '9 SPAZIERGÄNGE DURCH DIE SCHÖNSTEN ORTE DER STADT AM STROM - MIT GESCHICHTEN UND DEN BESTEN ADRESSEN\n\nNach dem Erfolg von \'De stad van vroeger\' I und II bringt der Berufs-Antwerpener nun seine besten Spaziergänge in Buchform. Tanguy Ottomer führt Sie durch 9 thematische Spaziergänge mit Wegbeschreibungen durch seine Stadt; darunter ein Mode-Spaziergang, ein Spaziergang mit architektonischen Highlights, ein Spaziergang über Café-Legenden und einer, bei dem Sie entdecken, warum Antwerpen \'die Keksstadt\' genannt wird. An jedem Halt erhalten Sie eine kurze Erklärung, geschrieben in Tanguys charakteristischem, spontanem und enthusiastischem Stil, sowie Tipps, wo Sie essen und trinken oder schöne Geschäfte finden können. Bei jedem Spaziergang wird auch angegeben, wie lang er ist, und eine Übersichtskarte zeigt, welcher Teil der Stadt erkundet wird. Wenn Sie keinen Live-Spaziergang mit dem leidenschaftlichsten Führer der Stadt erleben können, dann ist dieses Buch, reich illustriert mit aktuellen Fotos von Roel Hendrickx, die nächstbeste Sache. Sie verstehen sofort, warum Tanguy Ottomer von CNN zu \'einem der klügsten Reiseführer der Welt\' ernannt wurde.'
    }
  },
  {
    slug: 'time-machine-gent',
    uuid: '22d33401-6b30-4ebb-814b-843ef47a9b23',
    title: {
      nl: 'Time Machine Gent',
      en: 'Time Machine Gent',
      fr: 'Time Machine Gent',
      de: 'Time Machine Gent'
    },
    category: 'Book',
    price: 24.95,
    description: {
      nl: 'Fotoboek met 50 vóór & na-foto\'s van Gent – Tanguy Ottomer selecteerde oude foto\'s van de "Stroppendragersstad" en fotograaf Kevin Faingnaert legde dezelfde plekken vandaag vast – een uniek kijkboek vol nostalgie voor jong en oud.',
      en: 'Photo book with 50 before & after photos of Ghent – Tanguy Ottomer selected old photos of the "Noose Bearers City" and photographer Kevin Faingnaert captured the same spots today – a unique picture book full of nostalgia for young and old.',
      fr: 'Livre photo avec 50 photos avant & après de Gand – Tanguy Ottomer a sélectionné de vieilles photos de la "Ville des Porteurs de Corde" et le photographe Kevin Faingnaert a capturé les mêmes endroits aujourd\'hui – un livre d\'images unique plein de nostalgie pour petits et grands.',
      de: 'Fotobuch mit 50 Vorher- und Nachher-Fotos von Gent – Tanguy Ottomer wählte alte Fotos der "Strickträgerstadt" aus und Fotograf Kevin Faingnaert hielt dieselben Orte heute fest – ein einzigartiges Bilderbuch voller Nostalgie für Jung und Alt.'
    },
    additionalInfo: {
      nl: 'Hardcover; 216 blz; 20×18,5 cm; tweetalig NL & EN; ISBN 9789460582936',
      en: 'Hardcover; 216 pages; 20×18.5 cm; bilingual NL & EN; ISBN 9789460582936',
      fr: 'Couverture rigide; 216 pages; 20×18,5 cm; bilingue NL & EN; ISBN 9789460582936',
      de: 'Hardcover; 216 Seiten; 20×18,5 cm; zweisprachig NL & EN; ISBN 9789460582936'
    }
  },
  {
    slug: 'nello-patrasche-groot',
    uuid: '354b683f-cfe8-4699-9faa-924282b4341a',
    title: {
      nl: 'Nello & Patrasche (figurine groot)',
      en: 'Nello & Patrasche (large figurine)',
      fr: 'Nello & Patrasche (grande figurine)',
      de: 'Nello & Patrasche (große Figur)'
    },
    category: 'Merchandise',
    price: 29.95,
    description: {
      nl: 'Decoratief beeldje van Nello & Patrasche – een symbolisch cadeautje dat vriendschap viert.',
      en: 'Decorative figurine of Nello & Patrasche – a symbolic gift celebrating friendship.',
      fr: 'Figurine décorative de Nello & Patrasche – un cadeau symbolique célébrant l\'amitié.',
      de: 'Dekorative Figur von Nello & Patrasche – ein symbolisches Geschenk, das Freundschaft feiert.'
    },
    additionalInfo: {
      nl: 'Lengte 25 cm; gewicht 700 g; materiaal 100% polyresin',
      en: 'Length 25 cm; weight 700 g; material 100% polyresin',
      fr: 'Longueur 25 cm; poids 700 g; matériau 100% polyrésine',
      de: 'Länge 25 cm; Gewicht 700 g; Material 100% Polyresin'
    }
  },
  {
    slug: 'van-manneke-pis-tot-de-betoverende-haas',
    uuid: '37124cd2-128c-4c1e-b7d3-5bb0c2a8ebcb',
    title: {
      nl: 'Van Manneke Pis tot de Betoverende Haas',
      en: 'Van Manneke Pis tot de Betoverende Haas',
      fr: 'Van Manneke Pis tot de Betoverende Haas',
      de: 'Van Manneke Pis tot de Betoverende Haas'
    },
    category: 'Book',
    price: 21.95,
    description: {
      nl: 'Kinderboek met 20 spannende en grappige verhalen die kinderen door België voeren – van het geheim achter Manneken Pis tot betoverende legendes in dorpen – een nostalgische ontdekkingsreis door ons land.',
      en: 'Children\'s book with 20 exciting and funny stories that take children through Belgium – from the secret behind Manneken Pis to enchanting legends in villages – a nostalgic journey of discovery through our country.',
      fr: 'Livre pour enfants avec 20 histoires passionnantes et amusantes qui emmènent les enfants à travers la Belgique – du secret derrière le Manneken Pis aux légendes enchanteresses dans les villages – un voyage nostalgique de découverte à travers notre pays.',
      de: 'Kinderbuch mit 20 spannenden und lustigen Geschichten, die Kinder durch Belgien führen – vom Geheimnis hinter Manneken Pis bis zu bezaubernden Legenden in Dörfern – eine nostalgische Entdeckungsreise durch unser Land.'
    },
    additionalInfo: {
      nl: 'Hardcover; 20 kortverhalen over Belgische legendes en geschiedenis; genomineerd Leesjury 2023-24',
      en: 'Hardcover; 20 short stories about Belgian legends and history; nominated Leesjury 2023-24',
      fr: 'Couverture rigide; 20 nouvelles sur les légendes et l\'histoire belges; nominé Leesjury 2023-24',
      de: 'Hardcover; 20 Kurzgeschichten über belgische Legenden und Geschichte; nominiert Leesjury 2023-24'
    }
  },
  {
    slug: 'nello-patrasche-boek',
    uuid: '7dbaf3da-16cb-43e1-b005-c77ed42a14d4',
    title: {
      nl: 'Nello & Patrasche',
      en: 'Nello & Patrasche',
      fr: 'Nello & Patrasche',
      de: 'Nello & Patrasche'
    },
    category: 'Book',
    price: 15.99,
    description: {
      nl: 'Heruitgave van het wereldberoemde verhaal over weesjongen Nello en zijn hond Patrasche in het Antwerpen van vroeger – een tijdloos kerstverhaal over vriendschap en hoop.',
      en: 'Reissue of the world-famous story about orphan boy Nello and his dog Patrasche in old Antwerp – a timeless Christmas tale about friendship and hope.',
      fr: 'Réédition de l\'histoire mondialement célèbre sur le garçon orphelin Nello et son chien Patrasche dans l\'ancien Anvers – un conte de Noël intemporel sur l\'amitié et l\'espoir.',
      de: 'Neuauflage der weltberühmten Geschichte über den Waisenjungen Nello und seinen Hund Patrasche im alten Antwerpen – eine zeitlose Weihnachtsgeschichte über Freundschaft und Hoffnung.'
    },
    additionalInfo: {
      nl: 'Tweede druk (herziene uitgave); Nederlands; geïllustreerd verhaal (klassieke novelle)',
      en: 'Second edition (revised edition); Dutch; illustrated story (classic novella)',
      fr: 'Deuxième édition (édition révisée); néerlandais; histoire illustrée (nouvelle classique)',
      de: 'Zweite Auflage (überarbeitete Ausgabe); Niederländisch; illustrierte Geschichte (klassische Novelle)'
    }
  },
  {
    slug: 't-stad-van-vroeger-verdwenen-parels',
    uuid: '80d86651-ff35-45d2-be0e-750e3054b602',
    title: {
      nl: '\'t Stad van Vroeger: Verdwenen parels van Antwerpen',
      en: '\'t Stad van Vroeger: Verdwenen parels van Antwerpen',
      fr: '\'t Stad van Vroeger: Verdwenen parels van Antwerpen',
      de: '\'t Stad van Vroeger: Verdwenen parels van Antwerpen'
    },
    category: 'Book',
    price: 21.95,
    description: {
      nl: 'Het eerste nostalgische foto- en verhalenboek van Tanguy Ottomer over de verdwenen parels van Antwerpen – verdwenen gebouwen, pleinen en standbeelden – enthousiast verteld en rijk geïllustreerd met uniek archiefmateriaal.',
      en: 'The first nostalgic photo and story book by Tanguy Ottomer about the disappeared pearls of Antwerp – disappeared buildings, squares and statues – enthusiastically told and richly illustrated with unique archive material.',
      fr: 'Le premier livre nostalgique de photos et d\'histoires de Tanguy Ottomer sur les perles disparues d\'Anvers – bâtiments, places et statues disparus – raconté avec enthousiasme et richement illustré avec du matériel d\'archives unique.',
      de: 'Das erste nostalgische Foto- und Geschichtenbuch von Tanguy Ottomer über die verschwundenen Perlen Antwerpens – verschwundene Gebäude, Plätze und Statuen – begeistert erzählt und reich illustriert mit einzigartigem Archivmaterial.'
    },
    additionalInfo: {
      nl: 'Softcover; 192 blz; 18×22 cm; Nederlands; ISBN 9789460581298; eerste druk 2014',
      en: 'Softcover; 192 pages; 18×22 cm; Dutch; ISBN 9789460581298; first edition 2014',
      fr: 'Couverture souple; 192 pages; 18×22 cm; néerlandais; ISBN 9789460581298; première édition 2014',
      de: 'Softcover; 192 Seiten; 18×22 cm; Niederländisch; ISBN 9789460581298; Erstauflage 2014'
    }
  },
  {
    slug: 'time-machine-antwerpen',
    uuid: '84c7c7e3-e744-44f6-80df-b05c94e76fed',
    title: {
      nl: 'Time Machine Antwerpen',
      en: 'Time Machine Antwerpen',
      fr: 'Time Machine Antwerpen',
      de: 'Time Machine Antwerpen'
    },
    category: 'Book',
    price: 24.95,
    description: {
      nl: 'Fotoboek "Antwerp Then & Now" met 50 verdwenen plekken in Antwerpen, getoond in historische foto\'s en hedendaagse tegenhangers – samengesteld door Tanguy Ottomer (fotografie Jeroen Verrecht) als eerbetoon aan de stad toen en nu.',
      en: 'Photo book "Antwerp Then & Now" with 50 disappeared places in Antwerp, shown in historical photos and contemporary counterparts – compiled by Tanguy Ottomer (photography Jeroen Verrecht) as a tribute to the city then and now.',
      fr: 'Livre photo "Antwerp Then & Now" avec 50 lieux disparus à Anvers, montrés dans des photos historiques et des contreparties contemporaines – compilé par Tanguy Ottomer (photographie Jeroen Verrecht) en hommage à la ville d\'hier et d\'aujourd\'hui.',
      de: 'Fotobuch "Antwerp Then & Now" mit 50 verschwundenen Orten in Antwerpen, gezeigt in historischen Fotos und zeitgenössischen Gegenstücken – zusammengestellt von Tanguy Ottomer (Fotografie Jeroen Verrecht) als Hommage an die Stadt damals und heute.'
    },
    additionalInfo: {
      nl: 'Hardcover; 216 blz; 20×18 cm; tweetalig NL & EN; 2e druk 2021 (herziene editie)',
      en: 'Hardcover; 216 pages; 20×18 cm; bilingual NL & EN; 2nd edition 2021 (revised edition)',
      fr: 'Couverture rigide; 216 pages; 20×18 cm; bilingue NL & EN; 2e édition 2021 (édition révisée)',
      de: 'Hardcover; 216 Seiten; 20×18 cm; zweisprachig NL & EN; 2. Auflage 2021 (überarbeitete Ausgabe)'
    },
    label: '2e DRUK'
  },
  {
    slug: 'knokke-heist-boulevard-nostalgie',
    uuid: '87bb73b6-bcb2-430f-a16d-8d4b00c45779',
    title: {
      nl: 'Knokke-Heist: Boulevard Nostalgie',
      en: 'Knokke-Heist: Boulevard Nostalgie',
      fr: 'Knokke-Heist: Boulevard Nostalgie',
      de: 'Knokke-Heist: Boulevard Nostalgie'
    },
    category: 'Book',
    price: 35.00,
    description: {
      nl: 'Nostalgisch fotoboek over de gouden jaren van mondain Knokke-Heist, boordevol glamoureuze beelden en verrassende weetjes langs iconische locaties (casino, hotels, zeedijk, etc.), een feest voor het oog.',
      en: 'Nostalgic photo book about the golden years of fashionable Knokke-Heist, full of glamorous images and surprising facts along iconic locations (casino, hotels, seafront, etc.), a feast for the eyes.',
      fr: 'Livre photo nostalgique sur les années dorées de la mondaine Knokke-Heist, plein d\'images glamour et de faits surprenants le long de lieux emblématiques (casino, hôtels, digue, etc.), un régal pour les yeux.',
      de: 'Nostalgisches Fotobuch über die goldenen Jahre des mondänen Knokke-Heist, voller glamouröser Bilder und überraschender Fakten entlang ikonischer Orte (Casino, Hotels, Strandpromenade usw.), ein Fest für die Augen.'
    },
    additionalInfo: {
      nl: 'Hardcover; 176 blz; 23×16,5 cm; tweetalige editie NL–FR; ISBN 9789464941166',
      en: 'Hardcover; 176 pages; 23×16.5 cm; bilingual edition NL–FR; ISBN 9789464941166',
      fr: 'Couverture rigide; 176 pages; 23×16,5 cm; édition bilingue NL–FR; ISBN 9789464941166',
      de: 'Hardcover; 176 Seiten; 23×16,5 cm; zweisprachige Ausgabe NL–FR; ISBN 9789464941166'
    }
  },
  {
    slug: 'handelsbeurs-antwerpen',
    uuid: '8aae10e6-3694-4800-8258-0429709e53b6',
    title: {
      nl: 'Handelsbeurs Antwerpen: Past & Present',
      en: 'Handelsbeurs Antwerpen: Past & Present',
      fr: 'Handelsbeurs Antwerpen: Past & Present',
      de: 'Handelsbeurs Antwerpen: Past & Present'
    },
    category: 'Book',
    price: 45.00,
    description: {
      nl: 'Luxueus salontafelboek over de bewogen geschiedenis van de Antwerpse Handelsbeurs – van gloriejaren als handelscentrum en feestlocatie tot de recente renovatie – rijk geïllustreerd en beschreven door Tanguy Ottomer.',
      en: 'Luxurious coffee table book about the eventful history of the Antwerp Stock Exchange – from glory years as a trading center and party venue to the recent renovation – richly illustrated and described by Tanguy Ottomer.',
      fr: 'Livre de table basse luxueux sur l\'histoire mouvementée de la Bourse d\'Anvers – des années de gloire en tant que centre commercial et lieu de fête à la récente rénovation – richement illustré et décrit par Tanguy Ottomer.',
      de: 'Luxuriöses Couchtischbuch über die bewegte Geschichte der Antwerpener Börse – von den Glanzjahren als Handelszentrum und Veranstaltungsort bis zur jüngsten Renovierung – reich illustriert und beschrieben von Tanguy Ottomer.'
    },
    additionalInfo: {
      nl: 'Hardcover; ±250 blz; tweetalige editie NL & ENG; verschenen nov 2024; (gesigneerde exemplaren beschikbaar)',
      en: 'Hardcover; ±250 pages; bilingual edition NL & ENG; published Nov 2024; (signed copies available)',
      fr: 'Couverture rigide; ±250 pages; édition bilingue NL & ENG; publié nov 2024; (exemplaires signés disponibles)',
      de: 'Hardcover; ±250 Seiten; zweisprachige Ausgabe NL & ENG; erschienen Nov 2024; (signierte Exemplare verfügbar)'
    }
  },
  {
    slug: 'elixir-d-anvers',
    uuid: 'a92bd21e-6535-4007-8ab3-9a5a8e12cfa6',
    title: {
      nl: 'Elixir d\'Anvers',
      en: 'Elixir d\'Anvers',
      fr: 'Elixir d\'Anvers',
      de: 'Elixir d\'Anvers'
    },
    category: 'Book',
    price: 39.95,
    description: {
      nl: 'Exclusief salontafelboek over Elixir d\'Anvers – de goudgele Antwerpse likeur – met rijke geschiedenis, uniek archiefmateriaal en verhalen van betrokken families en fans uit de gastronomie, door Tanguy Ottomer.',
      en: 'Exclusive coffee table book about Elixir d\'Anvers – the golden yellow Antwerp liqueur – with rich history, unique archive material and stories from involved families and fans from gastronomy, by Tanguy Ottomer.',
      fr: 'Livre de table basse exclusif sur l\'Elixir d\'Anvers – la liqueur anversoise jaune doré – avec une histoire riche, du matériel d\'archives unique et des histoires de familles impliquées et de fans de la gastronomie, par Tanguy Ottomer.',
      de: 'Exklusives Couchtischbuch über Elixir d\'Anvers – den goldgelben Antwerpener Likör – mit reicher Geschichte, einzigartigem Archivmaterial und Geschichten von beteiligten Familien und Fans aus der Gastronomie, von Tanguy Ottomer.'
    },
    additionalInfo: {
      nl: 'Hardcover; ruim geïllustreerd; tweetalige editie NL & ENG; ISBN 978946436... (2023)',
      en: 'Hardcover; extensively illustrated; bilingual edition NL & ENG; ISBN 978946436... (2023)',
      fr: 'Couverture rigide; largement illustré; édition bilingue NL & ENG; ISBN 978946436... (2023)',
      de: 'Hardcover; umfangreich illustriert; zweisprachige Ausgabe NL & ENG; ISBN 978946436... (2023)'
    }
  },
  {
    slug: 'time-machine-gent-memory',
    uuid: 'b0767a90-4395-4bb6-a09d-51139461cf5d',
    title: {
      nl: 'Time Machine Gent (Memoryspel)',
      en: 'Time Machine Gent (Memory Game)',
      fr: 'Time Machine Gent (Jeu de Mémoire)',
      de: 'Time Machine Gent (Memory-Spiel)'
    },
    category: 'Game',
    price: 15.00,
    description: {
      nl: 'Memoryspel met 60 foto-kaartjes van Gent vroeger en nu – herken jij de straten en pleinen van weleer? Combineer oude en nieuwe foto\'s en ga op een nostalgische zoektocht.',
      en: 'Memory game with 60 photo cards of Ghent then and now – do you recognize the streets and squares of yesteryear? Combine old and new photos and go on a nostalgic quest.',
      fr: 'Jeu de mémoire avec 60 cartes photo de Gand hier et aujourd\'hui – reconnaissez-vous les rues et places d\'autrefois? Combinez anciennes et nouvelles photos et partez en quête nostalgique.',
      de: 'Memory-Spiel mit 60 Fotokarten von Gent damals und heute – erkennen Sie die Straßen und Plätze von einst? Kombinieren Sie alte und neue Fotos und begeben Sie sich auf eine nostalgische Suche.'
    },
    additionalInfo: {
      nl: 'Taal NL & EN; 60 kaartjes; doosformaat 9,5×12×2,1 cm; ISBN 9789460582974',
      en: 'Language NL & EN; 60 cards; box size 9.5×12×2.1 cm; ISBN 9789460582974',
      fr: 'Langue NL & EN; 60 cartes; taille de la boîte 9,5×12×2,1 cm; ISBN 9789460582974',
      de: 'Sprache NL & EN; 60 Karten; Boxgröße 9,5×12×2,1 cm; ISBN 9789460582974'
    }
  },
  {
    slug: 'nello-patrasche-klein',
    uuid: 'b25daa24-ac4f-4c84-8650-a572c6405768',
    title: {
      nl: 'Nello & Patrasche (figurine klein)',
      en: 'Nello & Patrasche (small figurine)',
      fr: 'Nello & Patrasche (petite figurine)',
      de: 'Nello & Patrasche (kleine Figur)'
    },
    category: 'Merchandise',
    price: 14.95,
    description: {
      nl: 'Ontroerend verhaal over weesjongen Nello en zijn trouwe hond Patrasche in 19e-eeuws Antwerpen, met een boodschap van trots en onvoorwaardelijke vriendschap.',
      en: 'Touching story about orphan boy Nello and his faithful dog Patrasche in 19th century Antwerp, with a message of pride and unconditional friendship.',
      fr: 'Histoire touchante sur le garçon orphelin Nello et son fidèle chien Patrasche dans l\'Anvers du 19e siècle, avec un message de fierté et d\'amitié inconditionnelle.',
      de: 'Rührende Geschichte über den Waisenjungen Nello und seinen treuen Hund Patrasche im Antwerpen des 19. Jahrhunderts, mit einer Botschaft von Stolz und bedingungsloser Freundschaft.'
    },
    additionalInfo: {
      nl: 'Lengte 10 cm\n\nGewicht 117 gr\n\n100% polyresin',
      en: 'Length 10 cm\n\nWeight 117 g\n\n100% polyresin',
      fr: 'Longueur 10 cm\n\nPoids 117 g\n\n100% polyrésine',
      de: 'Länge 10 cm\n\nGewicht 117 g\n\n100% Polyresin'
    }
  },
  {
    slug: 'time-machine-antwerpen-memory',
    uuid: 'b4ba4a8a-5b34-4535-8700-5bdc448ee9f7',
    title: {
      nl: 'Time Machine Antwerpen (Memory Game)',
      en: 'Time Machine Antwerpen (Memory Game)',
      fr: 'Time Machine Antwerpen (Jeu de Mémoire)',
      de: 'Time Machine Antwerpen (Memory-Spiel)'
    },
    category: 'Game',
    price: 15.00,
    description: {
      nl: 'Memoryspel met 60 kaarten van Antwerpen – combineer oude stadsbeelden met nieuwe foto\'s en beleef een nostalgisch "trip down memory lane" in \'t Stad terwijl je je geheugen test.',
      en: 'Memory game with 60 cards of Antwerp – combine old city images with new photos and experience a nostalgic "trip down memory lane" in the City while testing your memory.',
      fr: 'Jeu de mémoire avec 60 cartes d\'Anvers – combinez les anciennes images de la ville avec de nouvelles photos et vivez un voyage nostalgique dans le passé de la Ville tout en testant votre mémoire.',
      de: 'Memory-Spiel mit 60 Karten von Antwerpen – kombinieren Sie alte Stadtbilder mit neuen Fotos und erleben Sie eine nostalgische "Reise in die Vergangenheit" in der Stadt, während Sie Ihr Gedächtnis testen.'
    },
    additionalInfo: {
      nl: '60 kaartjes; tweetalige NL/EN instructies; ISBN 9789460582776; gebaseerd op boek \'Time Machine – Antwerpen\'',
      en: '60 cards; bilingual NL/EN instructions; ISBN 9789460582776; based on book \'Time Machine – Antwerpen\'',
      fr: '60 cartes; instructions bilingues NL/EN; ISBN 9789460582776; basé sur le livre \'Time Machine – Antwerpen\'',
      de: '60 Karten; zweisprachige NL/EN Anleitung; ISBN 9789460582776; basierend auf dem Buch \'Time Machine – Antwerpen\''
    }
  },
  {
    slug: 'antwerpen-m-n-engeltje',
    uuid: 'bd2cc2eb-e21b-4243-9ad6-f0e8dbc08219',
    title: {
      nl: 'Antwerpen m\'n Engeltje',
      en: 'Antwerpen m\'n Engeltje',
      fr: 'Antwerpen m\'n Engeltje',
      de: 'Antwerpen m\'n Engeltje'
    },
    category: 'Book',
    price: 19.95,
    description: {
      nl: 'Een bundel persoonlijke kortverhalen waarin Tanguy Ottomer het beruchte en bekende Antwerpen van vroeger doet herleven – een reeks anekdotische vertellingen met de stad als hoofdrolspeler.',
      en: 'A collection of personal short stories in which Tanguy Ottomer brings the notorious and famous Antwerp of the past back to life – a series of anecdotal tales with the city as the main character.',
      fr: 'Un recueil de nouvelles personnelles dans lesquelles Tanguy Ottomer fait revivre l\'Anvers notoire et célèbre d\'autrefois – une série de récits anecdotiques avec la ville comme personnage principal.',
      de: 'Eine Sammlung persönlicher Kurzgeschichten, in denen Tanguy Ottomer das berüchtigte und berühmte Antwerpen der Vergangenheit zum Leben erweckt – eine Reihe anekdotischer Erzählungen mit der Stadt als Hauptfigur.'
    },
    additionalInfo: {
      nl: 'Paperback; ca. 120 blz; Nederlands; verschenen 2018; korte verhalenbundel over Antwerpen',
      en: 'Paperback; approx. 120 pages; Dutch; published 2018; short story collection about Antwerp',
      fr: 'Broché; env. 120 pages; néerlandais; publié 2018; recueil de nouvelles sur Anvers',
      de: 'Taschenbuch; ca. 120 Seiten; Niederländisch; erschienen 2018; Kurzgeschichtensammlung über Antwerpen'
    }
  },
  {
    slug: 'de-boerentoren',
    uuid: 'ccfe1afb-3bb0-4fb6-93f2-4472d4354af8',
    title: {
      nl: 'De Boerentoren',
      en: 'De Boerentoren',
      fr: 'De Boerentoren',
      de: 'De Boerentoren'
    },
    category: 'Book',
    price: 59.00,
    description: {
      nl: 'Rijk geïllustreerd boek over de intrigerende geschiedenis van de Antwerpse Boerentoren – bijna 100 jaar hét icoon aan de skyline – met nieuwe verhalen en ongeziene beelden, gebaseerd op historisch onderzoek en unieke archieffoto\'s.',
      en: 'Richly illustrated book about the intriguing history of the Antwerp Boerentoren – almost 100 years the icon on the skyline – with new stories and unseen images, based on historical research and unique archive photos.',
      fr: 'Livre richement illustré sur l\'histoire intrigante de la Boerentoren d\'Anvers – presque 100 ans l\'icône de l\'horizon – avec de nouvelles histoires et des images inédites, basé sur des recherches historiques et des photos d\'archives uniques.',
      de: 'Reich illustriertes Buch über die faszinierende Geschichte des Antwerpener Boerentoren – fast 100 Jahre das Wahrzeichen der Skyline – mit neuen Geschichten und ungesehenen Bildern, basierend auf historischer Forschung und einzigartigen Archivfotos.'
    },
    additionalInfo: {
      nl: '36×25,2 cm; ca. 320 blz; hardcover; Nederlandstalige editie; quadrichromie druk; ISBN 9789464366969',
      en: '36×25.2 cm; approx. 320 pages; hardcover; Dutch edition; quadrichrome print; ISBN 9789464366969',
      fr: '36×25,2 cm; env. 320 pages; couverture rigide; édition néerlandaise; impression quadrichromie; ISBN 9789464366969',
      de: '36×25,2 cm; ca. 320 Seiten; Hardcover; niederländische Ausgabe; Vierfarbdruck; ISBN 9789464366969'
    }
  },
  {
    slug: 'time-machine-brussels-memory',
    uuid: 'e58b7d59-6141-4dca-9b8d-95ad242a30e1',
    title: {
      nl: 'Time Machine Brussels (Memory Game)',
      en: 'Time Machine Brussels (Memory Game)',
      fr: 'Time Machine Brussels (Jeu de Mémoire)',
      de: 'Time Machine Brussels (Memory-Spiel)'
    },
    category: 'Game',
    price: 15.00,
    description: {
      nl: 'Memory-spel met 60 kaartjes van Brussel vroeger & nu – combineer recente foto\'s met archiefbeelden van dezelfde plek en test je geheugen met dit nostalgische spel.',
      en: 'Memory game with 60 cards of Brussels then & now – combine recent photos with archive images of the same place and test your memory with this nostalgic game.',
      fr: 'Jeu de mémoire avec 60 cartes de Bruxelles hier & aujourd\'hui – combinez des photos récentes avec des images d\'archives du même endroit et testez votre mémoire avec ce jeu nostalgique.',
      de: 'Memory-Spiel mit 60 Karten von Brüssel damals & heute – kombinieren Sie aktuelle Fotos mit Archivbildern desselben Ortes und testen Sie Ihr Gedächtnis mit diesem nostalgischen Spiel.'
    },
    additionalInfo: {
      nl: '60 kaarten; tweetalige handleiding NL & EN; gebaseerd op het boek \'Time Machine Brussels\'; ISBN 9789460582998',
      en: '60 cards; bilingual manual NL & EN; based on the book \'Time Machine Brussels\'; ISBN 9789460582998',
      fr: '60 cartes; manuel bilingue NL & EN; basé sur le livre \'Time Machine Brussels\'; ISBN 9789460582998',
      de: '60 Karten; zweisprachige Anleitung NL & EN; basierend auf dem Buch \'Time Machine Brussels\'; ISBN 9789460582998'
    }
  },
  {
    slug: 'time-machine-brussels',
    uuid: 'e8b92e4e-051b-4848-916f-14a3479fd4b2',
    title: {
      nl: 'Time Machine Brussels',
      en: 'Time Machine Brussels',
      fr: 'Time Machine Brussels',
      de: 'Time Machine Brussels'
    },
    category: 'Book',
    price: 24.95,
    description: {
      nl: 'Fotoboek met 50 unieke voor-en-na foto\'s van Brussel – historische beelden naast hedendaagse heropnames – samengesteld en toegelicht door Tanguy Ottomer (foto\'s Tim Fisher) als nostalgische ode aan de hoofdstad.',
      en: 'Photo book with 50 unique before-and-after photos of Brussels – historical images alongside contemporary re-takes – compiled and explained by Tanguy Ottomer (photos Tim Fisher) as a nostalgic ode to the capital.',
      fr: 'Livre photo avec 50 photos avant-après uniques de Bruxelles – images historiques aux côtés de reprises contemporaines – compilé et expliqué par Tanguy Ottomer (photos Tim Fisher) comme une ode nostalgique à la capitale.',
      de: 'Fotobuch mit 50 einzigartigen Vorher-Nachher-Fotos von Brüssel – historische Bilder neben zeitgenössischen Neuaufnahmen – zusammengestellt und erläutert von Tanguy Ottomer (Fotos Tim Fisher) als nostalgische Ode an die Hauptstadt.'
    },
    additionalInfo: {
      nl: 'Hardcover; ±216 blz; 20×18 cm; drietalige editie NL/FR/EN; ISBN 9789460582981 (2021)',
      en: 'Hardcover; ±216 pages; 20×18 cm; trilingual edition NL/FR/EN; ISBN 9789460582981 (2021)',
      fr: 'Couverture rigide; ±216 pages; 20×18 cm; édition trilingue NL/FR/EN; ISBN 9789460582981 (2021)',
      de: 'Hardcover; ±216 Seiten; 20×18 cm; dreisprachige Ausgabe NL/FR/EN; ISBN 9789460582981 (2021)'
    }
  },
  {
    slug: 'winkelen-in-t-stad-van-vroeger',
    uuid: 'e921c2e9-d991-4827-8560-e3c342fff9bb',
    title: {
      nl: 'Winkelen in \'t Stad van Vroeger',
      en: 'Winkelen in \'t Stad van Vroeger',
      fr: 'Winkelen in \'t Stad van Vroeger',
      de: 'Winkelen in \'t Stad van Vroeger'
    },
    category: 'Book',
    price: 21.95,
    description: {
      nl: 'Nostalgisch boek over de Antwerpse winkelcultuur van weleer – van de grandeur van de fin-de-siècle modepaleizen en warenhuizen tot de charme van buurtwinkels en veranderende winkelstraten in de 20e eeuw.',
      en: 'Nostalgic book about Antwerp\'s shopping culture of yesteryear – from the grandeur of fin-de-siècle fashion palaces and department stores to the charm of neighborhood shops and changing shopping streets in the 20th century.',
      fr: 'Livre nostalgique sur la culture commerciale d\'Anvers d\'autrefois – de la grandeur des palais de la mode et grands magasins fin-de-siècle au charme des magasins de quartier et des rues commerçantes changeantes du 20e siècle.',
      de: 'Nostalgisches Buch über die Einkaufskultur Antwerpens von einst – von der Pracht der Modepaläste und Warenhäuser der Jahrhundertwende bis zum Charme von Nachbarschaftsgeschäften und sich verändernden Einkaufsstraßen im 20. Jahrhundert.'
    },
    additionalInfo: {
      nl: 'Softcover; 200 blz; 17×22 cm; Nederlands; ISBN 9789460582882; verschenen 11 dec 2021',
      en: 'Softcover; 200 pages; 17×22 cm; Dutch; ISBN 9789460582882; published Dec 11, 2021',
      fr: 'Couverture souple; 200 pages; 17×22 cm; néerlandais; ISBN 9789460582882; publié 11 déc 2021',
      de: 'Softcover; 200 Seiten; 17×22 cm; Niederländisch; ISBN 9789460582882; erschienen 11. Dez 2021'
    }
  }
];
