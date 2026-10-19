// Ssewasswa Comforts Technologies — canonical contact info (single source of truth)
// D1 fix: phone numbers were inconsistent across files; now centralized here.

export const CONTACTS = {
  mtn: {
    label: 'MTN Mobile Money',
    holder: 'Ssewasswa Comforts Tech',
    short: '0789 736 737',
    international: '+256 789 736 737',
    href: 'tel:+256789736737',
  },
  airtel: {
    label: 'Airtel Money',
    holder: 'Ssewasswa Comforts Tech',
    short: '0752 971 118',
    international: '+256 752 971 118',
    href: 'tel:+256752971118',
  },
  whatsapp: {
    label: 'WhatsApp',
    short: '+256 789 736 737',
    href: 'https://wa.me/256789736737',
  },
  email: {
    label: 'Email',
    address: 'support@ssewasswacomfortstechnologies.com',
    href: 'mailto:support@ssewasswacomfortstechnologies.com',
  },
};

export function getContacts() { return CONTACTS; }
export function getMTN() { return CONTACTS.mtn; }
export function getAirtel() { return CONTACTS.airtel; }
