/**
 * Central platform configuration for Cloudora LMS Backend.
 * Single source of truth for platform domain, support emails, URLs, and socials.
 * Complies with Section 3 of Landing Page Fixes.
 */

const SITE_CONFIG = {
    name: 'Cloudora LMS',
    legalName: 'Cloudora Solutions Limited',
    domain: 'cloudora.africa',
    webUrl: process.env.FRONTEND_URL || 'https://cloudora.africa',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@cloudora.africa',
    salesEmail: process.env.SALES_EMAIL || 'sales@cloudora.africa',
    billingEmail: process.env.BILLING_EMAIL || 'billing@cloudora.africa',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@cloudora.africa',
    phone: '+254 759 585 197',
    phoneTel: '+254759585197',

    // Social handles (clean profile URLs without temporary tracking tokens)
    socials: {
        instagram: 'https://www.instagram.com/cloudora.limited',
        tiktok: 'https://www.tiktok.com/@cloudora.limited',
        linkedin: 'https://www.linkedin.com/company/cloudora-limited'
    }
};

module.exports = SITE_CONFIG;
