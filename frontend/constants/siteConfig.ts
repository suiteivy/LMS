/**
 * Central platform configuration for Cloudora LMS.
 * All platform contact details, links, branding metadata, and demo configurations
 * are centralized here so updates are a single-line edit.
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
  socials: {
    instagram: {
      handle: '@cloudora.solutions',
      url: 'https://instagram.com/cloudora.solutions',
      label: 'Open our Instagram profile',
      sub: 'Product updates & guides',
    },
    linkedin: {
      handle: 'Cloudora Solutions',
      url: 'https://linkedin.com/company/cloudora-solutions',
      label: 'Open our LinkedIn company page',
      sub: 'School visits & demonstrations',
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
