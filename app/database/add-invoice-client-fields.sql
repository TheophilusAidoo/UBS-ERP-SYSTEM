-- Add client_number and client_country fields to invoices table

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS client_country VARCHAR(100);

