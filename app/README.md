# UBS ERP Management System

A comprehensive Enterprise Resource Planning (ERP) system for managing companies, staff, clients, projects, invoices, orders, and more.

## 🚀 Features

- **Multi-Company Management**: Support for multiple companies with data isolation
- **Role-Based Access Control**: Admin and Staff roles with different permissions
- **Client Portal**: Separate client dashboard for viewing invoices and orders
- **Order Management**: Track products in demand and customer orders
- **Invoice Management**: Create, send, and track invoices with PDF generation
- **Project Management**: Manage projects with status tracking and assignments
- **Attendance & Leave**: Clock-in/clock-out and leave request system
- **Financial Tracking**: Income, expenses, and financial reports
- **Performance Management**: KPIs, goals, and employee reviews
- **Multi-Language Support**: English, French, and Arabic (with RTL support)
- **Email Integration**: Send invoices and reports via email
- **AI Integration**: AI-powered insights and analytics

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Authentication + Storage)
- **Email**: Node.js backend or PHP script for cPanel
- **PDF Generation**: jsPDF
- **Internationalization**: i18next
- **Charts**: Recharts

## 📋 Prerequisites

- Node.js 18+ (for development)
- npm or yarn
- Supabase account
- Git (for version control)

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ubs-erp.git
cd ubs-erp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email Server (Optional - for Node.js backend)
VITE_EMAIL_SERVER_URL=http://localhost:3001

# Backend Email Configuration
EMAIL_SERVER_HOST=mail.yourdomain.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=your-email@yourdomain.com
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_SERVER_FROM=your-email@yourdomain.com
EMAIL_SERVER_FROM_NAME=UBS ERP
```

### 4. Set Up Database

1. Go to your Supabase Dashboard → SQL Editor
2. Run the SQL files from the `database/` folder in this order:
   - `schema.sql` (main schema)
   - `create-helper-functions.sql`
   - `add-currency-to-clients.sql`
   - `update-rls-company-isolation.sql`
   - Other migration files as needed

### 5. Run the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
UBS ERP/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   │   ├── admin/      # Admin-specific screens
│   │   ├── staff/      # Staff-specific screens
│   │   ├── clients/    # Client portal screens
│   │   └── auth/       # Authentication screens
│   ├── services/       # API services and business logic
│   ├── store/          # Zustand state management
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── hooks/          # Custom React hooks
│   ├── i18n/           # Internationalization files
│   └── theme.ts        # MUI theme configuration
├── database/           # SQL migration files
├── backend/            # Node.js email server (optional)
├── public/             # Static assets
└── package.json        # Dependencies and scripts
```

## 👤 User Roles

### Admin
- Full system access
- Manage companies and staff
- View all data across companies
- Approve/reject leave requests
- Access analytics and reports

### Staff
- Access limited to own company
- Clock-in/clock-out
- Apply for leave
- Create invoices and orders
- Manage assigned projects
- View own performance

### Client
- Access client portal
- View invoices and orders
- Download invoice PDFs
- Receive email notifications

## 🌐 Multi-Language Support

The system supports:
- **English** (default)
- **French**
- **Arabic** (with RTL support)

Users can switch languages from the settings or header menu.

## 📧 Email Configuration

### Option 1: Node.js Backend (Development)

1. Navigate to `backend/` directory
2. Create `backend/.env` file with SMTP credentials
3. Install dependencies: `npm install`
4. Start server: `npm start` or use PM2 for production

### Option 2: PHP Script (cPanel Hosting)

1. Upload `api/send-email.php` to your server
2. Configure SMTP credentials in the PHP file
3. Update `VITE_EMAIL_SERVER_URL` to point to the PHP endpoint

## 🚀 Deployment

### For cPanel (Static Hosting)

1. Build the application: `npm run build`
2. Upload files from `dist/` folder to `public_html/`
3. Upload `.htaccess` file
4. Configure email script if needed
5. Run database migrations in Supabase

See `STATIC_HOSTING_DEPLOYMENT.md` for detailed instructions.

### For VPS/Cloud

1. Build the application: `npm run build`
2. Serve `dist/` folder with Nginx or Apache
3. Set up Node.js email server with PM2
4. Configure environment variables on the server

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Company-based data isolation for staff
- Secure authentication via Supabase Auth
- Environment variables for sensitive data
- CORS configured in Supabase

## 📝 Database Migrations

All SQL migration files are in the `database/` folder. Run them in order:

1. `schema.sql` - Main database schema
2. `create-helper-functions.sql` - Helper functions for RLS
3. `add-currency-to-clients.sql` - Add currency support
4. `update-rls-company-isolation.sql` - Company-based data isolation
5. Other migration files as needed

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for UBS**
