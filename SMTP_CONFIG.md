# SMTP Configuration Guide

This guide ensures the application can send emails for features like password resets, notifications, and reports.

## Environment Variables

Add these to your `backend/.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM="Cloudora LMS" <your-email@gmail.com>
```

## Setup Options

### 1. Gmail (Recommended for Dev/Small Scale)
- Enable 2-Step Verification on your Google Account.
- Generate an **App Password**:
  1. Go to Google Account Settings.
  2. Search for "App Passwords".
  3. Select "Other" and name it "Cloudora LMS".
  4. Use the 16-character code as your `SMTP_PASS`.

### 2. SendGrid / Mailgun (Production)
- Use `smtp.sendgrid.net` or your provider's SMTP endpoint.
- Port: `587` (TLS) or `465` (SSL).
- Username: `apikey` (for SendGrid) or as provided.
- Password: Your API Key.

## Troubleshooting
- **Connection Refused**: Check if your firewall allows outbound traffic on the selected port.
- **Authentication Failed**: Verify credentials and ensure App Passwords are used for Gmail/Outlook.
- **Timeout**: Check if you need to use SSL (Port 465) instead of TLS.
