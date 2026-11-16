/**
 * Central platform configuration for Cloudora LMS.
 * All platform contact details, links, branding metadata, and demo configurations
 * are centralized here so updates are a single-line edit.
 *
 * Complies with Section 3 of Landing Page Fixes.
 */

export const SITE_CONFIG = {
  name: 'Cloudora LMS',
  legalName: 'Cloudora Solutions Limited',
  domain: 'cloudora.africa',
  webUrl: 'https://cloudora.africa',
  appUrl: 'https://app.cloudora.africa',
  apiDomain: 'api.cloudora.africa',

  // Contact details
  supportEmail: 'support@cloudora.africa',
  salesEmail: 'sales@cloudora.africa',
  billingEmail: 'billing@cloudora.africa',
  adminEmail: 'admin@cloudora.africa',

  // Phone / WhatsApp contact (International & display formats)
  phone: {
    display: '+254 759 585 197',
    international: '+254759585197',
    hours: 'Monday to Friday, 08:00 - 18:00 EAT',
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
