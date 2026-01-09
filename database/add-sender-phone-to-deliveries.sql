-- Add sender_phone column to deliveries table
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(50);

-- Note: client_name and client_number will remain for backward compatibility
-- but the UI will now use "Sender Name" and "Sender Phone" terminology

