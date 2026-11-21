/**
 * Central platform configuration for Cloudora LMS.
 * All platform contact details, links, branding metadata, and demo configurations
 * are centralized here so updates are a single-line edit.
 *
 * Complies with Section 3 of Landing Page Fixes.
 */

export const SITE_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'Cloudora LMS',
  legalName: process.env.EXPO_PUBLIC_LEGAL_NAME || 'Cloudora Solutions Limited',
  domain: process.env.EXPO_PUBLIC_DOMAIN || 'cloudora.africa',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://cloudora.africa',
  appUrl: process.env.EXPO_PUBLIC_APP_URL || 'https://app.cloudora.africa',
  apiDomain: process.env.EXPO_PUBLIC_API_DOMAIN || 'api.cloudora.africa',

  // Contact details
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'support@cloudora.africa',
  salesEmail: process.env.EXPO_PUBLIC_SALES_EMAIL || 'sales@cloudora.africa',
  billingEmail: process.env.EXPO_PUBLIC_BILLING_EMAIL || 'billing@cloudora.africa',
  adminEmail: process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'admin@cloudora.africa',

  // Phone / WhatsApp contact (International & display formats)
  phone: {
    display: process.env.EXPO_PUBLIC_CONTACT_PHONE_DISPLAY || '+254 759 585 197',
    international: process.env.EXPO_PUBLIC_CONTACT_PHONE_INTL || '+254759585197',
    hours: process.env.EXPO_PUBLIC_CONTACT_HOURS || 'Monday to Friday, 08:00 - 18:00 EAT',
    sub: 'Direct phone & WhatsApp assistance',
  },

  // Social & Web Links
  // Note: Original URLs had share/tracking query parameters that were stripped for permanent profile stability:
  // - Instagram: https://www.instagram.com/cloudora.limited?xtok=MTcxZnBobG1ud2lkbg==
  // - TikTok: https://www.tiktok.com/@cloudora.limited?_r=1&_t=ZS-9AzQTNjONHN
  // - LinkedIn: https://www.linkedin.com/company/cloudora-limited
  socials: {
    instagram: {
      handle: '@cloudora.limited',
      url: 'https://www.instagram.com/cloudora.limited',
      label: 'Open our Instagram page',
      sub: 'Platform updates & school highlights',
    },
    tiktok: {
      handle: '@cloudora.limited',
      url: 'https://www.tiktok.com/@cloudora.limited',
      label: 'Open our TikTok page',
      sub: 'Short guides, feature walkthroughs & campus life',
    },
    linkedin: {
      handle: 'Cloudora Solutions',
      url: 'https://www.linkedin.com/company/cloudora-limited',
      label: 'Open our LinkedIn page',
      sub: 'Institutional partnerships & company milestones',
    },
  },

  // Demo feedback roles
  feedbackRoles: [
    { value: 'school_admin', label: 'School Owner / Administrator' },
    { value: 'teacher', label: 'Teacher / Educator' },
    { value: 'parent', label: 'Parent / Guardian' },
    { value: 'student', label: 'Student' },
    { value: 'other', label: 'Other Education Stakeholder' },
  ],

  // Engagement threshold for demo modules before prompting feedback
  engagementThresholdSeconds: 5,
};

export default SITE_CONFIG;
