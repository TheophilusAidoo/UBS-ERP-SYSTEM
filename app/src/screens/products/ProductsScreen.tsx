import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Stack,
  Avatar,
  Tabs,
  Tab,
  Pagination,
} from '@mui/material';
import {
  Inventory,
  Add,
  Edit,
  Delete,
  Refresh,
  Sell,
  CheckCircle,
  Pending,
  AttachMoney,
  TrendingUp,
  CalendarToday,
  Person,
  Email,
  Home,
  Phone,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useCurrency } from '../../hooks/useCurrency';
import { useGlobalSettingsStore, Currency } from '../../store/global-settings.store';
import { productService, CreateProductData, UpdateProductData } from '../../services/product.service';
import { salesService, CreateSaleData, UpdateSaleData } from '../../services/sales.service';
import { invoiceService } from '../../services/invoice.service';
import { emailService } from '../../services/email.service';
import { companyService } from '../../services/company.service';
import { Product, ProductSale, ProductStatus, SaleStatus } from '../../types';

const ProductsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const { currency, getCurrencySymbol } = useGlobalSettingsStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);
  const itemsPerPage = 10;
  
  // Product Dialog
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    image: '',
    size: '',
    color: '',
    referenceNumber: '',
    carNumber: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Product Details Dialog
  const [productDetailsDialog, setProductDetailsDialog] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);

  // Sale Dialog
  const [saleDialog, setSaleDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleFormData, setSaleFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    clientPhone: '',
    quantity: '1',
    notes: '',
  });

  // Statistics
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    monthlySales: 0,
    monthlyRevenue: 0,
    thisMonthInvoices: 0,
  });

  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [saleStatusFilter, setSaleStatusFilter] = useState<SaleStatus | ''>('');

  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (tabValue === 1) {
      fetchSales();
    }
  }, [tabValue]);

  const fetchProducts = async () => {
    if (!user?.companyId && user?.role !== 'admin') return;
    try {
      setLoading(true);
      // Admin can see all products, staff see all products in their company (from any staff member)
      const isAdmin = user?.role === 'admin';
      const data = await productService.getProducts({
        companyId: isAdmin ? undefined : user?.companyId, // Admin sees all, staff sees their company
        createdBy: undefined, // Both admin and staff see all products in company (staff see all products created by anyone in their company)
      });
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const data = await salesService.getSales({
        companyId: user.companyId,
        soldBy: user.role === 'staff' ? user.id : undefined,
        status: saleStatusFilter || undefined,
      });
      setSales(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.companyId) return;
    try {
      const data = await salesService.getSalesStats({
        companyId: user.companyId,
        soldBy: user.role === 'staff' ? user.id : undefined,
      });
      
      // Fetch invoices for this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString();
      const monthEndStr = now.toISOString();
      
      const invoices = await invoiceService.getInvoices({
        companyId: user.companyId,
        createdBy: user.role === 'staff' ? user.id : undefined,
      });
      
      // Filter invoices created this month
      const thisMonthInvoices = invoices.filter((inv) => {
        const invoiceDate = new Date(inv.createdAt);
        return invoiceDate >= monthStart && invoiceDate <= now;
      }).length;
      
      setStats({
        todaySales: data.todaySales || 0,
        todayRevenue: data.todayRevenue || 0,
        monthlySales: data.monthlySales || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        thisMonthInvoices: thisMonthInvoices || 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        setTimeout(() => setError(null), 3000);
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setProductFormData({ ...productFormData, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        name: product.name,
        description: product.description || '',
        quantity: product.quantity.toString(),
        image: product.image || '',
        size: product.size || '',
        color: product.color || '',
        referenceNumber: product.referenceNumber || '',
        carNumber: product.carNumber || '',
      });
      setImagePreview(product.image || '');
      setImageFile(null);
    } else {
      setEditingProduct(null);
      setProductFormData({
        name: '',
        description: '',
        quantity: '',
        image: '',
        size: '',
        color: '',
        referenceNumber: '',
        carNumber: '',
      });
      setImagePreview('');
      setImageFile(null);
    }
    setProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setProductDialog(false);
    setEditingProduct(null);
    setProductFormData({
      name: '',
      description: '',
      quantity: '',
      image: '',
      size: '',
      color: '',
      referenceNumber: '',
      carNumber: '',
    });
    setImagePreview('');
    setImageFile(null);
  };

  const handleSubmitProduct = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      setError(null);

      if (!productFormData.name || !productFormData.quantity) {
        setError('Product name and quantity are required');
        setLoading(false);
        return;
      }

      if (editingProduct) {
        const updateData: UpdateProductData = {
          id: editingProduct.id,
          name: productFormData.name,
          description: productFormData.description || undefined,
          quantity: parseInt(productFormData.quantity),
          image: productFormData.image || undefined,
          size: productFormData.size || undefined,
          color: productFormData.color || undefined,
          referenceNumber: productFormData.referenceNumber || undefined,
          carNumber: productFormData.carNumber || undefined,
        };
        await productService.updateProduct(updateData);
        setSuccess('Order item updated successfully!');
      } else {
        const createData: CreateProductData = {
          companyId: user.companyId,
          name: productFormData.name,
          description: productFormData.description || undefined,
          quantity: parseInt(productFormData.quantity),
          image: productFormData.image || undefined,
          size: productFormData.size || undefined,
          color: productFormData.color || undefined,
          referenceNumber: productFormData.referenceNumber || undefined,
          carNumber: productFormData.carNumber || undefined,
        };
        await productService.createProduct(createData, user.id);
        setSuccess('Order item created successfully!');
      }

      handleCloseProductDialog();
      await fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save order item');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    try {
      setLoading(true);
      await productService.deleteProduct(product.id);
      setSuccess('Product deleted successfully!');
      await fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSaleDialog = (product: Product) => {
    setSelectedProduct(product);
    setSaleFormData({
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      clientPhone: '',
      quantity: '1',
      notes: '',
    });
    setSaleDialog(true);
  };

  const handleCloseSaleDialog = () => {
    setSaleDialog(false);
    setSelectedProduct(null);
    setSaleFormData({
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      clientPhone: '',
      quantity: '1',
      notes: '',
    });
  };

  const handleSubmitSale = async () => {
    if (!user?.companyId || !selectedProduct) return;
    try {
      setLoading(true);
      setError(null);

      if (!saleFormData.clientName || !saleFormData.clientEmail) {
        setError('Client name and email are required');
        setLoading(false);
        return;
      }

      const quantity = parseInt(saleFormData.quantity);
      if (quantity > selectedProduct.quantity) {
        setError(`Only ${selectedProduct.quantity} units available`);
        setLoading(false);
        return;
      }

      // Price is optional - set to 0 if not available (for order tracking without pricing)
      const unitPrice = selectedProduct.price || 0;
      const totalAmount = unitPrice * quantity;

      const createData: CreateSaleData = {
        productId: selectedProduct.id,
        clientName: saleFormData.clientName,
        clientEmail: saleFormData.clientEmail,
        clientAddress: saleFormData.clientAddress || undefined,
        clientPhone: saleFormData.clientPhone || undefined,
        quantity,
        unitPrice,
        totalAmount,
        notes: saleFormData.notes || undefined,
      };

      // Create the sale
      const sale = await salesService.createSale(createData, user.id, user.companyId);
      
      // Close dialog immediately and refresh only what's needed
      handleCloseSaleDialog();
      
      // Refresh sales and stats (don't wait for products as it's not critical)
      await Promise.all([
        fetchSales(),
        fetchStats(),
      ]);
      
      // Refresh products in background (non-blocking)
      fetchProducts().catch(err => console.error('Error refreshing products:', err));
      
      setSuccess('Order created successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // If client email is provided, create invoice and send it via email in the background
      // This doesn't block the UI - user can continue working while invoice is being created
      if (saleFormData.clientEmail) {
        // Process invoice creation and email sending asynchronously (don't block UI)
        (async () => {
          try {
            // Get company details for invoice
            const company = user.companyId ? await companyService.getCompany(user.companyId) : null;
            
            // Generate invoice number
            const invoiceNumber = `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
            
            // Create invoice from sale - use system currency for invoices created from sales
            const saleCurrency = currency;
            const saleCurrencySymbol = getCurrencySymbol(currency);
            
            const invoice = await invoiceService.createInvoice({
              companyId: user.companyId,
              createdBy: user.id,
              clientName: saleFormData.clientName,
              clientEmail: saleFormData.clientEmail,
              clientNumber: saleFormData.clientPhone || undefined,
              invoiceNumber,
              items: [{
                description: `${selectedProduct.name}${saleFormData.notes ? ` - ${saleFormData.notes}` : ''}`,
                quantity: quantity,
                unitPrice: unitPrice,
                total: totalAmount,
              }],
              subtotal: totalAmount,
              tax: 0,
              total: totalAmount,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
              currency: saleCurrency, // Add currency to invoice
            });

            // Send invoice email to client
            await emailService.sendInvoiceEmail({
              clientEmail: saleFormData.clientEmail,
              clientName: saleFormData.clientName,
              clientPhone: saleFormData.clientPhone,
              invoiceNumber: invoice.invoiceNumber,
              total: invoice.total,
              subtotal: invoice.subtotal,
              tax: invoice.tax || 0,
              dueDate: invoice.dueDate,
              items: invoice.items,
              companyLogo: company?.logo,
              companyName: company?.name,
              companyAddress: company?.address,
              companyPhone: company?.phone,
              companyEmail: company?.email,
              currencySymbol: saleCurrencySymbol,
              currencyCode: saleCurrency, // Pass currency code for PDF
              createdAt: invoice.createdAt,
              status: invoice.status,
            });

            // Update invoice status to 'sent'
            await invoiceService.updateInvoiceStatus({
              id: invoice.id,
              status: 'sent',
              updatedBy: user.id,
            });

            // Show success message about invoice being sent
            setSuccess(`Sale created! Invoice sent successfully to ${saleFormData.clientEmail}`);
            setTimeout(() => setSuccess(null), 5000);
          } catch (invoiceError: any) {
            console.error('Error creating/sending invoice:', invoiceError);
            // Don't fail the sale creation if invoice fails, but show a warning
            setError(`Sale created successfully, but failed to send invoice: ${invoiceError.message}`);
            setTimeout(() => setError(null), 5000);
          }
        })();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSaleStatus = async (sale: ProductSale, status: SaleStatus) => {
    try {
      setLoading(true);
      const previousStatus = sale.status;
      await salesService.updateSale({ id: sale.id, status });
      
      // Update UI immediately - don't wait for email
      setLoading(false);
      setSuccess('Sale status updated successfully!');
      
      // Refresh data in background
      Promise.all([
        fetchSales(),
        fetchStats(),
      ]).catch(err => console.error('Error refreshing data:', err));
      
      setTimeout(() => setSuccess(null), 3000);

      // Handle email notifications based on status change
      if (sale.clientEmail && sale.product && previousStatus !== status) {
        // Process emails in background (non-blocking)
        (async () => {
          try {
            // Get company details
            const company = user?.companyId ? await companyService.getCompany(user.companyId) : null;
            
            // If status changed to "sold", send paid invoice/receipt
            if (status === 'sold' && previousStatus !== 'sold') {
              // Generate invoice number for receipt
              const invoiceNumber = `INV-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
              
            // Get currency for receipt invoice
            const receiptCurrency = currency;
            const receiptCurrencySymbol = getCurrencySymbol(currency);
            
            // Create paid invoice/receipt
            const invoice = await invoiceService.createInvoice({
              companyId: user?.companyId || '',
              createdBy: user?.id || '',
              clientName: sale.clientName,
              clientEmail: sale.clientEmail,
              clientNumber: sale.clientPhone || undefined,
              invoiceNumber,
              items: [{
                description: `${sale.product.name}${sale.notes ? ` - ${sale.notes}` : ''}`,
                quantity: sale.quantity,
                unitPrice: sale.unitPrice,
                total: sale.totalAmount,
              }],
              subtotal: sale.totalAmount,
              tax: 0,
              total: sale.totalAmount,
              dueDate: new Date().toISOString().split('T')[0], // Due today (paid)
              currency: receiptCurrency, // Add currency to invoice
            });

            // Update invoice status to 'paid' immediately
            await invoiceService.updateInvoiceStatus({
              id: invoice.id,
              status: 'paid',
              updatedBy: user?.id,
            });

            // Send paid invoice/receipt email to client
            await emailService.sendInvoiceEmail({
              clientEmail: sale.clientEmail,
              clientName: sale.clientName,
              clientPhone: sale.clientPhone,
              invoiceNumber: invoice.invoiceNumber,
              total: invoice.total,
              subtotal: invoice.subtotal,
              tax: invoice.tax || 0,
              paidAmount: sale.totalAmount,
              balanceDue: 0,
              dueDate: invoice.dueDate,
              items: invoice.items,
              companyLogo: company?.logo,
              companyName: company?.name,
              companyAddress: company?.address,
              companyPhone: company?.phone,
              companyEmail: company?.email,
              currencySymbol: receiptCurrencySymbol,
              currencyCode: receiptCurrency, // Pass currency code for PDF
              createdAt: invoice.createdAt,
              status: 'Paid', // Mark as paid
            });

              // Update success message
              setSuccess(`Sale marked as sold and receipt sent to ${sale.clientEmail}!`);
              setTimeout(() => setSuccess(null), 5000);
            }
            
            // If status changed to "cancelled", send cancellation email
            else if (status === 'cancelled' && previousStatus !== 'cancelled') {
              await emailService.sendCancellationEmail({
                clientEmail: sale.clientEmail,
                clientName: sale.clientName,
                orderNumber: sale.id.substring(0, 8).toUpperCase(),
                productName: sale.product.name,
                quantity: sale.quantity,
                totalAmount: sale.totalAmount,
                companyName: company?.name,
                companyEmail: company?.email,
                companyPhone: company?.phone,
                currencySymbol,
              });

              // Update success message
              setSuccess(`Sale cancelled and notification sent to ${sale.clientEmail}!`);
              setTimeout(() => setSuccess(null), 5000);
            }
          } catch (emailError: any) {
            console.error('Error sending email:', emailError);
            // Don't fail the status update if email fails
            const emailType = status === 'sold' ? 'receipt' : 'cancellation notification';
            setError(`Sale status updated, but failed to send ${emailType}: ${emailError.message}`);
            setTimeout(() => setError(null), 5000);
          }
        })();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update sale status');
      setLoading(false);
    }
  };

  const handleUpdateProductStatus = async (product: Product, status: ProductStatus) => {
    try {
      setLoading(true);
      setError(null);
      await productService.updateProduct({ id: product.id, status });
      setSuccess('Product status updated successfully!');
      await fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update product status');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProductDetails = (product: Product) => {
    setSelectedProductForDetails(product);
    setProductDetailsDialog(true);
  };

  const handleCloseProductDetails = () => {
    setProductDetailsDialog(false);
    setSelectedProductForDetails(null);
  };

  const filteredProducts = products.filter((p) => !statusFilter || p.status === statusFilter);
  const filteredSales = sales.filter((s) => !saleStatusFilter || s.status === saleStatusFilter);

  // Pagination for products
  const paginatedProducts = filteredProducts.slice(
    (productsPage - 1) * itemsPerPage,
    productsPage * itemsPerPage
  );

  // Pagination for sales
  const paginatedSales = filteredSales.slice(
    (salesPage - 1) * itemsPerPage,
    salesPage * itemsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Orders
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenProductDialog()}
          sx={{ borderRadius: 2 }}
        >
          {t('products.addProduct', 'Add Product')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarToday color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Today Orders
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats.todaySales}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Today Order Value
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currencySymbol}{(stats.todayRevenue || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUp color="info" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Orders This Month
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats.monthlySales}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AttachMoney color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Order Value
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currencySymbol}{(stats.monthlyRevenue || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Inventory color="warning" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    This Month Invoices
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats.thisMonthInvoices}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(e, v) => {
        setTabValue(v);
        setProductsPage(1);
        setSalesPage(1);
      }} sx={{ mb: 2 }}>
        <Tab label="Products Catalog" />
        <Tab label="Orders / Products in Demand" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2, gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                label="Filter by Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value as ProductStatus | '');
                  setProductsPage(1);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="sold">Sold</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={fetchProducts} title="Refresh">
              <Refresh />
            </IconButton>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No products found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Click "Add Product" to create your first product
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenProductDialog()}
                  >
                    Add Product
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Color</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Reference</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      onClick={() => handleOpenProductDetails(product)}
                      sx={{
                        '&:hover': { 
                          backgroundColor: 'action.hover',
                          cursor: 'pointer',
                        },
                        '&:last-child td, &:last-child th': { border: 0 },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          {product.image ? (
                            <Avatar
                              src={product.image}
                              variant="rounded"
                              sx={{ width: 60, height: 60, objectFit: 'cover' }}
                            />
                          ) : (
                            <Avatar
                              variant="rounded"
                              sx={{
                                width: 60,
                                height: 60,
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                              }}
                            >
                              <Inventory />
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {product.id.substring(0, 8)}...
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {product.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.size || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {product.color || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {product.referenceNumber || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                          <Chip
                            label={product.quantity}
                            size="small"
                            color={product.quantity > 0 ? 'success' : 'error'}
                            variant={product.quantity === 0 ? 'outlined' : 'filled'}
                          />
                          <Select
                            value={product.status}
                            size="small"
                            onChange={(e) => handleUpdateProductStatus(product, e.target.value as ProductStatus)}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ 
                              minWidth: 120,
                              '& .MuiSelect-select': {
                                py: 0.5,
                              }
                            }}
                          >
                            <MenuItem value="available">Available</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="sold">Sold</MenuItem>
                          </Select>
                        </Box>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenProductDialog(product)}
                            title="Edit Product"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          {product.status === 'available' && product.quantity > 0 && (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleOpenSaleDialog(product)}
                              title="Take Order"
                            >
                              <Sell fontSize="small" />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(product)}
                            title="Delete Product"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {filteredProducts.length > itemsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
              <Pagination
                count={Math.ceil(filteredProducts.length / itemsPerPage)}
                page={productsPage}
                onChange={(_, value) => setProductsPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Products in Demand - Client Orders
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={saleStatusFilter}
                  label="Filter by Status"
                  onChange={(e) => {
                    setSaleStatusFilter(e.target.value as SaleStatus | '');
                    setSalesPage(1);
                  }}
                >
                  <MenuItem value="">All Orders</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">Processing</MenuItem>
                  <MenuItem value="sold">Fulfilled</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <IconButton onClick={fetchSales} title="Refresh Orders">
                <Refresh />
              </IconButton>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredSales.length === 0 ? (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No orders found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Orders from clients will appear here
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Client / Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {sale.product?.image && (
                            <Avatar src={sale.product.image} variant="rounded" sx={{ width: 40, height: 40 }} />
                          )}
                          <Typography>{sale.product?.name || 'N/A'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {sale.clientName}
                          </Typography>
                          {sale.clientAddress && (
                            <Typography variant="caption" color="text.secondary">
                              <Home sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                              {sale.clientAddress}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          {sale.clientEmail && (
                            <Typography variant="caption" color="text.secondary">
                              <Email sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                              {sale.clientEmail}
                            </Typography>
                          )}
                          {sale.clientPhone && (
                            <Typography variant="caption" color="text.secondary">
                              <Phone sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                              {sale.clientPhone}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell align="right">
                        {sale.unitPrice !== undefined && sale.unitPrice !== null 
                          ? `${currencySymbol}${sale.unitPrice.toFixed(2)}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        {sale.totalAmount !== undefined && sale.totalAmount !== null
                          ? `${currencySymbol}${sale.totalAmount.toFixed(2)}`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sale.status}
                          size="small"
                          color={
                            sale.status === 'sold'
                              ? 'success'
                              : sale.status === 'in-progress'
                              ? 'info'
                              : sale.status === 'pending'
                              ? 'warning'
                              : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {sale.soldAt
                          ? new Date(sale.soldAt).toLocaleDateString()
                          : new Date(sale.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={sale.status}
                          size="small"
                          onChange={(e) => handleUpdateSaleStatus(sale, e.target.value as SaleStatus)}
                          sx={{ minWidth: 140, borderRadius: 1 }}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="in-progress">Processing</MenuItem>
                          <MenuItem value="sold">Fulfilled</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {filteredSales.length > itemsPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
              <Pagination
                count={Math.ceil(filteredSales.length / itemsPerPage)}
                page={salesPage}
                onChange={(_, value) => setSalesPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Box>
      )}

      {/* Product Dialog */}
      <Dialog 
        open={productDialog} 
        onClose={handleCloseProductDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          pt: 3,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'primary.50',
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {editingProduct ? 'Update product information' : 'Create a new product for customers to order'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Image Upload Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                Product Image
              </Typography>
              {imagePreview ? (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'inline-block',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '2px solid',
                      borderColor: 'primary.light',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Avatar
                      src={imagePreview}
                      variant="rounded"
                      sx={{ 
                        width: 200, 
                        height: 200, 
                        objectFit: 'cover',
                        borderRadius: 1.5,
                      }}
                    />
                  </Box>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => {
                      setImagePreview('');
                      setImageFile(null);
                      setProductFormData({ ...productFormData, image: '' });
                    }}
                    sx={{ mt: 1 }}
                  >
                    Remove Image
                  </Button>
                </Box>
              ) : (
                <Box
                  sx={{
                    border: '2px dashed',
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    backgroundColor: 'grey.50',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Upload a product image
                  </Typography>
                </Box>
              )}
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="product-image-upload"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="product-image-upload">
                <Button 
                  variant={imagePreview ? "outlined" : "contained"} 
                  component="span" 
                  fullWidth
                  startIcon={<Inventory />}
                  sx={{ 
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  {imagePreview ? 'Change Image' : 'Upload Product Image'}
                </Button>
              </label>
            </Box>

            {/* Product Information Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                Product Information
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Product Name"
                  required
                  fullWidth
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  placeholder="Enter product name"
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
                
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={3}
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  placeholder="Describe the product details..."
                  sx={{ 
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    }
                  }}
                />
              </Stack>
            </Box>

            {/* Product Specifications Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                Product Specifications
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Size"
                    fullWidth
                    value={productFormData.size}
                    onChange={(e) => setProductFormData({ ...productFormData, size: e.target.value })}
                    placeholder="e.g., Small, Medium, Large, 42"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Color"
                    fullWidth
                    value={productFormData.color}
                    onChange={(e) => setProductFormData({ ...productFormData, color: e.target.value })}
                    placeholder="e.g., Red, Blue, Black"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Reference Number"
                    fullWidth
                    value={productFormData.referenceNumber}
                    onChange={(e) => setProductFormData({ ...productFormData, referenceNumber: e.target.value })}
                    placeholder="Product reference/SKU"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Car/Vehicle Number"
                    fullWidth
                    value={productFormData.carNumber}
                    onChange={(e) => setProductFormData({ ...productFormData, carNumber: e.target.value })}
                    placeholder="Vehicle identification number"
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Quantity Section */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                Inventory
              </Typography>
              <TextField
                label="Available Quantity"
                required
                fullWidth
                type="number"
                value={productFormData.quantity}
                onChange={(e) => setProductFormData({ ...productFormData, quantity: e.target.value })}
                placeholder="How many units are available?"
                helperText="Enter the number of units available for order"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2, 
          gap: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: 'grey.50',
        }}>
          <Button 
            onClick={handleCloseProductDialog}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitProduct} 
            variant="contained" 
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {loading ? <CircularProgress size={20} /> : editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog 
        open={productDetailsDialog} 
        onClose={handleCloseProductDetails} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          } 
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 700, 
          pb: 2,
          pt: 3,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#f8fafc',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedProductForDetails?.image ? (
              <Avatar
                src={selectedProductForDetails.image}
                variant="rounded"
                sx={{ width: 64, height: 64, objectFit: 'cover' }}
              />
            ) : (
              <Avatar
                variant="rounded"
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  color: 'white',
                }}
              >
                <Inventory sx={{ fontSize: 32 }} />
              </Avatar>
            )}
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {selectedProductForDetails?.name}
              </Typography>
              <Chip
                label={selectedProductForDetails?.status || 'N/A'}
                size="small"
                color={
                  selectedProductForDetails?.status === 'available'
                    ? 'success'
                    : selectedProductForDetails?.status === 'pending'
                    ? 'warning'
                    : 'default'
                }
                sx={{ textTransform: 'capitalize' }}
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedProductForDetails && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {selectedProductForDetails.image && (
                  <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Box
                      component="img"
                      src={selectedProductForDetails.image}
                      alt={selectedProductForDetails.name}
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 400,
                        borderRadius: 2,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Product ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedProductForDetails.id}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Status
                  </Typography>
                  <Chip
                    label={selectedProductForDetails.status}
                    size="small"
                    color={
                      selectedProductForDetails.status === 'available'
                        ? 'success'
                        : selectedProductForDetails.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Price
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    {selectedProductForDetails.price !== undefined && selectedProductForDetails.price !== null
                      ? `${currencySymbol}${selectedProductForDetails.price.toFixed(2)}`
                      : 'Not set'}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Quantity Available
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: selectedProductForDetails.quantity > 0 ? 'success.main' : 'error.main' }}>
                    {selectedProductForDetails.quantity} units
                  </Typography>
                </Card>
              </Grid>

              {selectedProductForDetails.description && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 600 }}>
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {selectedProductForDetails.description}
                    </Typography>
                  </Card>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Created At
                  </Typography>
                  <Typography variant="body2">
                    {new Date(selectedProductForDetails.createdAt).toLocaleString()}
                  </Typography>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {selectedProductForDetails.updatedAt 
                      ? new Date(selectedProductForDetails.updatedAt).toLocaleString()
                      : 'N/A'}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2, 
          gap: 1.5,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          backgroundColor: '#f8fafc',
        }}>
          <Button 
            onClick={handleCloseProductDetails} 
            sx={{ 
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1,
              fontWeight: 600,
            }}
          >
            Close
          </Button>
          {selectedProductForDetails && (
            <>
              <Button
                onClick={() => {
                  handleCloseProductDetails();
                  handleOpenProductDialog(selectedProductForDetails);
                }}
                variant="outlined"
                startIcon={<Edit />}
                sx={{ 
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                }}
              >
                Edit Product
              </Button>
              {selectedProductForDetails.status === 'available' && selectedProductForDetails.quantity > 0 && (
                <Button
                  onClick={() => {
                    handleCloseProductDetails();
                    handleOpenSaleDialog(selectedProductForDetails);
                  }}
                  variant="contained"
                  startIcon={<Sell />}
                  sx={{ 
                    textTransform: 'none',
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  Take Order
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog open={saleDialog} onClose={handleCloseSaleDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Take Order: {selectedProduct?.name}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Available Quantity: {selectedProduct?.quantity}
              {selectedProduct?.price && ` | Unit Price: ${currencySymbol}${selectedProduct.price.toFixed(2)}`}
            </Alert>
            <TextField
              label="Client Name"
              required
              fullWidth
              value={saleFormData.clientName}
              onChange={(e) => setSaleFormData({ ...saleFormData, clientName: e.target.value })}
            />
            <TextField
              label="Client Email"
              required
              fullWidth
              type="email"
              value={saleFormData.clientEmail}
              onChange={(e) => setSaleFormData({ ...saleFormData, clientEmail: e.target.value })}
            />
            <TextField
              label="Client Address"
              fullWidth
              multiline
              rows={2}
              value={saleFormData.clientAddress}
              onChange={(e) => setSaleFormData({ ...saleFormData, clientAddress: e.target.value })}
            />
            <TextField
              label="Client Phone"
              fullWidth
              value={saleFormData.clientPhone}
              onChange={(e) => setSaleFormData({ ...saleFormData, clientPhone: e.target.value })}
            />
            <TextField
              label="Quantity"
              required
              fullWidth
              type="number"
              value={saleFormData.quantity}
              onChange={(e) => setSaleFormData({ ...saleFormData, quantity: e.target.value })}
              inputProps={{ min: 1, max: selectedProduct?.quantity }}
              helperText={selectedProduct?.price ? `Total: ${currencySymbol}${((selectedProduct.price || 0) * parseInt(saleFormData.quantity || '0')).toFixed(2)}` : 'Enter quantity to order'}
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={saleFormData.notes}
              onChange={(e) => setSaleFormData({ ...saleFormData, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaleDialog}>Cancel</Button>
          <Button onClick={handleSubmitSale} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsScreen;

