-- Add currency column to invoices table
-- Allows each invoice to have its own currency instead of using system currency

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add comment
COMMENT ON COLUMN invoices.currency IS 'Currency code (e.g., USD, AED, EUR) for this invoice';

-- Update existing invoices to use USD as default
UPDATE invoices SET currency = 'USD' WHERE currency IS NULL;
