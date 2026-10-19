// FileName: src/config/healthFacilityTypes.js
// Ssewasswa Comforts HMIS — Health Facility Type Configuration
// Uganda Ministry of Health facility hierarchy:
//   Drug Shop → Pharmacy → Clinic → HC II → HC III → HC IV → General Hospital
// Each facility type gets a different module subset + tier pricing.

export const HEALTH_FACILITY_TYPES = {
  // ─── Drug Shop (smallest) ────────────────────────────────
  DrugShop: {
    label: 'Drug Shop',
    description: 'Community drug shop (Class A license — OTC medicines only). For-profit, single room.',
    modules: ['dashboard', 'patients', 'pharmacy', 'billing'],
    tiers: {
      ordinary: { price: 100000, priceLabel: 'UGX 100,000/yr', features: [
        'Patient registration (walk-ins)',
        'Pharmacy: drug inventory + dispensing + stock alerts',
        'Billing: receipts + balances',
        'Single-terminal license (one computer)',
        'Email support (48hr response)',
      ]},
      premium: { price: 200000, priceLabel: 'UGX 200,000/yr', features: [
        'All Ordinary features',
        'NDA compliance reports (drug sales ledger)',
        'Auto stock reorder alerts (SMS to supplier)',
        'Multi-terminal (up to 3 computers)',
        'WhatsApp + call support (4hr response)',
      ]},
    },
  },

  // ─── Standalone Pharmacy ────────────────────────────────
  Pharmacy: {
    label: 'Standalone Pharmacy',
    description: 'Registered pharmacy (Class B license — prescription + OTC medicines, with pharmacist on duty).',
    modules: ['dashboard', 'patients', 'pharmacy', 'billing', 'lab'],
    tiers: {
      ordinary: { price: 150000, priceLabel: 'UGX 150,000/yr', features: [
        'Patient registration + prescriptions',
        'Pharmacy: drug inventory + dispensing + stock alerts + expiry tracking',
        'Billing: receipts + insurance claims (basic)',
        'Lab: basic tests (malaria, glucose, pregnancy)',
        'Single-terminal license',
        'Email support',
      ]},
      premium: { price: 300000, priceLabel: 'UGX 300,000/yr', features: [
        'All Ordinary features',
        'NDA + NHIS compliance reports',
        'Insurance claim automation (Jubilee, UAP, ICEA, Prudential)',
        'Multi-terminal (up to 5 computers)',
        'Auto stock reorder + supplier price comparison',
        'WhatsApp support',
      ]},
    },
  },

  // ─── Private Clinic ─────────────────────────────────────
  Clinic: {
    label: 'Private Clinic',
    description: 'Outpatient clinic with one or more clinicians/medical officers. No inpatient beds.',
    modules: ['dashboard', 'patients', 'opd', 'pharmacy', 'lab', 'billing'],
    tiers: {
      ordinary: { price: 200000, priceLabel: 'UGX 200,000/yr', features: [
        'Patient registration + demographics + history',
        'OPD: triage + diagnosis + prescription',
        'Pharmacy: inventory + dispensing',
        'Lab: test requests + results',
        'Billing: receipts + balances',
        'Single-terminal',
        'Email support',
      ]},
      premium: { price: 400000, priceLabel: 'UGX 400,000/yr', features: [
        'All Ordinary features',
        'Insurance + NHIS billing',
        'Multi-clinic chain management (up to 3 branches)',
        'Telemedicine integration (video consults)',
        'WhatsApp + call support',
        'Free updates for 1 year',
      ]},
    },
  },

  // ─── Health Center II ───────────────────────────────────
  HC2: {
    label: 'Health Center II',
    description: 'Outpatient only, no lab, no maternity. Serves ~5,000 catchment population.',
    modules: ['dashboard', 'patients', 'opd', 'pharmacy', 'billing'],
    tiers: {
      ordinary: { price: 200000, priceLabel: 'UGX 200,000/yr', features: [
        'Patient registration + OPD numbers',
        'OPD: triage + diagnosis + prescription',
        'Pharmacy: essential medicines inventory',
        'Billing: nominal fees + waivers',
        'Single-terminal',
        'Email support',
      ]},
      premium: { price: 400000, priceLabel: 'UGX 400,000/yr', features: [
        'All Ordinary features',
        'HMIS/DHIS2 reporting to Ministry of Health',
        'Stock outage alerts to district',
        'Multi-terminal (up to 3)',
        'WhatsApp support',
      ]},
    },
  },

  // ─── Health Center III (with maternity) ─────────────────
  HC3: {
    label: 'Health Center III',
    description: 'OPD + maternity + basic lab. Serves ~10,000 catchment. Has 8-20 beds for maternity + observation.',
    modules: ['dashboard', 'patients', 'opd', 'pharmacy', 'lab', 'billing', 'ipd'],
    tiers: {
      ordinary: { price: 300000, priceLabel: 'UGX 300,000/yr', features: [
        'Patient registration + ANC + PNC',
        'OPD + maternity triage',
        'Pharmacy + lab (HIV, malaria, glucose)',
        'IPD: maternity + observation beds',
        'Billing: fees + waivers',
        'Single-terminal',
        'Email support',
      ]},
      premium: { price: 600000, priceLabel: 'UGX 600,000/yr', features: [
        'All Ordinary features',
        'HMIS/DHIS2 + maternal death surveillance (MPDR)',
        'Birth registration integration (NIRA)',
        'Multi-terminal (up to 5)',
        'WhatsApp + call support',
      ]},
    },
  },

  // ─── Health Center IV (with theatre) ────────────────────
  HC4: {
    label: 'Health Center IV',
    description: 'Mini-hospital: OPD + maternity + lab + theatre + blood bank. Serves ~100,000. Has 30-50 beds.',
    modules: ['dashboard', 'patients', 'opd', 'pharmacy', 'lab', 'billing', 'ipd', 'theatre', 'bloodbank'],
    tiers: {
      ordinary: { price: 400000, priceLabel: 'UGX 400,000/yr', features: [
        'Patient registration + admissions',
        'OPD + emergency triage',
        'Pharmacy + lab (full panel)',
        'IPD: 30-50 beds + ward management',
        'Theatre: basic operations (C-section, hernia)',
        'Billing + insurance',
        'Single-terminal',
        'Email support',
      ]},
      premium: { price: 800000, priceLabel: 'UGX 800,000/yr', features: [
        'All Ordinary features',
        'HMIS/DHIS2 + surgery log + maternal surveillance',
        'Blood bank inventory + donor tracking',
        'Multi-terminal (up to 10)',
        'Telemedicine + specialist referrals',
        'WhatsApp + priority call support',
      ]},
    },
  },

  // ─── General Hospital ───────────────────────────────────
  GeneralHospital: {
    label: 'General Hospital',
    description: 'Full referral hospital: all specialties, ICU, radiology, full lab, pharmacy + surgical theatre. 100+ beds.',
    modules: ['dashboard', 'patients', 'opd', 'pharmacy', 'lab', 'billing', 'ipd', 'theatre', 'radiology', 'icu', 'bloodbank', 'specialists'],
    tiers: {
      ordinary: { price: 600000, priceLabel: 'UGX 600,000/yr', features: [
        'Patient registration + admissions + referrals',
        'OPD + emergency + 24hr triage',
        'Pharmacy + full lab + radiology',
        'IPD: 100+ beds + ward management',
        'Theatre + ICU + blood bank',
        'Specialist scheduling (visiting consultants)',
        'Billing + insurance (NHIS + private)',
        'Single-terminal',
        'Email support',
      ]},
      premium: { price: 1200000, priceLabel: 'UGX 1,200,000/yr', features: [
        'All Ordinary features',
        'HMIS/DHIS2 + patient safety + adverse event tracking',
        'Multi-hospital network (up to 5 facilities)',
        'PACS integration (radiology images)',
        'HL7/FHIR interoperability with NMS, NDA',
        'Unlimited terminals',
        '24/7 priority call + WhatsApp support',
        'Free updates for 1 year',
      ]},
    },
  },
};

// Helper: list all facility types for the selector dropdown
export function getFacilityTypes() {
  return Object.entries(HEALTH_FACILITY_TYPES).map(([key, config]) => ({
    key,
    label: config.label,
    description: config.description,
    modules: config.modules,
    tiers: config.tiers,
  }));
}

// Helper: get a single facility type
export function getFacilityType(key) {
  return HEALTH_FACILITY_TYPES[key] || null;
}

// Helper: get modules allowed for a facility type
export function getFacilityModules(key) {
  return HEALTH_FACILITY_TYPES[key]?.modules || [];
}

// Helper: get pricing for a facility type + tier
export function getFacilityPricing(key, tier = 'ordinary') {
  const facility = HEALTH_FACILITY_TYPES[key];
  if (!facility) return null;
  return facility.tiers[tier] || facility.tiers.ordinary;
}
