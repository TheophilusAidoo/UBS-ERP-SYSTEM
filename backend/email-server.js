// Simple Email Server - Direct cPanel SMTP
// Run: node backend/email-server.js

require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`📧 Email server running on http://localhost:${PORT}`);
  console.log(`✅ Ready to send emails!`);
});
