-- Deliveries Table
-- Stores both Air and Sea delivery bookings

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('air', 'sea')),
  date DATE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_number VARCHAR(50),
  items JSONB NOT NULL, -- Array of { name: string, picture?: string }
  size_kg_volume VARCHAR(100),
  departure VARCHAR(100) NOT NULL CHECK (departure IN ('Dubai', 'China')),
  destination VARCHAR(255) NOT NULL,
  receiver_details TEXT,
  estimate_arrival_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_by ON deliveries(created_by);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_type ON deliveries(delivery_type);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date);

-- RLS Policies
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view deliveries from their company
CREATE POLICY "Staff can view deliveries from their company"
  ON deliveries FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Staff can create deliveries for their company
CREATE POLICY "Staff can create deliveries for their company"
  ON deliveries FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Policy: Staff can update their own deliveries
CREATE POLICY "Staff can update their own deliveries"
  ON deliveries FOR UPDATE
  USING (
    created_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Admins can view all deliveries
CREATE POLICY "Admins can view all deliveries"
  ON deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can create deliveries
CREATE POLICY "Admins can create deliveries"
  ON deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all deliveries
CREATE POLICY "Admins can update all deliveries"
  ON deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete deliveries
CREATE POLICY "Admins can delete deliveries"
  ON deliveries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_deliveries_updated_at();

