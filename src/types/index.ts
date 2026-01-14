// User Types
export type UserRole = 'admin' | 'staff' | 'client';
export type Language = 'en' | 'fr' | 'ar';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
  company?: Company;
  jobTitle?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  permissions?: string[];
  isSubAdmin?: boolean;
  isBanned?: boolean;
  salaryAmount?: number;
  salaryDate?: number; // Day of month (1-31)
  createdAt: string;
  updatedAt: string;
}

// Company Types
export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  taxId?: string; // VAT/Tax Identification Number
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Attendance Types
export type LeaveType = 'annual' | 'sick' | 'emergency';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface Attendance {
  id: string;
  userId: string;
  user?: User;
  clockIn: string;
  clockOut?: string;
  date: string;
  totalHours?: number;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  user?: User;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Financial Types
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  companyId?: string;
  userId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  category?: string;
  date: string;
  createdAt: string;
}

// Invoice Types
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'sent' | 'paid' | 'cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  createdBy: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientNumber?: string;
  clientCountry?: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax?: number;
  total: number;
  status: InvoiceStatus;
  dueDate?: string;
  sentAt?: string;
  paidAt?: string;
  signature?: string; // E-signature data URL
  signedBy?: string; // User ID who signed
  signedAt?: string;
  currency?: string; // Currency code (e.g., 'USD', 'AED', 'EUR')
  createdAt: string;
  updatedAt: string;
}

// Product Types
export type ProductStatus = 'available' | 'sold' | 'pending';
export type SaleStatus = 'pending' | 'in-progress' | 'sold' | 'cancelled';

export interface Product {
  id: string;
  companyId: string;
  createdBy: string;
  name: string;
  description?: string;
  image?: string; // Base64 or URL
  size?: string;
  color?: string;
  referenceNumber?: string;
  carNumber?: string;
  quantity: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  createdByUser?: User;
  company?: Company;
  // Price is deprecated - kept for backward compatibility but should not be used
  price?: number;
}

export interface ProductSale {
  id: string;
  productId: string;
  soldBy: string;
  companyId: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: SaleStatus;
  soldAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
  soldByUser?: User;
  company?: Company;
}

// Proposal Types
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  id: string;
  companyId: string;
  createdBy: string;
  clientName: string;
  clientEmail: string;
  proposalNumber: string;
  items: ProposalItem[];
  total: number;
  version: number;
  status: ProposalStatus;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// Client Types
export interface Client {
  id: string;
  companyId: string;
  createdBy: string;
  assignedTo?: string;
  authUserId?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  currency?: string; // Preferred currency code (e.g., 'USD', 'AED', 'EUR')
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  createdByUser?: User;
  assignedToUser?: User;
}

// Project Types
export type ProjectStatus = 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  companyId: string;
  clientId?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  createdAt: string;
  updatedAt: string;
  assignedUsers?: User[];
  assignedTo?: string[]; // Alternative property name
  client?: Client;
}

export interface WorkReport {
  id: string;
  projectId: string;
  userId: string;
  report: string;
  attachments?: string[];
  hoursWorked?: number;
  date: string;
  createdAt: string;
  user?: User; // User relation
  project?: Project; // Project relation (from DB joins)
}

export interface DailyReport {
  id: string;
  userId: string;
  companyId: string;
  date: string;
  summary: string; // Keep for backward compatibility
  notes?: string; // Keep for backward compatibility
  tasks?: string; // Tasks of the day (e.g., Sales offers, order taking, and order processing)
  clientsContacted?: number; // Number of clients contacted
  quotesSent?: number; // Number of quotes sent
  salesMade?: number; // Number of sales made
  followUp?: string; // Follow-up tasks to do
  remark?: string; // Additional remarks or notes
  createdAt: string;
  updatedAt: string;
  user?: User;
  company?: Company;
}

// Message Types
export interface Message {
  id: string;
  fromUserId?: string; // Optional for client messages
  fromClientId?: string; // For messages from clients
  toUserId?: string; // Optional for client messages
  clientId?: string; // For messages TO clients
  subject?: string;
  content: string;
  attachments?: Array<{
    type: 'file' | 'image';
    url: string;
    name: string;
    size?: number; // Optional to allow creating messages without size
  }>;
  isRead: boolean;
  createdAt: string;
  fromUser?: User;
  toUser?: User;
  client?: Client;
  fromClient?: Client; // For messages from clients
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

// Performance Types
export interface KPI {
  id: string;
  category: string;
  name: string;
  description?: string;
  unit?: string;
  target?: number;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'short-term' | 'long-term';
  targetValue?: number;
  currentValue: number;
  startDate: string;
  endDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  user?: User; // User relation
}

export interface PerformanceReview {
  id: string;
  userId: string;
  reviewedBy: string;
  cycle: 'monthly' | 'quarterly';
  period: string;
  ratings?: any;
  overallRating?: number;
  feedback?: string;
  competencies?: any;
  createdAt: string;
  updatedAt: string;
  user?: User; // User relation
  reviewedByUser?: User; // Reviewed by user relation
}

// AI Types
export interface AIInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  recommendations?: string[];
  data?: any;
  createdAt: string;
}

// Audit Log Types
// Delivery Types
export type DeliveryType = 'air' | 'sea';
export type DeliveryStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';

export interface DeliveryItem {
  name: string;
  picture?: string;
}

export interface Delivery {
  id: string;
  companyId: string;
  createdBy: string;
  deliveryType: DeliveryType;
  date: string;
  clientName: string; // Kept for backward compatibility, but UI shows as "Sender Name"
  clientNumber?: string; // Kept for backward compatibility
  senderPhone?: string; // New field for sender phone number
  items: DeliveryItem[];
  sizeKgVolume?: string;
  departure: 'Dubai' | 'China';
  destination: string;
  receiverDetails?: string;
  estimateArrivalDate?: string;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  company?: Company;
  createdByUser?: User;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalCompanies?: number;
  totalStaff?: number;
  activeProjects?: number;
  pendingLeaves?: number;
  revenue?: number;
  expenses?: number;
  profit?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  dailyIncome?: number;
  dailyExpenses?: number;
}

// AI Chat Message
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Performance Types
export type GoalType = 'short-term' | 'long-term';
export type ReviewCycle = 'monthly' | 'quarterly' | 'annual';
