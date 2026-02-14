-- Create gift_cards table
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  initial_amount DECIMAL(10,2) NOT NULL,
  current_balance DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  purchaser_email VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_name VARCHAR(255),
  personal_message TEXT,
  stripe_payment_intent_id VARCHAR(255),
  stripe_checkout_session_id VARCHAR(255),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_email ON gift_cards(recipient_email);
CREATE INDEX IF NOT EXISTS idx_gift_cards_stripe_payment_intent_id ON gift_cards(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_stripe_checkout_session_id ON gift_cards(stripe_checkout_session_id);

-- Create gift_card_transactions table
-- Note: stripe_order_id type will be determined dynamically based on stripe_orders.id type
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  order_id VARCHAR(255),
  -- stripe_order_id: Will be set dynamically based on stripe_orders.id type
  -- Created without type first, then altered based on actual stripe_orders.id type
  amount_used DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('redemption', 'refund', 'adjustment')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add stripe_order_id column with correct type based on stripe_orders.id type
DO $$
DECLARE
  stripe_orders_id_type TEXT;
BEGIN
  -- Get the actual data type of stripe_orders.id
  SELECT data_type INTO stripe_orders_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'stripe_orders'
    AND column_name = 'id';

  -- Add stripe_order_id column with matching type
  IF stripe_orders_id_type = 'uuid' THEN
    ALTER TABLE gift_card_transactions
    ADD COLUMN IF NOT EXISTS stripe_order_id UUID;
    
    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'gift_card_transactions_stripe_order_id_fkey'
    ) THEN
      ALTER TABLE gift_card_transactions
      ADD CONSTRAINT gift_card_transactions_stripe_order_id_fkey
      FOREIGN KEY (stripe_order_id) REFERENCES stripe_orders(id) ON DELETE SET NULL;
    END IF;
  ELSIF stripe_orders_id_type = 'bigint' THEN
    ALTER TABLE gift_card_transactions
    ADD COLUMN IF NOT EXISTS stripe_order_id BIGINT;
    
    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'gift_card_transactions_stripe_order_id_fkey'
    ) THEN
      ALTER TABLE gift_card_transactions
      ADD CONSTRAINT gift_card_transactions_stripe_order_id_fkey
      FOREIGN KEY (stripe_order_id) REFERENCES stripe_orders(id) ON DELETE SET NULL;
    END IF;
  ELSE
    -- Unknown type - just add as UUID without foreign key
    ALTER TABLE gift_card_transactions
    ADD COLUMN IF NOT EXISTS stripe_order_id UUID;
    RAISE NOTICE 'stripe_orders.id type is % - added stripe_order_id as UUID without foreign key constraint', stripe_orders_id_type;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_order_id ON gift_card_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_stripe_order_id ON gift_card_transactions(stripe_order_id);

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gift_cards
-- Allow anyone to read gift cards by code (for validation/balance check)
CREATE POLICY "Anyone can read gift card by code"
  ON gift_cards FOR SELECT
  USING (true);

-- Allow service role to insert/update gift cards (for webhooks)
CREATE POLICY "Service role can manage gift cards"
  ON gift_cards FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for gift_card_transactions
-- Allow anyone to read transactions (for transparency)
CREATE POLICY "Anyone can read gift card transactions"
  ON gift_card_transactions FOR SELECT
  USING (true);

-- Allow service role to insert transactions (for webhooks)
CREATE POLICY "Service role can insert gift card transactions"
  ON gift_card_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gift_cards_updated_at
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_cards_updated_at();
