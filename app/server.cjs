// Entry point for Node.js email server
// Run this file to start the email server backend
// Usage: node server.js

// Since package.json has "type": "module", we need to use import
// But backend/email-server.js uses CommonJS, so we'll run it directly
// This file just redirects to the actual email server

console.log('Starting email server...');
console.log('Please run: node backend/email-server.js');
console.log('Or directly: cd backend && node email-server.js');