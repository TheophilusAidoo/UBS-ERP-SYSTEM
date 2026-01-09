-- Add currency column to clients table
-- This stores the preferred currency for the client (from the invoice they were created with)

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_currency ON clients(currency);

-- Note: Existing clients will have NULL currency, which will default to system currency
