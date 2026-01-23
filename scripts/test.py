import stripe  # pyright: ignore[reportMissingImports]
import json
import time

# Initialize Stripe API keys
TEST_SECRET_KEY = 'sk_test_YOUR_TEST_SECRET_KEY'
LIVE_SECRET_KEY = 'sk_live_YOUR_LIVE_SECRET_KEY'

# Your data from the query
items = [
    {
        'id': '000c51df-ccba-482c-a0b9-3c9792f2f395',
        'title': 'Brussel op Maat',
        'city': 'brussel',
        'status': 'published',
        'options': {
            'op_maat': True,
            'stripe_price_id': 'price_1Sp8o6FCcf63G2MievgPGR4v',
            'stripe_product_id': 'prod_TmiEebAvhGMsdY'
        }
    }
]


def migrate_product(item, test_stripe, live_stripe):
    """Migrate a single product from test to live environment."""
    try:
        print(f"\nMigrating: {item['title']}")
        
        # 1. Fetch the test product details
        test_product = test_stripe.Product.retrieve(
            item['options']['stripe_product_id']
        )
        
        # 2. Fetch the test price details
        test_price = test_stripe.Price.retrieve(
            item['options']['stripe_price_id']
        )
        
        print(f"  Test Product: {test_product.name}")
        print(f"  Test Price: {test_price.unit_amount / 100} {test_price.currency.upper()}")
        
        # 3. Create the product in live environment
        live_product_params = {
            'name': test_product.name,
            'active': test_product.active
        }
        
        if test_product.get('description'):
            live_product_params['description'] = test_product.description
        if test_product.get('metadata'):
            live_product_params['metadata'] = test_product.metadata
        if test_product.get('images'):
            live_product_params['images'] = test_product.images
            
        live_product = live_stripe.Product.create(**live_product_params)
        print(f"  ✓ Created live product: {live_product.id}")
        
        # 4. Create the price in live environment
        live_price_params = {
            'product': live_product.id,
            'unit_amount': test_price.unit_amount,
            'currency': test_price.currency
        }
        
        if test_price.get('recurring'):
            live_price_params['recurring'] = test_price.recurring
        if test_price.get('metadata'):
            live_price_params['metadata'] = test_price.metadata
            
        live_price = live_stripe.Price.create(**live_price_params)
        print(f"  ✓ Created live price: {live_price.id}")
        
        # 5. Return the mapping for database update
        new_options = item['options'].copy()
        new_options['stripe_product_id'] = live_product.id
        new_options['stripe_price_id'] = live_price.id
        
        return {
            'id': item['id'],
            'title': item['title'],
            'old_product_id': item['options']['stripe_product_id'],
            'new_product_id': live_product.id,
            'old_price_id': item['options']['stripe_price_id'],
            'new_price_id': live_price.id,
            'options': new_options
        }
        
    except Exception as e:
        print(f"  ✗ Error migrating {item['title']}: {str(e)}")
        return None


def migrate_all():
    """Migrate all products from test to live environment."""
    print('Starting migration from test to live environment...\n')
    
    # Initialize Stripe clients
    test_stripe = stripe
    test_stripe.api_key = TEST_SECRET_KEY
    
    live_stripe = stripe
    live_stripe.api_key = LIVE_SECRET_KEY
    
    results = []
    
    for item in items:
        # Only migrate published items (skip drafts if desired)
        if item['status'] == 'published':
            result = migrate_product(item, test_stripe, live_stripe)
            if result:
                results.append(result)
            # Add a small delay to avoid rate limits
            time.sleep(0.5)
    
    print('\n\n=== MIGRATION COMPLETE ===\n')
    print('SQL UPDATE statements:\n')
    
    # Generate SQL update statements
    for r in results:
        options_json = json.dumps(r['options']).replace("'", "''")
        print(f"UPDATE tours SET options = '{options_json}' WHERE id = '{r['id']}';")
    
    print('\n\nJSON mapping for reference:')
    print(json.dumps(results, indent=2))
    
    # Save results to file
    with open('migration_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print('\n\nResults saved to migration_results.json')
    
    return results


if __name__ == '__main__':
    migrate_all()
    print('\nMigration script completed successfully!')