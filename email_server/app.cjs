// Simple Email Server - Direct cPanel SMTP
// Run: node backend/email-server.js

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000; // Email server port (different from frontend)

// CORS configuration - allow all origins for development
app.use(cors({
  origin: '*', // Allow all origins (frontend can be on any port)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));
// Increase body size limit to 50MB for PDF attachments (base64 encoded PDFs can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log('✅ Body size limit set to 50MB for PDF attachments');

// Email configuration - Load from .env file or use defaults
// NOTE: Settings from Admin Panel (Supabase) take priority over these defaults
const emailConfig = {
  host: process.env.SMTP_HOST || 'mail.ubscrm.com', // Updated default
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465 (SSL), false for other ports
  auth: {
    user: process.env.SMTP_USER || 'info@ubscrm.com', // Updated default
    pass: process.env.SMTP_PASSWORD || 'Aidoo@1998', // Updated default
  },
};

// Check credentials (warn but don't exit - allow server to start)
const hasCredentials = emailConfig.auth.user && emailConfig.auth.pass;

if (!hasCredentials) {
  console.warn('⚠️  WARNING: SMTP credentials not found!');
  console.warn('The email server will start, but emails cannot be sent until credentials are configured.');
  console.warn('');
  console.warn('To fix this, create backend/.env file with:');
  console.warn('  SMTP_HOST=mail.ubscrm.com');
  console.warn('  SMTP_PORT=465');
  console.warn('  SMTP_USER=info@ubscrm.com');
  console.warn('  SMTP_PASSWORD=your_password');
  console.warn('');
} else {
  console.log('✅ SMTP Configuration:');
  console.log(`   Host: ${emailConfig.host}`);
  console.log(`   Port: ${emailConfig.port}`);
  console.log(`   User: ${emailConfig.auth.user}`);
  console.log(`   Password: ${emailConfig.auth.pass ? '***' + emailConfig.auth.pass.slice(-3) : 'NOT SET'}`);
}

// Health check with SMTP test
app.get('/test-connection', async (req, res) => {
  try {
    const { host, port, user, password, secure } = req.query;
    
    if (!host || !port || !user || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing SMTP parameters: host, port, user, password',
      });
    }
    
    const testTransporter = nodemailer.createTransport({
      host: host.trim(),
      port: parseInt(port),
      secure: secure === 'true' || port === '465',
      auth: {
        user: user.trim(),
        pass: password.trim(),
      },
      connectionTimeout: 8000,
      socketTimeout: 15000,
      greetingTimeout: 5000,
      pool: false,
      tls: {
        rejectUnauthorized: false,
      },
    });
    
    console.log('🔍 Testing SMTP connection to:', host, 'port:', port);
    const startTime = Date.now();
    
    try {
      await Promise.race([
        testTransporter.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      testTransporter.close();
      const duration = Date.now() - startTime;
      
      res.json({
        success: true,
        message: `SMTP connection successful (${duration}ms)`,
        duration,
      });
    } catch (verifyError) {
      testTransporter.close();
      throw verifyError;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'SMTP connection test failed',
    });
  }
});

app.post('/send-email', async (req, res) => {
  try {
    // Log request size for debugging
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
      console.log(`📦 Received email request: ${sizeMB}MB (${contentLength} bytes)`);
    }
    
    const { to, subject, html, attachments, smtpConfig } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, html',
      });
    }
    
    console.log('📧 Received email request:', {
      to,
      subject,
      hasAttachments: !!(attachments && attachments.length > 0),
      hasSmtpConfig: !!smtpConfig,
    });

    // Use SMTP config from request if provided (from Supabase settings), otherwise use .env defaults
    let smtpSettings = emailConfig;
    
    if (smtpConfig && smtpConfig.host && smtpConfig.user && smtpConfig.password) {
      // Use settings from Supabase (admin panel)
      const port = parseInt(smtpConfig.port || '465');
      // Port 465 = SSL (secure: true), Port 587 = TLS (secure: false)
      const isSecure = smtpConfig.secure === 'true' || smtpConfig.secure === true || port === 465;
      
      smtpSettings = {
        host: smtpConfig.host.trim(),
        port: port,
        secure: isSecure,
        auth: {
          user: smtpConfig.user.trim(),
          pass: smtpConfig.password.trim(),
        },
      };
      console.log('📧 Using SMTP settings from Supabase (admin panel):', {
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        user: smtpSettings.auth.user,
      });
    } else {
      // Use .env defaults
      console.log('📧 Using SMTP settings from .env file');
    }

    // Check if credentials are configured
    if (!smtpSettings.auth.user || !smtpSettings.auth.pass) {
      return res.status(500).json({
        success: false,
        error: 'SMTP credentials not configured. Please configure SMTP settings in Admin Panel > Settings > Email Configuration, or create backend/.env file with SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD.',
      });
    }

    // Create transporter with the selected SMTP settings
    // Optimized for cPanel SMTP with proper timeouts
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure, // true for SSL (465), false for TLS (587)
      auth: {
        user: smtpSettings.auth.user,
        pass: smtpSettings.auth.pass,
      },
      // Timeout settings optimized for cPanel SMTP
      connectionTimeout: 10000, // 10 seconds to establish connection
      socketTimeout: 20000, // 20 seconds for socket operations
      greetingTimeout: 8000, // 8 seconds for SMTP greeting
      // Disable pooling for simpler, faster connections
      pool: false,
      // Additional options for cPanel SMTP (port 465 with SSL)
      ...(smtpSettings.secure ? {
        // SSL options for port 465
        tls: {
          rejectUnauthorized: false, // Some cPanel servers have self-signed certs
          minVersion: 'TLSv1',
        },
      } : {
        // TLS options for port 587
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
        },
      }),
      // Debug mode (set to true to see SMTP communication)
      debug: false,
      logger: false,
    });

    // Skip verification for faster email sending - verify will happen during actual send
    // Verification can be slow and cause timeouts, so we skip it and let the send operation verify
    console.log('📧 Using SMTP settings:', {
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      user: smtpSettings.auth.user,
    });

    // Extract plain text from HTML (simple version)
    const plainText = html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    // Get from name and email from request or use defaults
    const fromName = smtpConfig?.fromName || process.env.SMTP_FROM_NAME || 'UBS ERP System';
    const fromEmail = smtpConfig?.fromEmail || smtpSettings.auth.user;

    // Prepare email options
    const mailOptions = {
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
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content, // Base64 content
        contentType: att.contentType || 'application/pdf',
        encoding: att.encoding || 'base64',
      }));
      console.log(`📎 Attaching ${attachments.length} file(s) to email`);
    }

    // Send email with timeout to prevent hanging
    console.log('📤 Attempting to send email to:', to);
    console.log('📤 Using SMTP:', {
      host: smtpSettings.host,
      port: smtpSettings.port,
      secure: smtpSettings.secure,
      user: smtpSettings.auth.user,
    });
    const sendStartTime = Date.now();
    
    // Create a more aggressive timeout with better error handling
    let timeoutId;
    const sendPromise = transporter.sendMail(mailOptions)
      .then((result) => {
        if (timeoutId) clearTimeout(timeoutId);
        return result;
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        transporter.close().catch(() => {});
        throw error;
      });
    
    const sendTimeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error('⏱️ Email send timeout after 25 seconds');
        transporter.close().catch(() => {});
        reject(new Error(`Email send timeout (25s). SMTP server ${smtpSettings.host}:${smtpSettings.port} did not respond. Please check:\n1. SMTP Host: ${smtpSettings.host}\n2. SMTP Port: ${smtpSettings.port}\n3. Connection Security: ${smtpSettings.secure ? 'SSL' : 'TLS'}\n4. Firewall/network allows outbound connections\n5. cPanel email account is active`));
      }, 25000); // 25 seconds timeout
    });
    
    let info;
    try {
      info = await Promise.race([sendPromise, sendTimeoutPromise]);
    } catch (sendError) {
      // Ensure timeout is cleared
      if (timeoutId) clearTimeout(timeoutId);
      // Close transporter on error
      transporter.close().catch(() => {});
      throw sendError;
    }
    
    const sendDuration = Date.now() - sendStartTime;
    console.log(`✅ Email sent successfully to: ${to} (took ${sendDuration}ms)`, attachments ? `with ${attachments.length} attachment(s)` : '');

    res.json({
      success: true,
      message: `Email sent successfully to ${to}${attachments ? ` with ${attachments.length} attachment(s)` : ''}`,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    
    // Provide helpful error messages with specific guidance
    let errorMessage = error.message || 'Failed to send email';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      errorMessage = `SMTP server connection timeout. Please verify:\n` +
        `1. SMTP Host: ${smtpSettings.host} (should be mail.ubscrm.com)\n` +
        `2. SMTP Port: ${smtpSettings.port} (should be 465 for SSL)\n` +
        `3. Connection Security: ${smtpSettings.secure ? 'SSL' : 'TLS'}\n` +
        `4. Check if your cPanel email account is active\n` +
        `5. Try testing the connection from cPanel email settings`;
    } else if (errorMessage.includes('authentication') || errorMessage.includes('535') || errorMessage.includes('Invalid login') || errorMessage.includes('AUTH')) {
      errorMessage = `SMTP authentication failed. Please verify:\n` +
        `1. Username: ${smtpSettings.auth.user} (should be info@ubscrm.com)\n` +
        `2. Password: Check if password is correct (Aidoo@1998)\n` +
        `3. Make sure the email account exists in cPanel`;
    } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      errorMessage = `Cannot connect to SMTP server ${smtpSettings.host}.\n` +
        `Please check:\n` +
        `1. SMTP Host is correct: mail.ubscrm.com\n` +
        `2. Port is correct: 465\n` +
        `3. Your server/firewall allows outbound connections on port 465`;
    } else if (errorMessage.includes('ECONNRESET') || errorMessage.includes('socket')) {
      errorMessage = `SMTP connection was reset. This might be due to:\n` +
        `1. Incorrect SSL/TLS settings (try SSL for port 465)\n` +
        `2. Firewall blocking the connection\n` +
        `3. SMTP server rejecting the connection`;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
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

// Test SMTP connection endpoint
app.post('/test-smtp', async (req, res) => {
  try {
    const { smtpConfig } = req.body;
    
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      return res.status(400).json({
        success: false,
        error: 'SMTP configuration is required',
      });
    }
    
    const port = parseInt(smtpConfig.port || '465');
    const isSecure = smtpConfig.secure === 'true' || smtpConfig.secure === true || port === 465;
    
    const testTransporter = nodemailer.createTransport({
      host: smtpConfig.host.trim(),
      port: port,
      secure: isSecure,
      auth: {
        user: smtpConfig.user.trim(),
        pass: smtpConfig.password.trim(),
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
      greetingTimeout: 8000,
      pool: false,
      ...(isSecure ? {
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1',
        },
      } : {
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });
    
    // Quick connection test
    console.log('🔍 Testing SMTP connection...');
    const verifyPromise = testTransporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMTP connection test timeout (15s)')), 15000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    testTransporter.close();
    
    res.json({
      success: true,
      message: 'SMTP connection test successful!',
    });
  } catch (error) {
    console.error('❌ SMTP test error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'SMTP connection test failed',
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📧 Email server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📧 Email server shutting down...');
  process.exit(0);
});

// Listen on all interfaces (0.0.0.0) to allow connections from frontend
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📧 Email Server Started Successfully!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📍 Server PID: ${process.pid}`);
  console.log(`💡 Frontend connects to: http://localhost:${PORT}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  if (hasCredentials) {
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
    console.error(`   Option 3: Use a different port`);
    console.error(`   PORT=3002 npm start\n`);
    process.exit(1);
  } else {
    console.error(`\n❌ Server error:`, error);
    process.exit(1);
  }
});