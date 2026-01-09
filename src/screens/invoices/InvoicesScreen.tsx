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
  Divider,
  TableFooter,
  Stack,
  Avatar,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Collapse,
  InputAdornment,
} from '@mui/material';
import {
  Receipt,
  Add,
  Edit,
  Delete,
  Refresh,
  Send,
  CheckCircle,
  Cancel,
  Visibility,
  VisibilityOff,
  Email,
  Business,
  AttachMoney,
  CalendarToday,
  Person,
  Download,
  PictureAsPdf,
  Search,
  ChevronLeft,
  ChevronRight,
  CurrencyExchange,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useCurrency } from '../../hooks/useCurrency';
import { useGlobalSettingsStore, Currency } from '../../store/global-settings.store';
import { invoiceService, CreateInvoiceData, UpdateInvoiceData } from '../../services/invoice.service';
import { emailService } from '../../services/email.service';
import { companyService } from '../../services/company.service';
import { clientService } from '../../services/client.service';
import { exportService } from '../../utils/export.service';
import { invoicePDFService } from '../../services/invoice-pdf.service';
import { currencyConversionService } from '../../services/currency-conversion.service';
import { financialService } from '../../services/financial.service';
import { Invoice, InvoiceItem, InvoiceStatus, Company } from '../../types';
import ESignature from '../../components/invoices/ESignature';

const InvoicesScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currencySymbol } = useCurrency();
  const { currency, getCurrencySymbol } = useGlobalSettingsStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [resendDialog, setResendDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [signatureDialog, setSignatureDialog] = useState<{ open: boolean; invoice: Invoice | null }>({
    open: false,
    invoice: null,
  });
  const [recentlySentInvoice, setRecentlySentInvoice] = useState<string | null>(null);
  const [showClientPassword, setShowClientPassword] = useState(false);

  const [formData, setFormData] = useState({
    companyId: '',
    clientName: '',
    clientEmail: '',
    clientNumber: '',
    clientCountry: '',
    invoiceNumber: '',
    dueDate: '',
    tax: '0',
    currency: 'USD', // Default currency
    items: [] as Array<Omit<InvoiceItem, 'id'>>,
    signature: '',
    createClientAccount: false, // Option to create client account
    clientPassword: '', // Password for client account if creating
  });

  const [itemForm, setItemForm] = useState({
    description: '',
    quantity: '1',
    unitPrice: '0',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchInvoices();
    fetchCompanies(); // Both admin and staff need companies for logo
  }, [statusFilter, companyFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (statusFilter) filters.status = statusFilter;
      if (companyFilter) filters.companyId = companyFilter;
      if (!isAdmin && user) filters.createdBy = user.id;

      const data = await invoiceService.getInvoices(filters);
      setInvoices(data);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      setError(err.message || t('invoices.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      if (isAdmin) {
        const data = await companyService.getAllCompanies();
        setCompanies(data);
      } else if (user?.companyId) {
        // Staff can only see their own company
        const data = await companyService.getCompany(user.companyId);
        if (data) {
          setCompanies([data]);
        }
      }
    } catch (err: any) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleOpenDialog = async (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        companyId: invoice.companyId,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientNumber: invoice.clientNumber || '',
        clientCountry: invoice.clientCountry || '',
        invoiceNumber: invoice.invoiceNumber,
        dueDate: invoice.dueDate || '',
        tax: invoice.tax?.toString() || '0',
        currency: invoice.currency || currency,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        signature: invoice.signature || '',
        createClientAccount: false,
        clientPassword: '',
      });
    } else {
      setEditingInvoice(null);
      const invoiceNumber = await invoiceService.generateInvoiceNumber();
      setFormData({
        companyId: user?.companyId || '',
        clientName: '',
        clientEmail: '',
        clientNumber: '',
        clientCountry: '',
        invoiceNumber,
        dueDate: '',
        tax: '0',
        currency: currency,
        items: [],
        signature: '',
        createClientAccount: false,
        clientPassword: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingInvoice(null);
    setFormData({
      companyId: user?.companyId || '',
      clientName: '',
      clientEmail: '',
      clientNumber: '',
      clientCountry: '',
      invoiceNumber: '',
      dueDate: '',
      tax: '0',
      currency: currency,
      items: [],
      signature: '',
      createClientAccount: false,
      clientPassword: '',
    });
    setItemForm({ description: '', quantity: '1', unitPrice: '0' });
  };

  const addItem = () => {
    if (!itemForm.description || !itemForm.quantity || !itemForm.unitPrice) {
      setError('Please fill in all item fields');
      return;
    }

    const quantity = parseFloat(itemForm.quantity);
    const unitPrice = parseFloat(itemForm.unitPrice);
    const total = quantity * unitPrice;

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: itemForm.description,
          quantity,
          unitPrice,
          total,
        },
      ],
    });

    setItemForm({ description: '', quantity: '1', unitPrice: '0' });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const tax = parseFloat(formData.tax) || 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };
  
  // Get the currency symbol for the form based on selected currency
  const getFormCurrencySymbol = () => {
    return getCurrencySymbol((formData.currency || currency) as Currency);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('User not found');
        return;
      }

      const { subtotal, tax, total } = calculateTotals();

      // Validate client password if creating account and password is provided
      if (formData.createClientAccount && formData.clientPassword && formData.clientPassword.trim().length > 0) {
        const password = formData.clientPassword.trim();
        // Only check Supabase's minimum requirement (6 characters)
        if (password.length < 6) {
          setError('Client password must be at least 6 characters long');
          setLoading(false);
          return;
        }
        // Let Supabase handle password strength validation - no additional rules
      }

      if (editingInvoice) {
        const updateData: UpdateInvoiceData = {
          id: editingInvoice.id,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientNumber: formData.clientNumber || undefined,
          clientCountry: formData.clientCountry || undefined,
          items: formData.items,
          subtotal,
          tax,
          total,
          dueDate: formData.dueDate || undefined,
          currency: formData.currency as Currency,
        };
        await invoiceService.updateInvoice(updateData);
        setSuccess(t('invoices.invoiceUpdated'));
      } else {
        const createData: CreateInvoiceData = {
          companyId: formData.companyId,
          createdBy: user.id,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientNumber: formData.clientNumber || undefined,
          clientCountry: formData.clientCountry || undefined,
          invoiceNumber: formData.invoiceNumber,
          items: formData.items,
          subtotal,
          tax,
          total,
          dueDate: formData.dueDate || undefined,
          currency: formData.currency as Currency,
        };
        const createdInvoice = await invoiceService.createInvoice(createData);
        
        // Stop loading immediately and close dialog - don't wait for email
        setLoading(false);
        handleCloseDialog();
        
        // Refresh invoice list immediately (critical data) - don't wait
        fetchInvoices().catch(err => console.error('Error refreshing invoices:', err));
        
        // Show success immediately
        setSuccess(t('invoices.invoiceCreated'));
        setTimeout(() => setSuccess(null), 3000);
        
        // Process signature update and email sending in background (non-blocking)
        // This doesn't block the UI - user can continue working
        (async () => {
          try {
            // If signature was provided, update invoice with signature
            let finalInvoice = createdInvoice;
            if (formData.signature) {
              // If admin signs, show "Supervisor" instead of their name
              const signedBy = user?.role === 'admin' 
                ? 'Supervisor' 
                : (user ? `${user.firstName} ${user.lastName}` : user?.id || '');
              
              finalInvoice = await invoiceService.updateInvoice({
                id: createdInvoice.id,
                signature: formData.signature,
                signedBy: signedBy,
                signedAt: new Date().toISOString(),
              });
            }
            
            // Create client account if requested
            if (formData.createClientAccount && formData.clientEmail && formData.clientName) {
              try {
                // Check if client already exists
                const existingClients = await clientService.getAllClients({ 
                  companyId: formData.companyId 
                });
                const existingClient = existingClients.find(c => c.email === formData.clientEmail);
                
                if (!existingClient) {
                  // Use provided password or generate one if not provided
                  let clientPassword = formData.clientPassword?.trim();
                  if (!clientPassword || clientPassword.length === 0) {
                    // Generate a very strong random password (16+ characters: mix of uppercase, lowercase, numbers, special)
                    // This meets Supabase's strict password requirements
                    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded I and O to avoid confusion
                    const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Excluded l and o to avoid confusion
                    const numbers = '23456789'; // Excluded 0 and 1 to avoid confusion
                    const special = '!@#$%&*?+-='; // Common special characters
                    
                    const getRandomChar = (str: string) => str[Math.floor(Math.random() * str.length)];
                    
                    // Build a strong password: at least 2 of each type for 16+ characters
                    let password = 
                      getRandomChar(uppercase) + 
                      getRandomChar(uppercase) + 
                      getRandomChar(lowercase) + 
                      getRandomChar(lowercase) + 
                      getRandomChar(numbers) + 
                      getRandomChar(numbers) + 
                      getRandomChar(special) + 
                      getRandomChar(special);
                    
                    // Add more random characters to reach 16 characters total
                    const allChars = uppercase + lowercase + numbers + special;
                    for (let i = password.length; i < 16; i++) {
                      password += getRandomChar(allChars);
                    }
                    
                    // Shuffle the password thoroughly to randomize character positions
                    password = password.split('').sort(() => Math.random() - 0.5).join('');
                    // Shuffle again for extra randomness
                    password = password.split('').sort(() => Math.random() - 0.5).join('');
                    
                    clientPassword = password;
                  }
                  
                  // Create new client account
                  // Only pass password if it was provided or generated (never empty string)
                  try {
                    await clientService.createClient({
                      companyId: formData.companyId,
                      name: formData.clientName,
                      email: formData.clientEmail,
                      phone: formData.clientNumber && formData.clientNumber.trim() ? formData.clientNumber : undefined,
                      address: formData.clientCountry && formData.clientCountry.trim() ? formData.clientCountry : undefined,
                      password: clientPassword && clientPassword.trim() ? clientPassword : undefined,
                      currency: formData.currency, // Save the invoice currency as client's preferred currency
                    });
                    console.log('✅ Client account created for:', formData.clientEmail);
                    
                    // Show password to admin/staff if it was auto-generated
                    const passwordMessage = !formData.clientPassword || formData.clientPassword.trim().length === 0
                      ? `\n\n🔑 AUTO-GENERATED PASSWORD: ${clientPassword}\n⚠️ Please save this password - it has been sent to the client via email.`
                      : '';
                    
                    setSuccess(`Client account created successfully! Login credentials have been sent to ${formData.clientEmail}.${passwordMessage}`);
                  } catch (clientError: any) {
                    console.error('❌ Error creating client account:', clientError);
                    // If password was auto-generated and email failed, show it in error
                    const passwordInfo = !formData.clientPassword || formData.clientPassword.trim().length === 0
                      ? `\n\n🔑 Generated password: ${clientPassword}\n⚠️ Please send this password to the client manually.`
                      : '';
                    setError(`Failed to create client account: ${clientError.message}${passwordInfo}`);
                  }
                } else {
                  console.log('Client already exists:', formData.clientEmail);
                  setSuccess(`Invoice created! Note: Client ${formData.clientEmail} already exists with an account.`);
                }
              } catch (clientError: any) {
                console.error('❌ Error creating client account:', clientError);
                // Show error but don't fail invoice creation
                setError(`Invoice created successfully, but client account creation failed: ${clientError.message}`);
              }
            }
            
            // Automatically send invoice email to client in background
            const selectedCompany = companies.find(c => c.id === formData.companyId);
            
            // Use signature from formData if available (more reliable than finalInvoice.signature)
            const signatureToUse = formData.signature || finalInvoice.signature;
            // If admin signs, show "Supervisor" instead of their name
            const signedByToUse = formData.signature 
              ? (user?.role === 'admin' ? 'Supervisor' : (user ? `${user.firstName} ${user.lastName}` : user?.id || ''))
              : finalInvoice.signedBy;
            
            // Use invoice currency symbol instead of system currency
            const invoiceCurrency = finalInvoice.currency || formData.currency || currency;
            const invoiceCurrencySymbol = getCurrencySymbol(invoiceCurrency as Currency);
            
            await emailService.sendInvoiceEmail({
              clientEmail: formData.clientEmail,
              clientName: formData.clientName,
              clientNumber: formData.clientNumber,
              clientCountry: formData.clientCountry,
              invoiceNumber: finalInvoice.invoiceNumber,
              total: finalInvoice.total,
              subtotal: finalInvoice.subtotal,
              tax: finalInvoice.tax,
              dueDate: finalInvoice.dueDate,
              items: finalInvoice.items,
              companyLogo: selectedCompany?.logo,
              companyName: selectedCompany?.name,
              companyAddress: selectedCompany?.address,
              companyPhone: selectedCompany?.phone,
              companyEmail: selectedCompany?.email,
              signature: signatureToUse,
              signedBy: signedByToUse,
              currencySymbol: invoiceCurrencySymbol,
              currencyCode: invoiceCurrency, // Pass currency code for PDF
              createdAt: finalInvoice.createdAt,
              status: finalInvoice.status,
            });
            
            // Update invoice status to 'sent'
            await invoiceService.updateInvoiceStatus({
              id: createdInvoice.id,
              status: 'sent',
            });
            
            // Refresh invoice list again to show updated status
            await fetchInvoices();
            
            // Store the invoice ID for download
            setRecentlySentInvoice(finalInvoice.id);
            
            // Update success message
            setSuccess(`Invoice created and sent successfully to ${formData.clientEmail}!`);
            setTimeout(() => {
              setSuccess(null);
              setRecentlySentInvoice(null);
            }, 10000);
          } catch (emailError: any) {
            console.error('Error sending invoice email:', emailError);
            // Don't fail the invoice creation if email fails
            setError(`Invoice created successfully, but failed to send email: ${emailError.message}`);
            setTimeout(() => setError(null), 5000);
          }
        })();
        
        return; // Exit early - we've already set loading to false and closed dialog
      }
      
      // For update case, close dialog and refresh
      handleCloseDialog();
      await fetchInvoices();
      setLoading(false);
    } catch (err: any) {
      setError(err.message || t('invoices.failedToCreate'));
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get invoice details before updating
      const invoice = await invoiceService.getInvoice(invoiceId);
      
      // Check if invoice was already paid (to avoid duplicate transactions)
      const wasAlreadyPaid = invoice.status === 'paid';
      
      // Update invoice status
      await invoiceService.updateInvoiceStatus({
        id: invoiceId,
        status,
        updatedBy: user?.id,
      });
      
      // If invoice is being marked as paid for the first time, add financial transaction
      if (status === 'paid' && !wasAlreadyPaid && invoice.total > 0) {
        // If currency differs from system currency, convert and add transaction
        if (invoice.currency && invoice.currency !== currency) {
          try {
            // Get exchange rates relative to system currency (base currency)
            // Rates returned will be: 1 systemCurrency = X otherCurrency
            const exchangeRates = await currencyConversionService.getExchangeRates(currency);
            
            // Convert invoice amount from invoice currency to system currency
            // The convertAmount function expects rates relative to the target currency (system currency)
            const convertedAmount = currencyConversionService.convertAmount(
              invoice.total,
              invoice.currency,
              currency,
              exchangeRates
            );
            
            // Create financial transaction with converted amount
            await financialService.createTransaction({
              companyId: invoice.companyId,
              userId: invoice.createdBy,
              type: 'income',
              amount: convertedAmount,
              description: `Invoice ${invoice.invoiceNumber} payment (converted from ${invoice.currency} ${invoice.total.toFixed(2)} to ${currency} ${convertedAmount.toFixed(2)})`,
              category: 'Invoice Payment',
              date: new Date().toISOString().split('T')[0],
            });
            
            const invoiceCurrencySymbol = getCurrencySymbol(invoice.currency as Currency);
            const systemCurrencySymbol = getCurrencySymbol(currency as Currency);
            
            setSuccess(
              `Invoice marked as paid! ` +
              `Amount converted: ${invoiceCurrencySymbol}${invoice.total.toFixed(2)} → ${systemCurrencySymbol}${convertedAmount.toFixed(2)} ` +
              `(Rate: 1 ${invoice.currency} = ${(convertedAmount / invoice.total).toFixed(4)} ${currency})`
            );
          } catch (conversionError: any) {
            console.error('Error converting currency or creating transaction:', conversionError);
            // Still mark as paid, but show warning about conversion
            setError(
              `Invoice marked as paid, but failed to convert currency and add to finances: ${conversionError.message}. ` +
              `Please manually add transaction for ${invoice.currency} ${invoice.total.toFixed(2)}.`
            );
            setTimeout(() => setError(null), 8000);
          }
        } else {
          // Same currency or no currency specified - add transaction without conversion
          try {
            await financialService.createTransaction({
              companyId: invoice.companyId,
              userId: invoice.createdBy,
              type: 'income',
              amount: invoice.total,
              description: `Invoice ${invoice.invoiceNumber} payment`,
              category: 'Invoice Payment',
              date: new Date().toISOString().split('T')[0],
            });
            
            setSuccess(`Invoice marked as paid and added to finances!`);
          } catch (transactionError: any) {
            console.error('Error creating transaction:', transactionError);
            setSuccess(`Invoice marked as paid, but failed to add to finances: ${transactionError.message}`);
            setTimeout(() => setSuccess(null), 5000);
          }
        }
      } else {
        setSuccess(`Invoice ${status} successfully!`);
      }
      
      setTimeout(() => setSuccess(null), 5000);
      await fetchInvoices();
    } catch (err: any) {
      setError(err.message || `Failed to ${status} invoice`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (invoice: Invoice, signature?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get company details if company is selected
      const selectedCompany = companies.find(c => c.id === invoice.companyId);
      
      // Get invoice currency
      const invoiceCurrency = invoice.currency || currency;
      const invoiceCurrencySymbol = getCurrencySymbol(invoiceCurrency as Currency);
      
      // Calculate balance due
      const paidAmount = 0; // You can add paidAmount to invoice type if needed
      const balanceDue = invoice.total - paidAmount;
      const status = invoice.status === 'paid' ? 'Paid' : invoice.status === 'sent' ? 'Due' : 'Due';
      
      const result = await emailService.sendInvoiceEmail({
        clientEmail: invoice.clientEmail,
        clientName: invoice.clientName,
        clientNumber: invoice.clientNumber,
        clientCountry: invoice.clientCountry,
        clientAddress: undefined, // Add clientAddress to invoice type if needed
        clientPhone: undefined, // Add clientPhone to invoice type if needed
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        paidAmount,
        balanceDue,
        dueDate: invoice.dueDate,
        items: invoice.items,
        companyLogo: selectedCompany?.logo,
        companyName: selectedCompany?.name,
        companyAddress: selectedCompany?.address,
        companyPhone: selectedCompany?.phone,
        companyEmail: selectedCompany?.email,
        companyWebsite: undefined, // Add website to company type if needed
        companyTaxId: undefined, // Add taxId to company type if needed
        signature: signature || invoice.signature,
        signedBy: signature 
          ? (user?.role === 'admin' ? 'Supervisor' : (user ? `${user.firstName} ${user.lastName}` : undefined))
          : invoice.signedBy,
        currencySymbol: invoiceCurrencySymbol,
        currencyCode: invoiceCurrency, // Pass currency code for PDF
        createdAt: invoice.createdAt,
        status,
      });

      if (result.success) {
        // Update invoice with signature if provided
        if (signature) {
          // If admin signs, show "Supervisor" instead of their name
          const signedBy = user?.role === 'admin' 
            ? 'Supervisor' 
            : (user ? `${user.firstName} ${user.lastName}` : user?.id || '');
          
          await invoiceService.updateInvoice({
            id: invoice.id,
            signature,
            signedBy: signedBy,
            signedAt: new Date().toISOString(),
          });
        }
        
        // Update invoice status to 'sent' if not already sent
        if (invoice.status !== 'sent' && invoice.status !== 'paid') {
          await invoiceService.updateInvoiceStatus({
            id: invoice.id,
            status: 'sent',
            updatedBy: user?.id,
          });
        }
        setSuccess(result.message);
        setTimeout(() => setSuccess(null), 3000);
        await fetchInvoices();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || t('invoices.failedToSend'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvoice = (invoice: Invoice) => {
    // Open confirmation dialog
    setResendDialog({ open: true, invoice });
  };

  const handleConfirmResend = async () => {
    if (!resendDialog.invoice) return;

    const invoice = resendDialog.invoice;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Get company details
      const selectedCompany = companies.find(c => c.id === invoice.companyId);
      
      // Get invoice currency
      const invoiceCurrency = invoice.currency || currency;
      const invoiceCurrencySymbol = getCurrencySymbol(invoiceCurrency as Currency);
      
      // Calculate balance due
      const paidAmount = 0;
      const balanceDue = invoice.total - paidAmount;
      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
      
      // Send reminder email with PDF
      const result = await emailService.sendInvoiceEmail({
        clientEmail: invoice.clientEmail,
        clientName: invoice.clientName,
        clientNumber: invoice.clientNumber,
        clientCountry: invoice.clientCountry,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        paidAmount,
        balanceDue,
        dueDate: invoice.dueDate,
        items: invoice.items,
        companyLogo: selectedCompany?.logo,
        companyName: selectedCompany?.name,
        companyAddress: selectedCompany?.address,
        companyPhone: selectedCompany?.phone,
        companyEmail: selectedCompany?.email,
        signature: invoice.signature,
        signedBy: invoice.signedBy,
        currencySymbol: invoiceCurrencySymbol,
        currencyCode: invoiceCurrency, // Pass currency code for PDF
        createdAt: invoice.createdAt,
        status: invoice.status === 'paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Due',
        isReminder: true, // Mark as reminder
      });

      if (result.success) {
        // Update sent_at timestamp
        await invoiceService.updateInvoice({
          id: invoice.id,
        });
        await invoiceService.updateInvoiceStatus({
          id: invoice.id,
          status: 'sent', // Ensure status is 'sent'
          updatedBy: user?.id,
        });
        setSuccess(`Invoice reminder sent successfully to ${invoice.clientEmail}`);
        setTimeout(() => setSuccess(null), 3000);
        await fetchInvoices();
        setResendDialog({ open: false, invoice: null });
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSignatureDialog = (invoice: Invoice) => {
    setSignatureDialog({ open: true, invoice });
  };

  const handleSaveSignature = (signatureData: string) => {
    if (signatureDialog.invoice) {
      // If it's a temp invoice (new invoice being created), save signature to formData
      if (signatureDialog.invoice.id === 'temp') {
        setFormData({ ...formData, signature: signatureData });
        setSignatureDialog({ open: false, invoice: null });
      } else {
        // Existing invoice - send email with signature
        handleSendEmail(signatureDialog.invoice, signatureData);
        setSignatureDialog({ open: false, invoice: null });
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.invoice) return;
    try {
      setLoading(true);
      setError(null);
      await invoiceService.deleteInvoice(deleteDialog.invoice.id);
      setSuccess(t('invoices.invoiceDeleted'));
      setTimeout(() => setSuccess(null), 3000);
      setDeleteDialog({ open: false, invoice: null });
      await fetchInvoices();
    } catch (err: any) {
      setError(err.message || t('invoices.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, invoiceCurrency?: string, useFormCurrency: boolean = false) => {
    // If useFormCurrency is true and formData.currency exists, use it (for form context)
    // Otherwise use invoiceCurrency parameter or system currency
    const currencyToUse = (useFormCurrency && formData.currency) ? formData.currency : (invoiceCurrency || currency);
    const symbol = getCurrencySymbol(currencyToUse as Currency);
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setLoading(true);
      setError(null);
      
      const company = companies.find(c => c.id === invoice.companyId);
      const invoiceCurrency = invoice.currency || currency;
      const invoiceCurrencySymbol = getCurrencySymbol(invoiceCurrency as Currency);
      
      const pdfData = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientNumber: invoice.clientNumber,
        clientCountry: invoice.clientCountry,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        dueDate: invoice.dueDate,
        companyName: company?.name,
        companyAddress: company?.address,
        companyPhone: company?.phone,
        companyEmail: company?.email,
        companyLogo: company?.logo,
        signature: invoice.signature,
        signedBy: invoice.signedBy,
        currencySymbol: invoiceCurrencySymbol,
        currencyCode: invoiceCurrency, // Pass currency code for PDF generation
        createdAt: invoice.createdAt,
        status: invoice.status,
      };

      const pdfBase64 = await invoicePDFService.generateInvoicePDFBase64(pdfData);
      
      // Convert base64 to blob and download
      try {
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice_${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        setSuccess('Invoice PDF downloaded successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } catch (decodeError: any) {
        console.error('Error decoding PDF:', decodeError);
        throw new Error('Failed to process PDF data');
      }
    } catch (err: any) {
      console.error('Error downloading invoice:', err);
      let errorMessage = 'Failed to download invoice PDF';
      
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not generate PDF. Please check your internet connection and try again.';
      } else if (err.message?.includes('load')) {
        errorMessage = 'Failed to load invoice data. Please refresh and try again.';
      } else if (err.message) {
        errorMessage = `Failed to download: ${err.message}`;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'approved':
      case 'sent':
        return 'info';
      case 'cancelled':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  // Calculate summary stats
  const summary = {
    total: invoices.reduce((sum, inv) => sum + inv.total, 0),
    paid: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    pending: invoices.filter(inv => inv.status === 'pending' || inv.status === 'draft').length,
    overdue: invoices.filter(inv => {
      if (!inv.dueDate) return false;
      return new Date(inv.dueDate) < new Date() && inv.status !== 'paid';
    }).length,
  };

  const filteredInvoices = invoices.filter(inv => {
    // Tab filtering
    if (tabValue === 1 && inv.status !== 'pending' && inv.status !== 'draft') return false;
    if (tabValue === 2 && inv.status !== 'sent') return false;
    if (tabValue === 3 && inv.status !== 'paid') return false;
    
    // Search by invoice number
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!inv.invoiceNumber.toLowerCase().includes(query)) return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  const handleExportToCSV = async () => {
    if (filteredInvoices.length === 0) {
      setError(t('financial.noDataToExport'));
      return;
    }

    const headers = ['Invoice #', 'Client Name', 'Client Email', 'Company', 'Total', 'Status', 'Due Date', 'Created At'];
    const rows = filteredInvoices.map(inv => {
      const companyName = inv.companyId 
        ? companies.find(c => c.id === inv.companyId)?.name || 'N/A'
        : 'N/A';
      return [
        inv.invoiceNumber,
        inv.clientName,
        inv.clientEmail,
        companyName,
        formatCurrency(inv.total, inv.currency),
        inv.status,
        formatDate(inv.dueDate),
        formatDate(inv.createdAt),
      ];
    });

    await exportService.exportToCSV({
      headers,
      rows,
      title: 'Invoices Report',
      filename: `invoices_${new Date().toISOString().split('T')[0]}.csv`,
    });

    setSuccess('Invoices exported successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleExportToPDF = async () => {
    if (filteredInvoices.length === 0) {
      setError(t('financial.noDataToExport'));
      return;
    }

    const headers = ['Invoice #', 'Client Name', 'Company', 'Total', 'Status', 'Due Date'];
    const rows = filteredInvoices.map(inv => {
      const companyName = inv.companyId 
        ? companies.find(c => c.id === inv.companyId)?.name || 'N/A'
        : 'N/A';
      return [
        inv.invoiceNumber,
        inv.clientName,
        companyName,
        formatCurrency(inv.total, inv.currency),
        inv.status,
        formatDate(inv.dueDate),
      ];
    });

    await exportService.exportToPDF({
      headers,
      rows,
      title: 'Invoices Report',
      filename: `invoices_${new Date().toISOString().split('T')[0]}.pdf`,
    });

    setSuccess('Invoices exported successfully!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto', py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              {t('invoices.management')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('invoices.description')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportToCSV}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('common.export')} CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdf />}
              onClick={handleExportToPDF}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('common.export')} PDF
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('invoices.create')}
            </Button>
            <IconButton
              onClick={fetchInvoices}
              disabled={loading}
              sx={{
                backgroundColor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.08)',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <Refresh />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AttachMoney sx={{ fontSize: 24, color: '#16a34a' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('invoices.totalAmount')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {formatCurrency(summary.total)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <CheckCircle sx={{ fontSize: 24, color: '#2563eb' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('invoices.paidAmount')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {formatCurrency(summary.paid)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Receipt sx={{ fontSize: 24, color: '#ca8a04' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('invoices.pendingAmount')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {summary.pending}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: 1.5, 
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Cancel sx={{ fontSize: 24, color: '#dc2626' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {t('invoices.overdueAmount')}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {summary.overdue}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Business sx={{ color: 'primary.main', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('attendance.filters')}
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {isAdmin && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('invoices.filterByCompany')}</InputLabel>
                  <Select
                    value={companyFilter}
                    label={t('invoices.filterByCompany')}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <MenuItem value="">{t('companies.total')}</MenuItem>
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={isAdmin ? 4 : 6}>
              <FormControl fullWidth>
                <InputLabel>{t('invoices.filterByStatus')}</InputLabel>
                <Select
                  value={statusFilter}
                  label={t('invoices.filterByStatus')}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                >
                  <MenuItem value="">{t('invoices.all')}</MenuItem>
                  <MenuItem value="draft">{t('invoices.draft')}</MenuItem>
                  <MenuItem value="pending">{t('leaves.pending')}</MenuItem>
                  <MenuItem value="approved">{t('leaves.approved')}</MenuItem>
                  <MenuItem value="sent">{t('invoices.sent')}</MenuItem>
                  <MenuItem value="paid">{t('invoices.paid')}</MenuItem>
                  <MenuItem value="cancelled">{t('invoices.cancelled')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={isAdmin ? 4 : 6}>
              <TextField
                fullWidth
                label="Search by Invoice Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., INV-20241215-0001"
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs for filtering */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab label={t('invoices.all')} />
          <Tab label={t('leaves.pending')} />
          <Tab label={t('invoices.sent')} />
          <Tab label={t('invoices.paid')} />
        </Tabs>
      </Paper>

      {/* Invoices Table */}
      <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ 
            p: 3, 
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'background.paper',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 1.5, 
                backgroundColor: '#e0e7ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Receipt sx={{ color: 'primary.main', fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {t('invoices.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredInvoices.length} {t('invoices.title')} {totalPages > 1 && `(${currentPage}/${totalPages})`}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3 }}>
            {loading && filteredInvoices.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                <CircularProgress />
              </Box>
            ) : filteredInvoices.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {t('invoices.noInvoices')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {companyFilter || statusFilter || tabValue > 0
                    ? t('common.search') + '...'
                    : t('invoices.description')}
                </Typography>
                <Button variant="contained" onClick={() => handleOpenDialog()} sx={{ borderRadius: 2, textTransform: 'none' }}>
                  {t('invoices.create')}
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('invoices.invoiceNumber')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('invoices.clientName')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('common.email')}</TableCell>
                      {isAdmin && <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('invoices.filterByCompany')}</TableCell>}
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('invoices.dueDate')}</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="right">
                        {t('invoices.total')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">
                        {t('invoices.status')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }} align="center">
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => {
                      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid';
                      const companyName = invoice.companyId 
                        ? companies.find(c => c.id === invoice.companyId)?.name 
                        : null;
                      return (
                        <TableRow key={invoice.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {invoice.invoiceNumber}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {invoice.clientName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              {invoice.clientEmail}
                            </Typography>
                          </TableCell>
                          {isAdmin && (
                            <TableCell sx={{ py: 2 }}>
                              {companyName ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {companyName}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                          )}
                          <TableCell sx={{ py: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: isOverdue ? 'error.main' : 'text.secondary' }} />
                              <Typography 
                                variant="body2" 
                                sx={{ fontWeight: isOverdue ? 600 : 400, color: isOverdue ? 'error.main' : 'text.primary' }}
                              >
                                {formatDate(invoice.dueDate)}
                              </Typography>
                              {isOverdue && (
                                <Chip label={t('invoices.overdue')} size="small" color="error" sx={{ ml: 1, fontSize: '0.625rem', height: 20 }} />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 2, fontWeight: 600 }}>
                            {formatCurrency(invoice.total, invoice.currency)}
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Chip 
                              label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)} 
                              color={getStatusColor(invoice.status)} 
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 2 }}>
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => setViewDialog({ open: true, invoice })}
                                sx={{
                                  border: '1px solid rgba(0,0,0,0.08)',
                                  '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                    borderColor: 'primary.main',
                                  },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                              {invoice.status === 'draft' && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(invoice)}
                                  sx={{
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    '&:hover': {
                                      backgroundColor: 'primary.main',
                                      color: 'white',
                                      borderColor: 'primary.main',
                                    },
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              )}
                              {isAdmin && invoice.status === 'pending' && (
                                <>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleUpdateStatus(invoice.id, 'approved')}
                                    disabled={loading}
                                    sx={{
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      '&:hover': {
                                        backgroundColor: 'success.main',
                                        color: 'white',
                                        borderColor: 'success.main',
                                      },
                                    }}
                                  >
                                    <CheckCircle fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleUpdateStatus(invoice.id, 'cancelled')}
                                    disabled={loading}
                                    sx={{
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      '&:hover': {
                                        backgroundColor: 'error.main',
                                        color: 'white',
                                        borderColor: 'error.main',
                                      },
                                    }}
                                  >
                                    <Cancel fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                              {(invoice.status === 'approved' || invoice.status === 'draft') && (
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleOpenSignatureDialog(invoice)}
                                  disabled={loading}
                                  sx={{
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    '&:hover': {
                                      backgroundColor: 'info.main',
                                      color: 'white',
                                      borderColor: 'info.main',
                                    },
                                  }}
                                  title="Send Invoice"
                                >
                                  <Email fontSize="small" />
                                </IconButton>
                              )}
                              {(invoice.status === 'sent' || invoice.status === 'pending') && (
                                <>
                                  {invoice.status === 'sent' && (
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleDownloadInvoice(invoice)}
                                      sx={{
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        '&:hover': {
                                          backgroundColor: 'primary.main',
                                          color: 'white',
                                          borderColor: 'primary.main',
                                        },
                                      }}
                                      title="Download Invoice PDF"
                                    >
                                      <Download fontSize="small" />
                                    </IconButton>
                                  )}
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() => handleResendInvoice(invoice)}
                                    disabled={loading}
                                    sx={{
                                      border: '1px solid rgba(0,0,0,0.08)',
                                      '&:hover': {
                                        backgroundColor: 'warning.main',
                                        color: 'white',
                                        borderColor: 'warning.main',
                                      },
                                    }}
                                    title="Resend Invoice (Reminder)"
                                  >
                                    <Send fontSize="small" />
                                  </IconButton>
                                  {invoice.status === 'sent' && (
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleUpdateStatus(invoice.id, 'paid')}
                                      disabled={loading}
                                      sx={{
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        '&:hover': {
                                          backgroundColor: 'success.main',
                                          color: 'white',
                                          borderColor: 'success.main',
                                        },
                                      }}
                                      title="Mark as Paid"
                                    >
                                      <CheckCircle fontSize="small" />
                                    </IconButton>
                                  )}
                                </>
                              )}
                              {invoice.status === 'draft' && (
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setDeleteDialog({ open: true, invoice })}
                                  sx={{
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    '&:hover': {
                                      backgroundColor: 'error.main',
                                      color: 'white',
                                      borderColor: 'error.main',
                                    },
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {/* Pagination */}
            {filteredInvoices.length > itemsPerPage && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mt: 3,
                pt: 2,
                borderTop: '1px solid rgba(0,0,0,0.08)'
              }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {startIndex + 1} - {Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    startIcon={<ChevronLeft />}
                    sx={{ textTransform: 'none' }}
                  >
                    Previous
                  </Button>
                  <Typography variant="body2" sx={{ px: 2 }}>
                    Page {currentPage} of {totalPages}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    endIcon={<ChevronRight />}
                    sx={{ textTransform: 'none' }}
                  >
                    Next
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {editingInvoice ? t('invoices.update') : t('invoices.create')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('invoices.invoiceNumber')}
                  fullWidth
                  required
                  disabled
                  value={formData.invoiceNumber}
                  helperText={t('common.autoGenerated') || 'Auto-generated'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('invoices.filterByCompany')}</InputLabel>
                  <Select
                    value={formData.companyId}
                    label={t('invoices.filterByCompany')}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    disabled={!!editingInvoice || (!isAdmin && !!user?.companyId)}
                  >
                    {companies.map((company) => (
                      <MenuItem key={company.id} value={company.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {company.logo ? (
                            <Box
                              component="img"
                              src={company.logo}
                              alt={company.name}
                              sx={{
                                width: 24,
                                height: 24,
                                objectFit: 'contain',
                                borderRadius: 0.5,
                              }}
                            />
                          ) : (
                            <Business sx={{ fontSize: 20, color: 'text.secondary' }} />
                          )}
                          <Typography>{company.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {!isAdmin && user?.companyId && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      You can only create invoices for your assigned company
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('invoices.clientName')}
                  fullWidth
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('invoices.clientEmail')}
                  type="email"
                  fullWidth
                  required
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Client Number"
                  fullWidth
                  value={formData.clientNumber}
                  onChange={(e) => setFormData({ ...formData, clientNumber: e.target.value })}
                  placeholder="e.g., CLT-001"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Country"
                  fullWidth
                  value={formData.clientCountry}
                  onChange={(e) => setFormData({ ...formData, clientCountry: e.target.value })}
                  placeholder="e.g., Cameroon"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('invoices.dueDate')}
                  type="date"
                  fullWidth
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={formData.currency}
                    label="Currency"
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    startAdornment={<CurrencyExchange sx={{ fontSize: 18, mr: 1, color: 'primary.main' }} />}
                  >
                    <MenuItem value="USD">$ USD - US Dollar</MenuItem>
                    <MenuItem value="AED">د.إ AED - UAE Dirham</MenuItem>
                    <MenuItem value="XAF">FCFA XAF - Central African CFA Franc</MenuItem>
                    <MenuItem value="GHS">₵ GHS - Ghana Cedi</MenuItem>
                    <MenuItem value="EUR">€ EUR - Euro</MenuItem>
                    <MenuItem value="GBP">£ GBP - British Pound</MenuItem>
                    <MenuItem value="SAR">﷼ SAR - Saudi Riyal</MenuItem>
                    <MenuItem value="EGP">E£ EGP - Egyptian Pound</MenuItem>
                    <MenuItem value="JPY">¥ JPY - Japanese Yen</MenuItem>
                    <MenuItem value="CNY">¥ CNY - Chinese Yuan</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.createClientAccount}
                      onChange={(e) => setFormData({ ...formData, createClientAccount: e.target.checked, clientPassword: e.target.checked ? formData.clientPassword : '' })}
                      disabled={!formData.clientEmail || !formData.clientName}
                    />
                  }
                  label="Create client account (allows client to log in and view invoices)"
                />
                <Collapse in={formData.createClientAccount}>
                  <Box sx={{ mt: 1, ml: 4 }}>
                    <TextField
                      label="Client Password (optional - leave blank to auto-generate)"
                      type={showClientPassword ? 'text' : 'password'}
                      size="small"
                      fullWidth
                      value={formData.clientPassword}
                      onChange={(e) => setFormData({ ...formData, clientPassword: e.target.value })}
                      placeholder="Leave blank to auto-generate password"
                      helperText="If blank, a strong password will be auto-generated and sent via email. If provided, password must be at least 6 characters long."
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowClientPassword(!showClientPassword)}
                              edge="end"
                              size="small"
                            >
                              {showClientPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Collapse>
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('invoices.items')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={t('invoices.description')}
                size="small"
                sx={{ flex: 2 }}
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              />
              <TextField
                label={t('invoices.quantity')}
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              />
              <TextField
                label={t('invoices.price')}
                type="number"
                size="small"
                sx={{ flex: 1 }}
                value={itemForm.unitPrice}
                onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
              />
              <Button variant="outlined" onClick={addItem} sx={{ minWidth: 100 }}>
                {t('invoices.addItem')}
              </Button>
            </Box>

            {formData.items.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{t('invoices.description')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">
                        {t('invoices.quantity')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        {t('invoices.price')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        {t('invoices.total')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">
                        {t('common.actions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice, undefined, true)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.total, undefined, true)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => removeItem(index)}>
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                        {t('invoices.subtotal')}:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(subtotal, undefined, true)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <TextField
                          label={t('invoices.tax')}
                          type="number"
                          size="small"
                          sx={{ width: 120 }}
                          value={formData.tax}
                          onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                          InputProps={{
                            startAdornment: <Typography sx={{ mr: 1 }}>{getFormCurrencySymbol()}</Typography>,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(tax, undefined, true)}</TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, fontSize: '1.1em' }}>
                        {t('invoices.total')}:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1em' }}>
                        {formatCurrency(total, undefined, true)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>{t('common.cancel')}</Button>
          {!editingInvoice && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => {
                // Open signature dialog for new invoice
                const tempInvoice: Invoice = {
                  id: 'temp',
                  companyId: formData.companyId,
                  createdBy: user?.id || '',
                  clientName: formData.clientName,
                  clientEmail: formData.clientEmail,
                  invoiceNumber: formData.invoiceNumber,
                  items: formData.items.map((item, idx) => ({
                    ...item,
                    id: `temp-${idx}`,
                  })),
                  subtotal: calculateTotals().subtotal,
                  tax: parseFloat(formData.tax) || 0,
                  total: calculateTotals().total,
                  status: 'draft',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setSignatureDialog({ open: true, invoice: tempInvoice });
              }}
              disabled={loading || !formData.clientName || !formData.clientEmail || formData.items.length === 0}
              sx={{ textTransform: 'none', borderRadius: 1.5, px: 3, mr: 1 }}
            >
              Add Signature
            </Button>
          )}
          {formData.signature && (
            <Chip 
              label="Signed" 
              color="success" 
              size="small" 
              sx={{ mr: 1 }}
              onDelete={() => setFormData({ ...formData, signature: '' })}
            />
          )}
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.clientName || !formData.clientEmail || formData.items.length === 0}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : editingInvoice ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog 
        open={viewDialog.open} 
        onClose={() => setViewDialog({ open: false, invoice: null })} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {viewDialog.invoice && (
          <>
            <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Receipt sx={{ color: 'primary.main' }} />
                <Typography variant="h6">{t('invoices.title')} {viewDialog.invoice.invoiceNumber}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.clientName')}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {viewDialog.invoice.clientName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.clientEmail')}
                    </Typography>
                    <Typography variant="body1">{viewDialog.invoice.clientEmail}</Typography>
                  </Grid>
                  {viewDialog.invoice.clientNumber && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices.clientNumber')}
                      </Typography>
                      <Typography variant="body1">{viewDialog.invoice.clientNumber}</Typography>
                    </Grid>
                  )}
                  {viewDialog.invoice.clientCountry && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        {t('invoices.clientCountry')}
                      </Typography>
                      <Typography variant="body1">{viewDialog.invoice.clientCountry}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.dueDate')}
                    </Typography>
                    <Typography variant="body1">{formatDate(viewDialog.invoice.dueDate)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      {t('invoices.status')}
                    </Typography>
                    <Chip label={viewDialog.invoice.status} color={getStatusColor(viewDialog.invoice.status)} size="small" />
                  </Grid>
                </Grid>

                <Divider />

                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>{t('invoices.description')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">
                          {t('invoices.quantity')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          {t('invoices.price')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">
                          {t('invoices.total')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {viewDialog.invoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                          {t('invoices.subtotal')}:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(viewDialog.invoice.subtotal)}
                        </TableCell>
                      </TableRow>
                      {viewDialog.invoice.tax && (
                        <TableRow>
                          <TableCell colSpan={3} align="right">
                            {t('invoices.tax')}:
                          </TableCell>
                          <TableCell align="right">{formatCurrency(viewDialog.invoice.tax)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, fontSize: '1.1em' }}>
                          {t('invoices.total')}:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1em' }}>
                          {formatCurrency(viewDialog.invoice.total)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableContainer>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 1 }}>
              <Button onClick={() => setViewDialog({ open: false, invoice: null })} sx={{ textTransform: 'none' }}>{t('common.close')}</Button>
              {viewDialog.invoice.status === 'approved' && (
                <Button 
                  variant="contained" 
                  startIcon={<Email />} 
                  onClick={() => {
                    setViewDialog({ open: false, invoice: null });
                    handleOpenSignatureDialog(viewDialog.invoice!);
                  }}
                  sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
                >
                  {t('invoices.send')}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, invoice: null })}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t('invoices.deleteInvoice')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('invoices.areYouSureDelete')} <strong>{deleteDialog.invoice?.invoiceNumber}</strong>? {t('common.thisActionCannotBeUndone')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, invoice: null })} sx={{ textTransform: 'none' }}>{t('common.cancel')}</Button>
          <Button 
            onClick={handleDelete} 
            variant="contained" 
            color="error" 
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: 1.5, px: 3 }}
          >
            {loading ? <CircularProgress size={20} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resend Invoice Confirmation Dialog */}
      <Dialog
        open={resendDialog.open}
        onClose={() => !loading && setResendDialog({ open: false, invoice: null })}
        PaperProps={{ 
          sx: { 
            borderRadius: 2,
            minWidth: 400,
            maxWidth: 500
          } 
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Email sx={{ fontSize: 24, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              Resend Invoice
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
              Send Reminder Email
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Resend invoice <strong>#{resendDialog.invoice?.invoiceNumber}</strong> to{' '}
            <strong>{resendDialog.invoice?.clientEmail}</strong>?
          </Typography>
          <Alert 
            severity="info" 
            icon={<Send />}
            sx={{ 
              borderRadius: 1.5,
              backgroundColor: 'info.light',
              '& .MuiAlert-icon': {
                color: 'info.main'
              }
            }}
          >
            <Typography variant="body2">
              This will send a reminder email to the client with the invoice PDF attached.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 2, gap: 1 }}>
          <Button 
            onClick={() => setResendDialog({ open: false, invoice: null })} 
            disabled={loading}
            sx={{ 
              textTransform: 'none',
              borderRadius: 1.5,
              px: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleConfirmResend}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Send />}
            sx={{ 
              textTransform: 'none', 
              borderRadius: 1.5, 
              px: 3,
              minWidth: 120
            }}
          >
            {loading ? 'Sending...' : 'Send Invoice'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* E-Signature Dialog */}
      <ESignature
        open={signatureDialog.open}
        onClose={() => setSignatureDialog({ open: false, invoice: null })}
        onSave={handleSaveSignature}
        userName={user?.role === 'admin' ? 'Supervisor' : (user ? `${user.firstName} ${user.lastName}` : undefined)}
      />
    </Box>
  );
};

export default InvoicesScreen;
