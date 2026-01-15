-- Add e-signature fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE;


