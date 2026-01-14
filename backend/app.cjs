// Simple Email Server - Direct cPanel SMTP
// Run: node backend/email-server.js

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Increase body size limit to 50MB for PDF attachments (base64 encoded PDFs can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log('✅ Body size limit set to 50MB for PDF attachments');

// Email configuration - Load from .env file
const emailConfig = {
  host: process.env.SMTP_HOST || 'mail.stockmartllc.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465 (SSL), false for other ports
  auth: {
    user: process.env.SMTP_USER || 'info@stockmartllc.com',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

// Validate credentials
if (!emailConfig.auth.user || !emailConfig.auth.pass) {
  console.error('❌ ERROR: SMTP credentials not found!');
  console.error('Make sure backend/.env file exists with:');
  console.error('  SMTP_HOST=mail.stockmartllc.com');
  console.error('  SMTP_PORT=465');
  console.error('  SMTP_USER=info@stockmartllc.com');
  console.error('  SMTP_PASSWORD=your_password');
  process.exit(1);
}

console.log('✅ SMTP Configuration:');
console.log(`   Host: ${emailConfig.host}`);
console.log(`   Port: ${emailConfig.port}`);
console.log(`   User: ${emailConfig.auth.user}`);
console.log(`   Password: ${emailConfig.auth.pass ? '***' + emailConfig.auth.pass.slice(-3) : 'NOT SET'}`);

app.post('/send-email', async (req, res) => {
  try {
    // Log request size for debugging
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
      console.log(`📦 Received email request: ${sizeMB}MB (${contentLength} bytes)`);
    }
    
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html',
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Extract plain text from HTML (simple version)
    const plainText = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    // Get from name from env or use default
    const fromName = process.env.SMTP_FROM_NAME || 'UBS ERP System';
    const fromEmail = emailConfig.auth.user;

    // Send email with proper headers to avoid spam
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo: fromEmail,
      subject,
      text: plainText, // Plain text version
      html,
      // Important headers to avoid spam
      headers: {
        'X-Mailer': 'UBS ERP System',
        'X-Priority': '3',
        'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@${emailConfig.host}>`,
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      // Additional options for better deliverability
      priority: 'normal',
      date: new Date(),
    });

    console.log('✅ Email sent successfully to:', to);

    res.json({
      success: true,
      message: `Email sent successfully to ${to}`,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Email server is running',
    smtp: {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user,
      passwordSet: !!emailConfig.auth.pass,
    },
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📧 Email Server Started Successfully!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📍 Server PID: ${process.pid}`);
  console.log(`💡 Frontend connects to: http://localhost:${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  if (emailConfig.auth.user && emailConfig.auth.pass) {
    console.log(`✅ SMTP configured and ready to send emails!`);
    console.log(`   Host: ${emailConfig.host}`);
    console.log(`   Port: ${emailConfig.port}`);
    console.log(`   User: ${emailConfig.auth.user}`);
  } else {
    console.log(`⚠️  Server started but emails cannot be sent until SMTP credentials are configured.`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`⚠️  Keep this terminal open - server must stay running!`);
  console.log(`⚠️  Press Ctrl+C to stop the server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});

// Handle port already in use error gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!\n`);
    console.error(`💡 Another process is using port ${PORT}.`);
    console.error(`\n📋 To fix this, run one of these commands:\n`);
    console.error(`   Option 1: Kill the process using port ${PORT}`);
    console.error(`   lsof -ti:${PORT} | xargs kill -9\n`);
    console.error(`   Option 2: Kill all email server processes`);
    console.error(`   pkill -f "email-server.js" && pkill -f "app.cjs"\n`);
    console.error(`   Option 3: Use npm run kill`);
    console.error(`   npm run kill\n`);
    console.error(`   Option 4: Use a different port`);
    console.error(`   PORT=3002 node app.cjs\n`);
    process.exit(1);
  } else {
    console.error(`\n❌ Server error:`, error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n📧 Email server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
