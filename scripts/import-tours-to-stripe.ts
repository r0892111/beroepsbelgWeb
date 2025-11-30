import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Tour {
  id: string;
  city: string;
  title: string;
  type: string;
  duration_minutes: number;
  price: string | null;
  description: string;
}

async function importToursToStripe() {
  console.log('🚀 Starting Stripe import...\n');

  const { data: tours, error } = await supabase
    .from('tours_table_prod')
    .select('id, city, title, type, duration_minutes, price, description')
    .order('city, title');

  if (error) {
    console.error('❌ Error fetching tours:', error);
    return;
  }

  if (!tours || tours.length === 0) {
    console.log('⚠️  No tours found in database');
    return;
  }

  console.log(`📊 Found ${tours.length} tours to import\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const tour of tours as Tour[]) {
    try {
      if (!tour.price || parseFloat(tour.price) === 0) {
        console.log(`⏭️  Skipping "${tour.title}" - No price set`);
        skipCount++;
        continue;
      }

      const priceInCents = Math.round(parseFloat(tour.price) * 100);

      console.log(`\n📦 Creating product: ${tour.title}`);

      const product = await stripe.products.create({
        name: tour.title,
        description: tour.description,
        metadata: {
          tour_id: tour.id,
          city: tour.city,
          type: tour.type,
          duration_minutes: tour.duration_minutes.toString(),
        },
      });

      console.log(`   ✅ Product created: ${product.id}`);

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'eur',
        metadata: {
          tour_id: tour.id,
        },
      });

      console.log(`   ✅ Price created: ${price.id} (€${tour.price})`);

      successCount++;
    } catch (error) {
      console.error(`   ❌ Error importing "${tour.title}":`, error);
      errorCount++;
    }
  }

  console.log('\n\n📈 Import Summary:');
  console.log(`   ✅ Successfully imported: ${successCount}`);
  console.log(`   ⏭️  Skipped (no price): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📊 Total processed: ${tours.length}`);
}

importToursToStripe()
  .then(() => {
    console.log('\n✨ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
