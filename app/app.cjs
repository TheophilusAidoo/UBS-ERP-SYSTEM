// Entry point for cPanel Node.js deployment
// This serves the built React/Vite application
// Usage: node app.cjs
// Make sure to run 'npm run build' first to build the application

const express = require('express');
const path = require('path');
const fs = require('fs');

// Set default environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';

const app = express();

// Check if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist folder not found!');
  console.error('📝 Please run "npm run build" first to build the application.');
  console.error('   Then run "node app.cjs" to start the server.');
  process.exit(1);
}

// Check if index.html exists in dist
const indexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ ERROR: index.html not found in dist folder!');
  console.error('📝 Please run "npm run build" first to build the application.');
  process.exit(1);
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files from the dist directory
app.use(express.static(distPath, {
  maxAge: NODE_ENV === 'production' ? '1y' : '0', // Cache in production
  etag: true,
  lastModified: true,
  index: false, // Don't auto-serve index.html, we'll handle it manually
}));

// SPA fallback: serve index.html for all routes that don't match static files
// This allows React Router to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

// Error handling middleware (must be after all routes)
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});


// Start the server
// Use '0.0.0.0' to accept connections from all network interfaces (for cPanel)
const host = process.env.HOST || '0.0.0.0';
app.listen(PORT, host, () => {
  console.log('');
  console.log('🚀 UBS ERP Application Server');
  console.log('═'.repeat(50));
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log(`✅ Application is ready and accessible!`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Make sure to build the app first: npm run build');
  console.log('   - For email server, run: node backend/email-server.js');
  console.log('');
});
