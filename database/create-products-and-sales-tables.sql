-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image TEXT, -- Base64 or URL
  price DECIMAL(12,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Sales Table
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sold_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  client_phone VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sold', 'cancelled')),
  sold_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_sold_by ON product_sales(sold_by);
CREATE INDEX IF NOT EXISTS idx_product_sales_company_id ON product_sales(company_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_status ON product_sales(status);
CREATE INDEX IF NOT EXISTS idx_product_sales_sold_at ON product_sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_product_sales_created_at ON product_sales(created_at);

-- Update updated_at trigger
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_product_sales_updated_at ON product_sales;

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_sales_updated_at 
  BEFORE UPDATE ON product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- Products Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view own company products" ON products;
DROP POLICY IF EXISTS "Staff can create products for own company" ON products;
DROP POLICY IF EXISTS "Staff can update own products" ON products;
DROP POLICY IF EXISTS "Staff can delete own products" ON products;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;

-- Staff can view products from their company
CREATE POLICY "Staff can view own company products" ON products
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Staff can insert products for their company
CREATE POLICY "Staff can create products for own company" ON products
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Staff can update their own products
CREATE POLICY "Staff can update own products" ON products
  FOR UPDATE
  USING (
    created_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Staff can delete their own products
CREATE POLICY "Staff can delete own products" ON products
  FOR DELETE
  USING (
    created_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all products" ON products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Product Sales Policies
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Staff can view own company sales" ON product_sales;
DROP POLICY IF EXISTS "Staff can create sales for own company" ON product_sales;
DROP POLICY IF EXISTS "Staff can update own sales" ON product_sales;
DROP POLICY IF EXISTS "Admins can view all sales" ON product_sales;
DROP POLICY IF EXISTS "Admins can manage all sales" ON product_sales;

-- Staff can view sales from their company
CREATE POLICY "Staff can view own company sales" ON product_sales
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Staff can create sales for their company
CREATE POLICY "Staff can create sales for own company" ON product_sales
  FOR INSERT
  WITH CHECK (
    (
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      ) AND sold_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Staff can update their own sales
CREATE POLICY "Staff can update own sales" ON product_sales
  FOR UPDATE
  USING (
    (
      sold_by = auth.uid() AND
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    (
      sold_by = auth.uid() AND
      company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can view all sales" ON product_sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sales" ON product_sales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );


