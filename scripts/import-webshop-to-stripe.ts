import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env
config({ path: resolve(process.cwd(), '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WebshopItem {
  Name: string;
  Category: string;
  'Price (EUR)': string;
  Description: string;
  'Additional Info': string;
  uuid: string;
}

// CSV data from user
const webshopItems: WebshopItem[] = [
  {
    Name: 'Antwerpen Zwart Wit',
    Category: 'Book',
    'Price (EUR)': '45.00',
    Description: 'Fotoboek met 182 pakkende zwart-witbeelden van Antwerpen (fin de siècle tot jaren 1990), gerangschikt per wijk met begeleidende toelichtingen door stadsgids Tanguy Ottomer.',
    'Additional Info': 'Formaat 21,5×27 cm; 240 blz; hardcover (linnen rug); Nederlands; ISBN 9789460583926; Verschijningsdatum 25 november',
    uuid: '00e77558-78fe-41db-bd68-cdbc26f3de17'
  },
  {
    Name: 'Uitgaan in \'t Stad van Vroeger',
    Category: 'Book',
    'Price (EUR)': '21.95',
    Description: 'Boeiend boek over het uitgaansleven in het oude Antwerpen – van legendarische variététheaters en danszalen uit de jaren \'20 tot de verdwenen bioscopen en clubs van latere decennia – een nostalgische terugblik op Antwerpens bruisende nachtleven.',
    'Additional Info': 'Softcover; 176 blz; 17×22 cm; Nederlands; ISBN 9789460582875; verschenen okt 2015',
    uuid: '06f563b8-6fbd-4431-8054-32972ef59e40'
  },
  {
    Name: 'Ondernemen in \'t Stad van Vroeger',
    Category: 'Book',
    'Price (EUR)': '21.95',
    Description: 'Nostalgische ode aan Antwerpse bedrijven van weleer – verhalen van legendarische Antwerpse ondernemingen (zoals oude snoepfabrieken, koffiebranders, warenhuizen) en de gedreven ondernemers erachter, verzameld door Tanguy Ottomer.',
    'Additional Info': 'Softcover; ~180 blz; Nederlands; reeks \'t Stad van Vroeger deel 3 (nieuwe druk 2023)',
    uuid: '139893ba-5942-4486-b4f4-3d03778cc2d8'
  },
  {
    Name: '50 Flemish Icons',
    Category: 'Book',
    'Price (EUR)': '24.95',
    Description: 'Boek dat aan de hand van 50 typisch Vlaamse iconen de regio Vlaanderen belicht – van historische figuren en gebeurtenissen tot culinaire tradities en unieke innovaties – in 50 korte toegankelijke verhalen door stadsgids Tanguy Ottomer.',
    'Additional Info': 'Tweetalige editie Nederlands & English (parallelle tekst)',
    uuid: '17689fb6-ecfe-4f3a-b52e-083a93ac6b86'
  },
  {
    Name: 'Op Stap in Antwerpen',
    Category: 'Book',
    'Price (EUR)': '19.95',
    Description: '9 WANDELINGEN LANGS DE MOOISTE PLEKKEN VAN DE STAD AAN DE STAD STROOM - MET VERHALEN EN DE LEUKSTE ADRESSEN\n\nNa het succes van \'De stad van vroeger\' I en II brengt de Beroepsantwerpenaar nu zijn beste wandelingen in boekvorm. Tanguy Ottomer leidt je in 9 thematische wandelingen met wegbeschrijvingen door zijn stad; er is o.a. een modewandeling, een wandeling met architecturale highlights, een wandeling over cafélegendes, en een waarin je ontdekt waarom Antwerpen \'de koekenstad\' wordt genoemd. Bij elke stopplaats krijg je een korte uitleg, geschreven in Tanguy\'s eigenzinnige, spontane en enthousiaste stijl, en ook tips over waar je iets kunt gaan eten en drinken, of waar je leuke winkels vindt. Bij elke wandeling staat ook aangegeven hoe lang ze is, en een overzichtskaart toont welk deel van de stad wordt verkend. Als je geen live wandeling met de meest gepassioneerde gids van \'t stad kunt meemaken, dan is dit boek, rijkelijk geïllustreerd met up-to-date foto\'s van Roel Hendrickx, the next best thing. Je begrijpt meteen waarom Tanguy Ottomer door CNN werd uitgeroepen tot \'one of the savviest tour guides in the world\'.',
    'Additional Info': '',
    uuid: '2291d69f-ecb3-4ddf-bdee-c81f59a40a72'
  },
  {
    Name: 'Time Machine Gent',
    Category: 'Book',
    'Price (EUR)': '24.95',
    Description: 'Fotoboek met 50 vóór & na-foto\'s van Gent – Tanguy Ottomer selecteerde oude foto\'s van de "Stroppendragersstad" en fotograaf Kevin Faingnaert legde dezelfde plekken vandaag vast – een uniek kijkboek vol nostalgie voor jong en oud.',
    'Additional Info': 'Hardcover; 216 blz; 20×18,5 cm; tweetalig NL & EN; ISBN 9789460582936',
    uuid: '22d33401-6b30-4ebb-814b-843ef47a9b23'
  },
  {
    Name: 'Nello & Patrasche (figurine groot)',
    Category: 'Merchandise',
    'Price (EUR)': '29.95',
    Description: 'Decoratief beeldje van Nello & Patrasche – een symbolisch cadeautje dat vriendschap viert.',
    'Additional Info': 'Lengte 25 cm; gewicht 700 g; materiaal 100% polyresin',
    uuid: '354b683f-cfe8-4699-9faa-924282b4341a'
  },
  {
    Name: 'Van Manneke Pis tot de Betoverende Haas',
    Category: 'Book',
    'Price (EUR)': '21.95',
    Description: 'Kinderboek met 20 spannende en grappige verhalen die kinderen door België voeren – van het geheim achter Manneken Pis tot betoverende legendes in dorpen – een nostalgische ontdekkingsreis door ons land.',
    'Additional Info': 'Hardcover; 20 kortverhalen over Belgische legendes en geschiedenis; genomineerd Leesjury 2023-24',
    uuid: '37124cd2-128c-4c1e-b7d3-5bb0c2a8ebcb'
  },
  {
    Name: 'Test in test',
    Category: 'Game',
    'Price (EUR)': '200',
    Description: 'testdescripotin',
    'Additional Info': 'jqflmsdkjfmql',
    uuid: '72bcde18-d94d-430b-aacd-84effee6b74a'
  },
  {
    Name: 'Nello & Patrasche',
    Category: 'Book',
    'Price (EUR)': '15.99',
    Description: 'Heruitgave van het wereldberoemde verhaal over weesjongen Nello en zijn hond Patrasche in het Antwerpen van vroeger – een tijdloos kerstverhaal over vriendschap en hoop.',
    'Additional Info': 'Tweede druk (herziene uitgave); Nederlands; geïllustreerd verhaal (klassieke novelle)',
    uuid: '7dbaf3da-16cb-43e1-b005-c77ed42a14d4'
  },
  {
    Name: '\'t Stad van Vroeger: Verdwenen parels van Antwerpen',
    Category: 'Book',
    'Price (EUR)': '21.95',
    Description: 'Het eerste nostalgische foto- en verhalenboek van Tanguy Ottomer over de verdwenen parels van Antwerpen – verdwenen gebouwen, pleinen en standbeelden – enthousiast verteld en rijk geïllustreerd met uniek archiefmateriaal.',
    'Additional Info': 'Softcover; 192 blz; 18×22 cm; Nederlands; ISBN 9789460581298; eerste druk 2014',
    uuid: '80d86651-ff35-45d2-be0e-750e3054b602'
  },
  {
    Name: 'Time Machine Antwerpen',
    Category: 'Book',
    'Price (EUR)': '24.95',
    Description: 'Fotoboek "Antwerp Then & Now" met 50 verdwenen plekken in Antwerpen, getoond in historische foto\'s en hedendaagse tegenhangers – samengesteld door Tanguy Ottomer (fotografie Jeroen Verrecht) als eerbetoon aan de stad toen en nu.',
    'Additional Info': 'Hardcover; 216 blz; 20×18 cm; tweetalig NL & EN; 2e druk 2021 (herziene editie)',
    uuid: '84c7c7e3-e744-44f6-80df-b05c94e76fed'
  },
  {
    Name: 'Knokke-Heist: Boulevard Nostalgie',
    Category: 'Book',
    'Price (EUR)': '35.00',
    Description: 'Nostalgisch fotoboek over de gouden jaren van mondain Knokke-Heist, boordevol glamoureuze beelden en verrassende weetjes langs iconische locaties (casino, hotels, zeedijk, etc.), een feest voor het oog.',
    'Additional Info': 'Hardcover; 176 blz; 23×16,5 cm; tweetalige editie NL–FR; ISBN 9789464941166',
    uuid: '87bb73b6-bcb2-430f-a16d-8d4b00c45779'
  },
  {
    Name: 'Handelsbeurs Antwerpen: Past & Present',
    Category: 'Book',
    'Price (EUR)': '45.00',
    Description: 'Luxueus salontafelboek over de bewogen geschiedenis van de Antwerpse Handelsbeurs – van gloriejaren als handelscentrum en feestlocatie tot de recente renovatie – rijk geïllustreerd en beschreven door Tanguy Ottomer.',
    'Additional Info': 'Hardcover; ±250 blz; tweetalige editie NL & ENG; verschenen nov 2024; (gesigneerde exemplaren beschikbaar)',
    uuid: '8aae10e6-3694-4800-8258-0429709e53b6'
  },
  {
    Name: 'Elixir d\'Anvers',
    Category: 'Book',
    'Price (EUR)': '39.95',
    Description: 'Exclusief salontafelboek over Elixir d\'Anvers – de goudgele Antwerpse likeur – met rijke geschiedenis, uniek archiefmateriaal en verhalen van betrokken families en fans uit de gastronomie, door Tanguy Ottomer.',
    'Additional Info': 'Hardcover; ruim geïllustreerd; tweetalige editie NL & ENG; ISBN 978946436... (2023)',
    uuid: 'a92bd21e-6535-4007-8ab3-9a5a8e12cfa6'
  },
  {
    Name: 'Time Machine Gent (Memoryspel)',
    Category: 'Game',
    'Price (EUR)': '15.00',
    Description: 'Memoryspel met 60 foto-kaartjes van Gent vroeger en nu – herken jij de straten en pleinen van weleer? Combineer oude en nieuwe foto\'s en ga op een nostalgische zoektocht.',
    'Additional Info': 'Taal NL & EN; 60 kaartjes; doosformaat 9,5×12×2,1 cm; ISBN 9789460582974',
    uuid: 'b0767a90-4395-4bb6-a09d-51139461cf5d'
  },
  {
    Name: 'Nello & Patrasche (figurine klein)',
    Category: 'Merchandise',
    'Price (EUR)': '14.95',
    Description: 'Ontroerend verhaal over weesjongen Nello en zijn trouwe hond Patrasche in 19e-eeuws Antwerpen, met een boodschap van trots en onvoorwaardelijke vriendschap.',
    'Additional Info': 'Lengte 10 cm\n\nGewicht 117 gr\n\n100% polyresin',
    uuid: 'b25daa24-ac4f-4c84-8650-a572c6405768'
  },
  {
    Name: 'Time Machine Antwerpen (Memory Game)',
    Category: 'Game',
    'Price (EUR)': '15.00',
    Description: 'Memoryspel met 60 kaarten van Antwerpen – combineer oude stadsbeelden met nieuwe foto\'s en beleef een nostalgisch "trip down memory lane" in \'t Stad terwijl je je geheugen test.',
    'Additional Info': '60 kaartjes; tweetalige NL/EN instructies; ISBN 9789460582776; gebaseerd op boek \'Time Machine – Antwerpen\'',
    uuid: 'b4ba4a8a-5b34-4535-8700-5bdc448ee9f7'
  },
  {
    Name: 'Antwerpen m\'n Engeltje',
    Category: 'Book',
    'Price (EUR)': '19.95',
    Description: 'Een bundel persoonlijke kortverhalen waarin Tanguy Ottomer het beruchte en bekende Antwerpen van vroeger doet herleven – een reeks anekdotische vertellingen met de stad als hoofdrolspeler.',
    'Additional Info': 'Paperback; ca. 120 blz; Nederlands; verschenen 2018; korte verhalenbundel over Antwerpen',
    uuid: 'bd2cc2eb-e21b-4243-9ad6-f0e8dbc08219'
  },
  {
    Name: 'De Boerentoren',
    Category: 'Book',
    'Price (EUR)': '59.00',
    Description: 'Rijk geïllustreerd boek over de intrigerende geschiedenis van de Antwerpse Boerentoren – bijna 100 jaar hét icoon aan de skyline – met nieuwe verhalen en ongeziene beelden, gebaseerd op historisch onderzoek en unieke archieffoto\'s.',
    'Additional Info': '36×25,2 cm; ca. 320 blz; hardcover; Nederlandstalige editie; quadrichromie druk; ISBN 9789464366969',
    uuid: 'ccfe1afb-3bb0-4fb6-93f2-4472d4354af8'
  },
  {
    Name: 'Time Machine Brussels (Memory Game)',
    Category: 'Game',
    'Price (EUR)': '15.00',
    Description: 'Memory-spel met 60 kaartjes van Brussel vroeger & nu – combineer recente foto\'s met archiefbeelden van dezelfde plek en test je geheugen met dit nostalgische spel.',
    'Additional Info': '60 kaarten; tweetalige handleiding NL & EN; gebaseerd op het boek \'Time Machine Brussels\'; ISBN 9789460582998',
    uuid: 'e58b7d59-6141-4dca-9b8d-95ad242a30e1'
  },
  {
    Name: 'Time Machine Brussels',
    Category: 'Book',
    'Price (EUR)': '24.95',
    Description: 'Fotoboek met 50 unieke voor-en-na foto\'s van Brussel – historische beelden naast hedendaagse heropnames – samengesteld en toegelicht door Tanguy Ottomer (foto\'s Tim Fisher) als nostalgische ode aan de hoofdstad.',
    'Additional Info': 'Hardcover; ±216 blz; 20×18 cm; drietalige editie NL/FR/EN; ISBN 9789460582981 (2021)',
    uuid: 'e8b92e4e-051b-4848-916f-14a3479fd4b2'
  },
  {
    Name: 'Winkelen in \'t Stad van Vroeger',
    Category: 'Book',
    'Price (EUR)': '21.95',
    Description: 'Nostalgisch boek over de Antwerpse winkelcultuur van weleer – van de grandeur van de fin-de-siècle modepaleizen en warenhuizen tot de charme van buurtwinkels en veranderende winkelstraten in de 20e eeuw.',
    'Additional Info': 'Softcover; 200 blz; 17×22 cm; Nederlands; ISBN 9789460582882; verschenen 11 dec 2021',
    uuid: 'e921c2e9-d991-4827-8560-e3c342fff9bb'
  }
];

async function importWebshopToStripe() {
  console.log('🚀 Starting Webshop Stripe import...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let updateCount = 0;

  for (const item of webshopItems) {
    try {
      const priceValue = parseFloat(item['Price (EUR)'].replace(',', '.'));
      
      if (isNaN(priceValue) || priceValue <= 0) {
        console.log(`⏭️  Skipping "${item.Name}" - Invalid price: ${item['Price (EUR)']}`);
        skipCount++;
        continue;
      }

      const priceInCents = Math.round(priceValue * 100);

      console.log(`\n📦 Processing: ${item.Name}`);
      console.log(`   Category: ${item.Category}`);
      console.log(`   Price: €${priceValue.toFixed(2)}`);

      // Check if item already exists in database
      const { data: existingItem, error: fetchError } = await supabase
        .from('webshop_data')
        .select('uuid, stripe_product_id, stripe_price_id')
        .eq('uuid', item.uuid)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`   ❌ Error checking existing item:`, fetchError);
        errorCount++;
        continue;
      }

      // Upsert item in database
      const { data: dbItem, error: upsertError } = await supabase
        .from('webshop_data')
        .upsert({
          uuid: item.uuid,
          Name: item.Name,
          Category: item.Category,
          'Price (EUR)': item['Price (EUR)'],
          Description: item.Description,
          'Additional Info': item['Additional Info'],
        }, {
          onConflict: 'uuid'
        })
        .select()
        .single();

      if (upsertError) {
        console.error(`   ❌ Error upserting to database:`, upsertError);
        errorCount++;
        continue;
      }

      // Check if Stripe product already exists
      if (existingItem?.stripe_product_id) {
        console.log(`   ℹ️  Stripe product already exists: ${existingItem.stripe_product_id}`);
        
        // Update existing Stripe product
        try {
          await stripe.products.update(existingItem.stripe_product_id, {
            name: item.Name,
            description: item.Description,
            metadata: {
              webshop_uuid: item.uuid,
              category: item.Category || '',
            },
          });

          // Check if price needs updating
          if (existingItem.stripe_price_id) {
            const existingPrice = await stripe.prices.retrieve(existingItem.stripe_price_id);
            const existingPriceValue = existingPrice.unit_amount ? existingPrice.unit_amount / 100 : 0;
            
            if (Math.abs(existingPriceValue - priceValue) > 0.01) {
              // Price changed, archive old price and create new one
              console.log(`   🔄 Price changed, creating new price...`);
              
              const newPrice = await stripe.prices.create({
                product: existingItem.stripe_product_id,
                unit_amount: priceInCents,
                currency: 'eur',
                metadata: {
                  webshop_uuid: item.uuid,
                },
              });

              await stripe.products.update(existingItem.stripe_product_id, {
                default_price: newPrice.id,
              });

              // Update database with new price ID
              await supabase
                .from('webshop_data')
                .update({ stripe_price_id: newPrice.id })
                .eq('uuid', item.uuid);

              console.log(`   ✅ Updated product and created new price: ${newPrice.id}`);
            } else {
              console.log(`   ✅ Product and price already up to date`);
            }
          } else {
            // No price exists, create one
            const price = await stripe.prices.create({
              product: existingItem.stripe_product_id,
              unit_amount: priceInCents,
              currency: 'eur',
              metadata: {
                webshop_uuid: item.uuid,
              },
            });

            await stripe.products.update(existingItem.stripe_product_id, {
              default_price: price.id,
            });

            await supabase
              .from('webshop_data')
              .update({ stripe_price_id: price.id })
              .eq('uuid', item.uuid);

            console.log(`   ✅ Created new price: ${price.id}`);
          }

          updateCount++;
        } catch (stripeError: any) {
          console.error(`   ❌ Error updating Stripe product:`, stripeError.message);
          errorCount++;
          continue;
        }
      } else {
        // Create new Stripe product
        console.log(`   🆕 Creating new Stripe product...`);

        const product = await stripe.products.create({
          name: item.Name,
          description: item.Description,
          metadata: {
            webshop_uuid: item.uuid,
            category: item.Category || '',
          },
          active: true,
        });

        console.log(`   ✅ Product created: ${product.id}`);

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceInCents,
          currency: 'eur',
          metadata: {
            webshop_uuid: item.uuid,
          },
        });

        console.log(`   ✅ Price created: ${price.id} (€${priceValue.toFixed(2)})`);

        // Set default price
        await stripe.products.update(product.id, {
          default_price: price.id,
        });

        // Update database with Stripe IDs
        const { error: updateError } = await supabase
          .from('webshop_data')
          .update({
            stripe_product_id: product.id,
            stripe_price_id: price.id,
          })
          .eq('uuid', item.uuid);

        if (updateError) {
          console.error(`   ❌ Error updating database with Stripe IDs:`, updateError);
          errorCount++;
          continue;
        }

        successCount++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error importing "${item.Name}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n\n📈 Import Summary:');
  console.log(`   ✅ Successfully created: ${successCount}`);
  console.log(`   🔄 Updated existing: ${updateCount}`);
  console.log(`   ⏭️  Skipped (invalid price): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total processed: ${webshopItems.length}`);
}

importWebshopToStripe()
  .then(() => {
    console.log('\n✨ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

