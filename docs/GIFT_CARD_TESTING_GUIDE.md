# Gift Card Testing Guide

This guide provides step-by-step instructions for testing the gift card implementation.

## Prerequisites

1. **Run Database Migration**
   ```bash
   # Apply the gift cards tables migration
   npx supabase migration up
   ```
   Or manually run: `supabase/migrations/20260212000000_create_gift_cards_tables.sql`

2. **Set Environment Variables**
   - `N8N_GIFT_CARD_WEBHOOK` - Webhook URL for sending gift card emails (optional, but recommended)
   - `STRIPE_SECRET_KEY` - Stripe secret key (should already be set)
   - `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret (should already be set)

3. **Deploy Functions**
   ```bash
   npx supabase functions deploy stripe-webhook
   npx supabase functions deploy create-webshop-checkout
   npx supabase functions deploy create-checkout-session
   ```

---

## Test 1: Purchase a Gift Card

### Steps:
1. Navigate to the webshop (`/[locale]/webshop`)
2. Find the "Cadeaubon" (Gift Card) product
3. Click "Add to Cart" or the product card
4. In the gift card dialog:
   - Select a preset amount (€25, €50, €100, €200) OR
   - Enter a custom amount (minimum €25, maximum €10,000)
5. Click "Add Gift Card"
6. Proceed to checkout
7. Fill in customer details (name, email, phone)
8. Complete payment using Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

### Expected Results:
- ✅ Payment succeeds
- ✅ Order is created in `stripe_orders` table
- ✅ Gift card is created in `gift_cards` table with:
  - Unique code (format: XXXX-XXXX-XXXX-XXXX)
  - `initial_amount` = purchase amount
  - `current_balance` = purchase amount
  - `status` = 'active'
  - `purchaser_email` = customer email
  - `recipient_email` = customer email (for now)
- ✅ Email webhook is called (if `N8N_GIFT_CARD_WEBHOOK` is set)
- ✅ Transaction is logged in `gift_card_transactions` table

### Verification:
```sql
-- Check gift card was created
SELECT * FROM gift_cards 
WHERE purchaser_email = 'your-test-email@example.com' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check transaction was logged
SELECT * FROM gift_card_transactions 
WHERE gift_card_id = (SELECT id FROM gift_cards WHERE purchaser_email = 'your-test-email@example.com' ORDER BY created_at DESC LIMIT 1);
```

---

## Test 2: Check Gift Card Balance

### Steps:
1. Navigate to `/[locale]/gift-cards/balance`
2. Enter the gift card code from Test 1
3. Click "Check Balance"

### Expected Results:
- ✅ Shows current balance
- ✅ Shows original amount
- ✅ Shows status (should be "active")
- ✅ Shows purchase date
- ✅ "Start Shopping" button is visible

### Edge Cases to Test:
- ❌ Invalid code → Shows error "Invalid gift card code"
- ❌ Expired code → Shows error "Gift card has expired" (if expiration is implemented)
- ❌ Cancelled code → Shows error "Gift card is cancelled"

---

## Test 3: Redeem Gift Card - Webshop Order

### Steps:
1. Navigate to webshop (`/[locale]/webshop`)
2. Add products to cart (total should be less than gift card balance)
3. Click checkout
4. In checkout dialog, scroll to "Have a gift card?" section
5. Enter gift card code
6. Click "Apply"
7. Verify discount is applied to total
8. Complete checkout with Stripe test card

### Expected Results:
- ✅ Gift card code validates successfully
- ✅ Green checkmark appears with code and discount amount
- ✅ Total price is reduced by gift card amount
- ✅ After payment, gift card balance is reduced
- ✅ Transaction is recorded in `gift_card_transactions`
- ✅ If balance reaches €0, gift card status changes to 'redeemed'

### Verification:
```sql
-- Check gift card balance was reduced
SELECT code, current_balance, status, last_used_at 
FROM gift_cards 
WHERE code = 'YOUR-GIFT-CARD-CODE';

-- Check redemption transaction
SELECT * FROM gift_card_transactions 
WHERE gift_card_id = (SELECT id FROM gift_cards WHERE code = 'YOUR-GIFT-CARD-CODE')
ORDER BY created_at DESC;
```

### Edge Cases:
- **Partial Redemption**: Order total (€50) < Gift card balance (€100)
  - ✅ Only €50 is deducted
  - ✅ Remaining balance: €50
  - ✅ Status remains 'active'
  
- **Full Redemption**: Order total (€100) = Gift card balance (€100)
  - ✅ Full €100 is deducted
  - ✅ Remaining balance: €0
  - ✅ Status changes to 'redeemed'

- **Over Redemption**: Order total (€150) > Gift card balance (€100)
  - ✅ Only €100 is deducted
  - ✅ Customer pays remaining €50 via Stripe
  - ✅ Gift card balance: €0, status: 'redeemed'

---

## Test 4: Redeem Gift Card - Tour Booking

### Steps:
1. Navigate to a tour page
2. Click "Book Now"
3. Fill in booking details:
   - Date
   - Time slot
   - Number of people
   - Customer details
4. In the upsell dialog, scroll to "Have a gift card?" section
5. Enter gift card code
6. Click "Apply"
7. Verify discount is applied to total
8. Complete checkout with Stripe test card

### Expected Results:
- ✅ Gift card code validates successfully
- ✅ Discount appears in price breakdown
- ✅ Total price is reduced
- ✅ After payment, gift card balance is reduced
- ✅ Transaction is recorded (with `stripe_order_id` = null, since tours don't create stripe_orders)

### Verification:
```sql
-- Check gift card was redeemed
SELECT code, current_balance, status, last_used_at 
FROM gift_cards 
WHERE code = 'YOUR-GIFT-CARD-CODE';

-- Check transaction (order_id will be the Stripe session ID)
SELECT * FROM gift_card_transactions 
WHERE gift_card_id = (SELECT id FROM gift_cards WHERE code = 'YOUR-GIFT-CARD-CODE')
ORDER BY created_at DESC;
```

---

## Test 5: Multiple Redemptions

### Steps:
1. Purchase a gift card with €100 balance
2. Make a webshop order for €30 (gift card balance: €70)
3. Make another webshop order for €40 (gift card balance: €30)
4. Make a tour booking for €25 (gift card balance: €5)
5. Try to use remaining €5 on another order

### Expected Results:
- ✅ Each redemption reduces balance correctly
- ✅ All transactions are recorded
- ✅ Gift card remains active until balance reaches €0
- ✅ Final redemption changes status to 'redeemed'

---

## Test 6: Invalid Code Scenarios

### Test Cases:

1. **Non-existent Code**
   - Enter: `XXXX-XXXX-XXXX-XXXX`
   - Expected: Error "Invalid gift card code"

2. **Wrong Format**
   - Enter: `1234567890123456` (no dashes)
   - Expected: Code should auto-format, but if invalid → Error

3. **Already Redeemed Card**
   - Use a gift card with €0 balance
   - Expected: Error "Gift card has no remaining balance"

4. **Cancelled Card**
   - Manually set a gift card status to 'cancelled' in database
   - Try to use it
   - Expected: Error "Gift card is cancelled"

5. **Expired Card** (if expiration is implemented)
   - Set `expires_at` to past date
   - Try to use it
   - Expected: Error "Gift card has expired"

---

## Test 7: Concurrent Redemption Prevention

### Steps:
1. Create a gift card with €100 balance
2. Open two browser tabs/windows
3. In both tabs, start checkout with the same gift card code
4. Complete payment in both tabs simultaneously

### Expected Results:
- ✅ Only one redemption succeeds
- ✅ Other redemption fails with "Gift card balance was changed" error
- ✅ Balance is correctly updated (only one transaction)
- ✅ Order still completes (gift card failure doesn't block order)

---

## Test 8: Gift Card Email Delivery

### Prerequisites:
- Set `N8N_GIFT_CARD_WEBHOOK` environment variable

### Steps:
1. Purchase a gift card
2. Check webhook logs in Supabase dashboard

### Expected Results:
- ✅ Webhook is called with gift card details:
  ```json
  {
    "giftCardCode": "XXXX-XXXX-XXXX-XXXX",
    "amount": 100,
    "currency": "EUR",
    "recipientEmail": "customer@example.com",
    "recipientName": "Customer Name",
    "purchaserEmail": "customer@example.com",
    "purchaserName": "Customer Name",
    "orderId": "...",
    "checkoutSessionId": "..."
  }
  ```
- ✅ Email is sent to recipient (if n8n webhook is configured)

---

## Test 9: Admin Verification

### Database Queries:

```sql
-- View all gift cards
SELECT 
  code,
  initial_amount,
  current_balance,
  status,
  purchaser_email,
  recipient_email,
  purchased_at,
  last_used_at
FROM gift_cards
ORDER BY created_at DESC;

-- View all transactions
SELECT 
  gct.*,
  gc.code as gift_card_code
FROM gift_card_transactions gct
JOIN gift_cards gc ON gct.gift_card_id = gc.id
ORDER BY gct.created_at DESC;

-- Check total liability (unredeemed gift cards)
SELECT 
  SUM(current_balance) as total_liability,
  COUNT(*) as active_cards
FROM gift_cards
WHERE status = 'active';

-- Find gift cards with transactions
SELECT 
  gc.code,
  gc.current_balance,
  COUNT(gct.id) as transaction_count,
  SUM(gct.amount_used) as total_redeemed
FROM gift_cards gc
LEFT JOIN gift_card_transactions gct ON gc.id = gct.gift_card_id
GROUP BY gc.id, gc.code, gc.current_balance
ORDER BY transaction_count DESC;
```

---

## Test 10: Stripe Test Cards

Use these Stripe test cards for testing:

### Successful Payment:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

### Declined Payment:
- Card: `4000 0000 0000 0002`
- Expected: Payment fails, gift card is NOT created

### 3D Secure (if enabled):
- Card: `4000 0027 6000 3184`
- Requires authentication

---

## Troubleshooting

### Gift Card Not Created After Purchase

**Check:**
1. Webhook is receiving `checkout.session.completed` events
2. Order metadata includes `order_type: 'giftcard'`
3. Check webhook logs in Supabase dashboard:
   ```bash
   npx supabase functions logs stripe-webhook
   ```
4. Look for `[Gift Card]` log entries

### Gift Card Not Redeeming

**Check:**
1. Code is correct (case-insensitive, auto-formats dashes)
2. Gift card status is 'active'
3. Balance > 0
4. Check webhook logs for redemption errors
5. Verify gift card code is in checkout session metadata

### Balance Check Not Working

**Check:**
1. API route `/api/gift-cards/balance` is accessible
2. Code format is correct
3. Database query is working
4. Check browser console for API errors

---

## Quick Test Checklist

- [ ] Purchase gift card (€50)
- [ ] Check balance page shows correct balance
- [ ] Redeem gift card on webshop order (€30)
- [ ] Verify balance reduced to €20
- [ ] Redeem remaining balance on tour booking (€20)
- [ ] Verify gift card status is 'redeemed'
- [ ] Test invalid code error handling
- [ ] Test expired/cancelled card error handling
- [ ] Verify all transactions are logged
- [ ] Check email webhook is called (if configured)

---

## Production Testing

Before going live:

1. **Test with Real Stripe Account**
   - Use test mode first
   - Then test with live mode (small amounts)

2. **Monitor Webhook Logs**
   - Check for any errors
   - Verify gift card creation rate
   - Monitor redemption patterns

3. **Database Monitoring**
   - Track total liability (unredeemed gift cards)
   - Monitor transaction volume
   - Check for any failed redemptions

4. **Email Delivery**
   - Verify emails are being sent
   - Check spam folders
   - Test email template rendering

---

## Support

If you encounter issues:

1. Check Supabase function logs:
   ```bash
   npx supabase functions logs stripe-webhook --tail
   ```

2. Check Stripe webhook logs in Stripe Dashboard:
   - Developers → Webhooks → Your endpoint → Logs

3. Verify database tables exist:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('gift_cards', 'gift_card_transactions');
   ```

4. Check environment variables are set:
   - `N8N_GIFT_CARD_WEBHOOK` (optional)
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
