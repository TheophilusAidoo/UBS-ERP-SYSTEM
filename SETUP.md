# UBS ERP Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI**: `npm install -g expo-cli`
4. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
5. **OpenAI API Key** (optional, for AI features): Get from [openai.com](https://openai.com)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL script from `database/schema.sql` to create all tables
4. Copy your Supabase project URL and anon key from Settings > API

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-key (optional)
```

### 4. Configure Supabase Authentication

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Enable Email provider
3. Configure email templates if needed
4. Set up Row Level Security (RLS) policies as needed

### 5. Create Initial Admin User

You can create an admin user through:

1. Supabase Dashboard > Authentication > Users > Add User
2. Or use the registration screen in the app (if admin registration is enabled)
3. Then update the user role in the `users` table to 'admin'

### 6. Run the Application

```bash
# Start Expo development server
npm start

# Or run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

## Project Structure

```
UBS ERP/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen components
│   │   ├── admin/        # Admin-specific screens
│   │   ├── staff/        # Staff-specific screens
│   │   ├── auth/         # Authentication screens
│   │   └── common/       # Shared screens
│   ├── navigation/       # Navigation configuration
│   ├── services/         # API and business logic
│   ├── store/            # State management (Zustand)
│   ├── types/            # TypeScript definitions
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── constants/        # App constants
│   └── i18n/             # Internationalization
├── database/
│   └── schema.sql        # Database schema
├── App.tsx               # Root component
└── package.json
```

## Key Features

### Authentication
- Admin and Staff login
- Role-based access control
- Secure session management

### Multi-Language Support
- English (default)
- French
- Arabic (with RTL support)
- Language switcher in settings

### Admin Features
- Company management
- Staff management
- Financial reporting
- Attendance & leave approval
- Project tracking
- AI insights

### Staff Features
- Personal dashboard
- Clock in/out
- Leave requests
- Project assignments
- Invoice creation
- Performance goals

## Database Setup

The database schema includes:

- **Companies**: Multi-company support
- **Users**: Admin and Staff accounts
- **Attendance**: Clock in/out records
- **Leave Requests**: Leave management
- **Transactions**: Financial transactions
- **Invoices**: Invoice management
- **Proposals**: Proposal/estimate management
- **Projects**: Project tracking
- **Messages**: Internal messaging
- **Notifications**: System notifications
- **Goals**: Performance goals
- **Performance Reviews**: Employee reviews
- **AI Insights**: AI-generated insights
- **Audit Logs**: Security audit trail

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**
   - Verify your `.env` file has correct credentials
   - Check Supabase project is active
   - Verify network connectivity

2. **Module Resolution Errors**
   - Clear cache: `expo start -c`
   - Delete `node_modules` and reinstall
   - Check `babel.config.js` path aliases

3. **TypeScript Errors**
   - Run `npm run type-check` to see all errors
   - Ensure all dependencies are installed
   - Check `tsconfig.json` paths configuration

4. **Authentication Issues**
   - Verify RLS policies in Supabase
   - Check user role in database
   - Ensure email provider is enabled

## Next Steps

1. Implement remaining screen components
2. Add email service integration
3. Complete AI service integration
4. Add PDF/Excel export functionality
5. Implement real-time features
6. Add push notifications
7. Performance optimization
8. Testing and QA

## Support

For issues or questions, refer to:
- React Native Documentation: https://reactnative.dev
- Expo Documentation: https://docs.expo.dev
- Supabase Documentation: https://supabase.com/docs


