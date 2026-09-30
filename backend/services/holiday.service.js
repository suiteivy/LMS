const supabase = require('../utils/supabaseClient.js');
const { logRecordChange } = require('../utils/auditLogger.js');

const EAST_AFRICAN_COUNTRIES = [
  { code: 'KE', name: 'Kenya' },
  { code: 'UG', name: 'Uganda' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'BI', name: 'Burundi' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SO', name: 'Somalia' },
];

const VALID_COUNTRY_CODES = new Set(EAST_AFRICAN_COUNTRIES.map((c) => c.code));

/**
 * Curated statutory and public holidays for the 8 East African countries (2026 & 2027)
 */
const REFERENCE_HOLIDAYS = [
  // ================= KENYA (KE) =================
  { country_code: 'KE', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'KE', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'KE', holiday_date: '2026-06-01', name: 'Madaraka Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-10-10', name: 'Mazingira Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-10-20', name: 'Mashujaa Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-12-12', name: 'Jamhuri Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2026-12-26', name: 'Utamaduni Day', type: 'public', is_provisional: false },

  { country_code: 'KE', holiday_date: '2027-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-03-10', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'KE', holiday_date: '2027-03-26', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-03-29', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-05-17', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'KE', holiday_date: '2027-06-01', name: 'Madaraka Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-10-10', name: 'Mazingira Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-10-20', name: 'Mashujaa Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-12-12', name: 'Jamhuri Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'KE', holiday_date: '2027-12-26', name: 'Utamaduni Day', type: 'public', is_provisional: false },

  // ================= UGANDA (UG) =================
  { country_code: 'UG', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-01-26', name: 'NRM Liberation Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-02-16', name: 'Archbishop Janani Luwum Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-03-08', name: "International Women's Day", type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'UG', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'UG', holiday_date: '2026-06-03', name: "Martyrs' Day", type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-06-09', name: 'National Heroes Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-10-09', name: 'Independence Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'UG', holiday_date: '2026-12-26', name: 'Boxing Day', type: 'public', is_provisional: false },

  // ================= TANZANIA (TZ) =================
  { country_code: 'TZ', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-01-12', name: 'Zanzibar Revolution Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'TZ', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-04-07', name: 'Karume Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-04-26', name: 'Union Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-05-01', name: 'Workers Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'TZ', holiday_date: '2026-07-07', name: 'Saba Saba', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-08-08', name: 'Nane Nane (Farmers Day)', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-10-14', name: 'Nyerere Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-12-09', name: 'Republic Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'TZ', holiday_date: '2026-12-26', name: 'Boxing Day', type: 'public', is_provisional: false },

  // ================= RWANDA (RW) =================
  { country_code: 'RW', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-01-02', name: 'New Year Holiday', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-02-01', name: 'National Heroes Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'RW', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-04-07', name: 'Tutsi Genocide Memorial Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'RW', holiday_date: '2026-07-01', name: 'Independence Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-07-04', name: 'Liberation Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-08-07', name: 'Umuganura Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-08-15', name: 'Assumption Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'RW', holiday_date: '2026-12-26', name: 'Boxing Day', type: 'public', is_provisional: false },

  // ================= BURUNDI (BI) =================
  { country_code: 'BI', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-02-05', name: 'Unity Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-05-14', name: 'Ascension Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-07-01', name: 'Independence Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-08-15', name: 'Assumption Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-10-13', name: 'Rwagasore Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-10-21', name: 'Ndadaye Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-11-01', name: 'All Saints Day', type: 'public', is_provisional: false },
  { country_code: 'BI', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },

  // ================= SOUTH SUDAN (SS) =================
  { country_code: 'SS', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'SS', holiday_date: '2026-04-03', name: 'Good Friday', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-04-06', name: 'Easter Monday', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-05-16', name: 'SPLA Day', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'SS', holiday_date: '2026-07-09', name: 'Independence Day', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-07-30', name: "Martyrs' Day", type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-12-25', name: 'Christmas Day', type: 'public', is_provisional: false },
  { country_code: 'SS', holiday_date: '2026-12-26', name: 'Boxing Day', type: 'public', is_provisional: false },

  // ================= ETHIOPIA (ET) =================
  { country_code: 'ET', holiday_date: '2026-01-07', name: 'Genna (Ethiopian Christmas)', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-01-19', name: 'Timkat (Epiphany)', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-03-02', name: 'Victory of Adwa Day', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'ET', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-05-05', name: "Patriots' Victory Day", type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'ET', holiday_date: '2026-05-28', name: 'Derg Downfall Day', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-09-11', name: 'Enkutatash (Ethiopian New Year)', type: 'public', is_provisional: false },
  { country_code: 'ET', holiday_date: '2026-09-27', name: 'Meskel', type: 'public', is_provisional: false },

  // ================= SOMALIA (SO) =================
  { country_code: 'SO', holiday_date: '2026-01-01', name: "New Year's Day", type: 'public', is_provisional: false },
  { country_code: 'SO', holiday_date: '2026-03-20', name: 'Eid al-Fitr', type: 'public', is_provisional: true },
  { country_code: 'SO', holiday_date: '2026-05-01', name: 'Labour Day', type: 'public', is_provisional: false },
  { country_code: 'SO', holiday_date: '2026-05-27', name: 'Eid al-Adha', type: 'public', is_provisional: true },
  { country_code: 'SO', holiday_date: '2026-06-26', name: 'Independence Day', type: 'public', is_provisional: false },
  { country_code: 'SO', holiday_date: '2026-07-01', name: 'Republic Day', type: 'public', is_provisional: false },
  { country_code: 'SO', holiday_date: '2026-10-12', name: 'Flag Day', type: 'public', is_provisional: false },
  { country_code: 'SO', holiday_date: '2026-10-24', name: 'Ashura', type: 'public', is_provisional: true },
];

/**
 * Seed or refresh national_holidays reference dataset in the database
 */
async function seedNationalHolidays() {
  const records = REFERENCE_HOLIDAYS.map((h) => {
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return {
      country_code: h.country_code,
      holiday_date: h.holiday_date,
      name: h.name,
      type: h.type || 'public',
      is_provisional: Boolean(h.is_provisional),
      external_key: `${h.country_code}_${h.holiday_date}_${slug}`,
    };
  });

  const { error } = await supabase
    .from('national_holidays')
    .upsert(records, { onConflict: 'external_key' });

  if (error && error.code !== '42P01') {
    console.error('[HolidayService] Error seeding national holidays:', error);
  }
}

/**
 * Resolve country code for an institution (defaults to 'KE')
 */
async function getInstitutionCountry(institutionId) {
  if (!institutionId) return 'KE';
  const { data, error } = await supabase
    .from('institutions')
    .select('country')
    .eq('id', institutionId)
    .single();

  if (error || !data || !data.country) return 'KE';
  const c = String(data.country).toUpperCase().trim();
  return VALID_COUNTRY_CODES.has(c) ? c : 'KE';
}

/**
 * Get all national holidays with decision overlay for an institution
 */
async function getHolidaysForInstitution(institutionId, options = {}) {
  const country = options.country_code || (await getInstitutionCountry(institutionId));

  // Ensure reference table is populated
  const { data: refHolidays, error: refError } = await supabase
    .from('national_holidays')
    .select('*')
    .eq('country_code', country)
    .order('holiday_date', { ascending: true });

  if (refError && refError.code === '42P01') {
    return [];
  }

  if (!refHolidays || refHolidays.length === 0) {
    // If not seeded yet, seed and retry once
    await seedNationalHolidays();
    const { data: retried } = await supabase
      .from('national_holidays')
      .select('*')
      .eq('country_code', country)
      .order('holiday_date', { ascending: true });
    if (!retried || retried.length === 0) return [];
  }

  // Fetch institution decisions
  const { data: decisions } = await supabase
    .from('institution_holiday_decisions')
    .select('*')
    .eq('institution_id', institutionId);

  const decisionMap = new Map();
  (decisions || []).forEach((d) => {
    decisionMap.set(d.national_holiday_id, d);
  });

  let holidays = (refHolidays || []).map((h) => {
    const dec = decisionMap.get(h.id);
    const decisionStatus = dec?.decision || 'pending';
    const isHidden = Boolean(dec?.is_hidden);
    const cancelsClasses = decisionStatus === 'cancel_classes';

    return {
      id: h.id,
      national_holiday_id: h.id,
      country_code: h.country_code,
      holiday_date: h.holiday_date,
      name: h.name,
      type: h.type,
      is_provisional: h.is_provisional,
      decision: decisionStatus,
      decision_id: dec?.id || null,
      notes: dec?.notes || null,
      is_hidden: isHidden,
      cancels_classes: cancelsClasses,
      is_pending_decision: decisionStatus === 'pending',
    };
  });

  if (options.startDate) {
    holidays = holidays.filter((h) => h.holiday_date >= options.startDate);
  }
  if (options.endDate) {
    holidays = holidays.filter((h) => h.holiday_date <= options.endDate);
  }
  if (options.year) {
    const yStr = String(options.year);
    holidays = holidays.filter((h) => h.holiday_date.startsWith(yStr));
  }
  if (options.month) {
    const mStr = String(options.month).padStart(2, '0');
    holidays = holidays.filter((h) => h.holiday_date.slice(5, 7) === mStr);
  }

  return holidays;
}

/**
 * Sync national holidays for an institution.
 * Invariant: Defaults to 'pending'. NEVER silently cancels classes!
 */
async function syncHolidaysForInstitution(institutionId, countryCode = null, userId = null) {
  if (!institutionId) throw new Error('institutionId is required');

  let activeCountry = countryCode;
  if (!activeCountry) {
    activeCountry = await getInstitutionCountry(institutionId);
  } else {
    activeCountry = String(activeCountry).toUpperCase().trim();
    if (!VALID_COUNTRY_CODES.has(activeCountry)) {
      throw new Error(`Invalid country code. Supported countries: ${Array.from(VALID_COUNTRY_CODES).join(', ')}`);
    }
    // Update institution country
    await supabase
      .from('institutions')
      .update({ country: activeCountry })
      .eq('id', institutionId);
  }

  await seedNationalHolidays();

  const { data: holidays, error: hError } = await supabase
    .from('national_holidays')
    .select('id')
    .eq('country_code', activeCountry);

  if (hError) throw hError;

  if (holidays && holidays.length > 0) {
    const decisionRows = holidays.map((h) => ({
      institution_id: institutionId,
      national_holiday_id: h.id,
      decision: 'pending',
      is_hidden: false,
    }));

    // Insert pending decisions (ignore conflicts so existing decisions are preserved)
    await supabase
      .from('institution_holiday_decisions')
      .upsert(decisionRows, { onConflict: 'institution_id,national_holiday_id', ignoreDuplicates: true });
  }

  return getHolidaysForInstitution(institutionId, { country_code: activeCountry });
}

/**
 * Set decision on a national holiday for an institution
 * decision: 'pending' | 'cancel_classes' | 'run_classes'
 */
async function setHolidayDecision(institutionId, nationalHolidayId, decision, notes = null, userId = null) {
  if (!['pending', 'cancel_classes', 'run_classes'].includes(decision)) {
    throw new Error("Invalid decision. Must be 'pending', 'cancel_classes', or 'run_classes'.");
  }

  const { data: holiday, error: hErr } = await supabase
    .from('national_holidays')
    .select('*')
    .eq('id', nationalHolidayId)
    .single();

  if (hErr || !holiday) {
    throw new Error('National holiday not found');
  }

  // Fetch previous decision for audit logging
  const { data: previousDecision } = await supabase
    .from('institution_holiday_decisions')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('national_holiday_id', nationalHolidayId)
    .maybeSingle();

  const { data: savedDecision, error: saveErr } = await supabase
    .from('institution_holiday_decisions')
    .upsert({
      institution_id: institutionId,
      national_holiday_id: nationalHolidayId,
      decision,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'institution_id,national_holiday_id' })
    .select()
    .single();

  if (saveErr) throw saveErr;

  if (userId) {
    await logRecordChange({
      institution_id: institutionId,
      table_name: 'institution_holiday_decisions',
      record_id: savedDecision.id,
      changed_by: userId,
      change_type: previousDecision ? 'UPDATE' : 'CREATE',
      old_values: previousDecision ? { decision: previousDecision.decision, notes: previousDecision.notes } : null,
      new_values: { decision, notes },
      reason: `Holiday decision updated to ${decision} for ${holiday.name} on ${holiday.holiday_date}`,
    });
  }

  return {
    ...holiday,
    decision,
    decision_id: savedDecision.id,
    notes,
    cancels_classes: decision === 'cancel_classes',
    is_pending_decision: decision === 'pending',
  };
}

module.exports = {
  EAST_AFRICAN_COUNTRIES,
  VALID_COUNTRY_CODES,
  REFERENCE_HOLIDAYS,
  seedNationalHolidays,
  getInstitutionCountry,
  getHolidaysForInstitution,
  syncHolidaysForInstitution,
  setHolidayDecision,
};
