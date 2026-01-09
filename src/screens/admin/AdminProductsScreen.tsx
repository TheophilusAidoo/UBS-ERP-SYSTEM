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
  Grid,
  Stack,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Inventory,
  Refresh,
  AttachMoney,
  TrendingUp,
  CalendarToday,
  Person,
  BarChart,
  Business,
  Email,
  Phone,
  Home,
} from '@mui/icons-material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useCurrency } from '../../hooks/useCurrency';
import { salesService } from '../../services/sales.service';
import { productService } from '../../services/product.service';
import { companyService } from '../../services/company.service';
import { ProductSale, Company, SaleStatus } from '../../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AdminProductsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    todaySales: 0,
    todayRevenue: 0,
    monthlySales: 0,
    monthlyRevenue: 0,
    staffStats: [] as Array<{
      staffId: string;
      staffName: string;
      salesCount: number;
      revenue: number;
    }>,
  });

  const [sales, setSales] = useState<ProductSale[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('');
  const [ordersPage, setOrdersPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSales();
    fetchProducts();
  }, [companyFilter, statusFilter]);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAllCompanies();
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await salesService.getSalesStats({
        companyId: companyFilter || undefined,
      });
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      // Admin sees all orders from all staff, filtered by company and status
      const data = await salesService.getSales({
        companyId: companyFilter || undefined,
        status: statusFilter || undefined, // Get all orders, not just 'sold'
      });
      setSales(data);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (order: ProductSale, newStatus: SaleStatus) => {
    try {
      setLoading(true);
      setError(null);
      await salesService.updateSale({
        id: order.id,
        status: newStatus,
      });
      await fetchSales();
      await fetchStats(); // Refresh stats after status update
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productService.getProducts({
        companyId: companyFilter || undefined,
      });
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
    }
  };

  // Prepare chart data
  const staffChartData = stats.staffStats.slice(0, 10).map((staff) => ({
    name: staff.staffName.length > 15 ? staff.staffName.substring(0, 15) + '...' : staff.staffName,
    revenue: staff.revenue || 0,
    sales: staff.salesCount || 0,
  }));

  const monthlyData = React.useMemo(() => {
    const months: { [key: string]: { sales: number; revenue: number } } = {};
    sales.forEach((sale) => {
      if (sale.soldAt) {
        const date = new Date(sale.soldAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!months[monthKey]) {
          months[monthKey] = { sales: 0, revenue: 0 };
        }
        months[monthKey].sales += 1;
        months[monthKey].revenue += (sale.totalAmount || 0);
      }
    });
    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        revenue: data.revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);
  }, [sales]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Orders & Products in Demand
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track what customers want and order fulfillment across all companies
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Company</InputLabel>
            <Select
              value={companyFilter}
              label="Filter by Company"
              onChange={(e) => setCompanyFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">All Companies</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton onClick={fetchStats} title="Refresh Data">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Inventory color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Products
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {products.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUp color="success" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {stats.totalSales || 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AttachMoney color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Order Value
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {currencySymbol}{(stats.totalRevenue || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarToday color="info" />
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
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Order Fulfillment Performance (Top 10 Staff)
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : staffChartData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <TrendingUp sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No order data available yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Orders from clients will appear here
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={staffChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [
                        `${currencySymbol}${Number(value || 0).toFixed(2)}`,
                        'Order Value',
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Order Value" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Top Order Handlers
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : stats.staffStats.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No staff performance data yet
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {stats.staffStats.slice(0, 5).map((staff, index) => (
                    <Box key={staff.staffId}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS[index % COLORS.length] }}>
                          {staff.staffName[0]?.toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {staff.staffName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {staff.salesCount || 0} orders
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {currencySymbol}{(staff.revenue || 0).toFixed(2)}
                        </Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Revenue Chart */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Monthly Order Trends
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : monthlyData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <BarChart sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No monthly order data available
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Order trends will appear here as orders are processed
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === 'Order Value') {
                          return [`${currencySymbol}${Number(value || 0).toFixed(2)}`, 'Order Value'];
                        }
                        return [value, 'Orders Count'];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Order Value" />
                    <Bar dataKey="sales" fill="#8884d8" name="Orders Count" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* All Orders Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              All Orders from Staff
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Filter by Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value as SaleStatus | '');
                    setOrdersPage(1);
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
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

          {loading && sales.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : sales.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Inventory sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No orders found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Orders created by staff will appear here
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Client / Customer</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Staff Member</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Quantity</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Unit Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Order Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales
                      .slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage)
                      .map((sale) => (
                        <TableRow key={sale.id} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {sale.product?.image && (
                                <Avatar src={sale.product.image} variant="rounded" sx={{ width: 40, height: 40 }} />
                              )}
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {sale.product?.name || 'N/A'}
                                </Typography>
                                {sale.product?.referenceNumber && (
                                  <Typography variant="caption" color="text.secondary">
                                    Ref: {sale.product.referenceNumber}
                                  </Typography>
                                )}
                              </Box>
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
                          <TableCell>
                            {sale.soldByUser ? (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar sx={{ width: 24, height: 24 }}>
                                  {sale.soldByUser.firstName?.[0]?.toUpperCase() || sale.soldByUser.email[0].toUpperCase()}
                                </Avatar>
                                <Typography variant="body2">
                                  {sale.soldByUser.firstName} {sale.soldByUser.lastName}
                                </Typography>
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">N/A</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">{sale.quantity}</TableCell>
                          <TableCell align="right">
                            {sale.unitPrice !== undefined && sale.unitPrice !== null 
                              ? `${currencySymbol}${sale.unitPrice.toFixed(2)}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {sale.totalAmount !== undefined && sale.totalAmount !== null
                              ? `${currencySymbol}${sale.totalAmount.toFixed(2)}`
                              : 'N/A'}
                          </TableCell>
                          <TableCell align="center">
                            <Select
                              value={sale.status}
                              size="small"
                              onChange={(e) => handleUpdateOrderStatus(sale, e.target.value as SaleStatus)}
                              sx={{ minWidth: 130, borderRadius: 1 }}
                            >
                              <MenuItem value="pending">Pending</MenuItem>
                              <MenuItem value="in-progress">Processing</MenuItem>
                              <MenuItem value="sold">Fulfilled</MenuItem>
                              <MenuItem value="cancelled">Cancelled</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {sale.soldAt
                              ? new Date(sale.soldAt).toLocaleDateString()
                              : new Date(sale.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {sales.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                      disabled={ordersPage === 1}
                    >
                      Previous
                    </Button>
                    <Typography variant="body2" sx={{ px: 2 }}>
                      Page {ordersPage} of {Math.ceil(sales.length / itemsPerPage)}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setOrdersPage(Math.min(Math.ceil(sales.length / itemsPerPage), ordersPage + 1))}
                      disabled={ordersPage >= Math.ceil(sales.length / itemsPerPage)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Staff Performance Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Staff Order Fulfillment Performance
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : stats.staffStats.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No staff performance data available
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Performance metrics will appear as staff members process orders
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Staff Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Total Orders</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Total Order Value</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Average per Order</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.staffStats.map((staff, index) => (
                    <TableRow key={staff.staffId} hover>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index === 0 ? 'primary' : index === 1 ? 'secondary' : index === 2 ? 'success' : 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS[index % COLORS.length] }}>
                            {staff.staffName[0]?.toUpperCase()}
                          </Avatar>
                          <Typography sx={{ fontWeight: 500 }}>{staff.staffName}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{staff.salesCount || 0}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {currencySymbol}{(staff.revenue || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {currencySymbol}
                        {staff.salesCount > 0 ? ((staff.revenue || 0) / staff.salesCount).toFixed(2) : '0.00'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminProductsScreen;

