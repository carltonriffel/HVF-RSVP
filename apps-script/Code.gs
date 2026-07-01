/**
 * Happy Valley Farms – Planner Retreat RSVP backend (Google Apps Script)
 * ---------------------------------------------------------------------------
 * This script IS the database connection. It runs inside your Google Sheet, so
 * there is no service account, no JSON key, and no private key to manage.
 *
 * It reads the header row (row 1) as the definitive column mapping, so the
 * columns can be in any order as long as the header names match. Guests are
 * identified by primary_email (or alternate_email). The RSVP form only writes
 * the response columns — admin/CRM columns (address, gift, num_invited,
 * sv_notes, ty_note_sent, etc.) are never touched.
 *
 * need_hotel and need_transportation are stored as true/false checkboxes.
 *
 * SETUP (about 5 minutes):
 *   1. Open your Google Sheet.
 *   2. Extensions → Apps Script. Delete anything in the editor.
 *   3. Paste this entire file. Save (the disk icon).
 *   4. Change SHARED_SECRET below to a long random string of your own.
 *   5. Deploy → New deployment → type "Web app":
 *        - Execute as:  Me
 *        - Who has access: Anyone
 *      Deploy, authorize, and COPY the "Web app" URL.
 *   6. In the Next.js app set:
 *        APPS_SCRIPT_URL    = the Web app URL
 *        APPS_SCRIPT_SECRET = the same SHARED_SECRET string
 *
 * WHEN YOU EDIT THIS SCRIPT LATER: Deploy → Manage deployments → edit (pencil)
 * → Version: New version → Deploy. The URL stays the same.
 * ---------------------------------------------------------------------------
 */

// CHANGE THIS to your own long random string, and use the same value for
// APPS_SCRIPT_SECRET in the Next.js app.
var SHARED_SECRET = 'CHANGE_ME_to_a_long_random_string';

// The tab (worksheet) that holds invites & responses.
var SHEET_NAME = 'Invites_RSVPs';

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
function doGet(e) {
  return handle(e.parameter || {});
}

function doPost(e) {
  var params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter || {};
  }
  return handle(params);
}

function handle(params) {
  try {
    if (String(params.secret || '') !== SHARED_SECRET) {
      return json({ ok: false, error: 'Unauthorized' });
    }
    if (params.action === 'lookup') return json(doLookup(params));
    if (params.action === 'submit') return json(doSubmit(params));
    return json({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------
function getSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Worksheet "' + SHEET_NAME + '" not found.');
  return sheet;
}

function readData() {
  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();
  var header = (values[0] || []).map(function (h) {
    return normalizeHeader(String(h));
  });
  return { sheet: sheet, header: header, rows: values.slice(1) };
}

function normalizeHeader(s) {
  return String(s).toLowerCase().replace(/\s+/g, '_').trim();
}
function normEmail(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}
function colIndex(header, name) {
  return header.indexOf(normalizeHeader(name));
}
/** Trimmed string value of a cell by header name. */
function cell(header, row, name) {
  var i = colIndex(header, name);
  return i >= 0 && row[i] != null ? String(row[i]).trim() : '';
}
/** Raw (untrimmed, un-stringified) cell value – used for checkbox booleans. */
function rawCell(header, row, name) {
  var i = colIndex(header, name);
  return i >= 0 ? row[i] : '';
}

/** Value from the first matching header name (handles renamed/typo'd columns). */
function cellAny(header, row, names) {
  for (var i = 0; i < names.length; i++) {
    var idx = colIndex(header, names[i]);
    if (idx >= 0) return row[idx] != null ? String(row[idx]).trim() : '';
  }
  return '';
}

/** Read a checkbox/boolean cell as 'Yes' / 'No' / '' (blank = unanswered). */
function boolToYesNo(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'true' || s === 'yes' || s === 'y' || s === '1') return 'Yes';
  if (s === 'false' || s === 'no' || s === 'n' || s === '0') return 'No';
  return '';
}
/** Convert a 'Yes' / 'No' answer to a boolean, or null to leave unchanged. */
function yesNoToBool(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'yes' || s === 'true' || s === 'y' || s === '1') return true;
  if (s === 'no' || s === 'false' || s === 'n' || s === '0') return false;
  return null;
}

/** Returns the 0-based data row index, or -1. Matches primary/alternate email. */
function findRowIndex(header, rows, id) {
  var pe = colIndex(header, 'primary_email');
  var ae = colIndex(header, 'alternate_email');
  var wEmail = id.email ? normEmail(id.email) : '';
  if (!wEmail) return -1;

  for (var i = 0; i < rows.length; i++) {
    if (isEmptyRow(rows[i])) continue; // do not ingest empty rows
    var p = pe >= 0 ? normEmail(rows[i][pe]) : '';
    var a = ae >= 0 ? normEmail(rows[i][ae]) : '';
    if ((p && p === wEmail) || (a && a === wEmail)) return i;
  }
  return -1;
}

function isEmptyRow(row) {
  for (var i = 0; i < row.length; i++) {
    if (String(row[i] == null ? '' : row[i]).trim() !== '') return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------
function doLookup(params) {
  var d = readData();
  var i = findRowIndex(d.header, d.rows, params);
  if (i < 0) return { ok: false, notFound: true };
  return { ok: true, attendee: rowToAttendee(d.header, d.rows[i]) };
}

function rowToAttendee(header, row) {
  var c = function (name) {
    return cell(header, row, name);
  };
  return {
    email: c('primary_email'),
    alternateEmail: c('alternate_email'),
    name: c('primary_name'),
    company: c('company_name'),
    phone: c('phone'),
    responses: {
      name: c('primary_name'),
      company: c('company_name'),
      email: c('primary_email'),
      phone: c('phone'),
      industry: c('industry'),
      street: cellAny(header, row, ['street', 'address']),
      street2: cellAny(header, row, ['street_2', 'stree_2', 'apt']),
      cityState: c('city_state'),
      zip: cellAny(header, row, ['zip_code', 'zip']),
      rsvpStatus: c('rsvp_status'),
      attendingDays: c('attending_days'),
      arrivalDate: c('arrival_date'),
      arrivalTime: c('arrival_time'),
      travelMode: c('travel_mode'),
      departureDate: c('departure_date'),
      departureTime: c('departure_time'),
      needTransportation: boolToYesNo(rawCell(header, row, 'need_transportation')),
      parkingShuttleNotes: c('parking_shuttle_notes'),
      needHotel: boolToYesNo(rawCell(header, row, 'need_hotel')),
      preferredLodging: c('preferred_lodging'),
      accommodationNotes: c('accommodation_notes'),
      activities: {
        picnicPaddleboarding: c('picnic_paddleboarding'),
        pleinAirPainting: c('plein_air_painting'),
        petalParty: c('petal_party'),
        vegetableHarvesting: c('vegetable_harvesting'),
        helicopterTour: c('helicopter_tour'),
        progressiveDinner: c('progressive_dinner'),
        nightSwim: c('night_swim'),
        breakfast: c('breakfast'),
        yogaSoundBath: c('yoga_sound_bath'),
        brunchSocial: c('brunch_social'),
        chattanoogaShuttleTour: c('chattanooga_shuttle_tour'),
        farewellFeast: c('farewell_feast')
      },
      foodRestrictions: c('food_restrictions'),
      foodAllergies: c('food_allergies'),
      alcoholPreference: c('alcohol_preference'),
      miscNote: c('misc_note')
    }
  };
}

// ---------------------------------------------------------------------------
// Submit (update exactly one row)
// ---------------------------------------------------------------------------
function doSubmit(params) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000); // avoid two people saving the same row at once
  try {
    var d = readData();
    var i = findRowIndex(d.header, d.rows, params);
    if (i < 0) return { ok: false, notFound: true };

    var rowNumber = i + 2; // +1 header, +1 for 1-based rows
    var r = params.responses || {};
    var a = r.activities || {};

    // Only these columns can change. Everything else (identity + admin/CRM
    // columns like address, gift, num_invited, sv_notes) is preserved.
    var updates = {
      phone: r.phone,
      rsvp_status: r.rsvpStatus,
      attending_days: r.attendingDays,
      arrival_date: r.arrivalDate,
      arrival_time: r.arrivalTime,
      travel_mode: r.travelMode,
      departure_date: r.departureDate,
      departure_time: r.departureTime,
      need_transportation: yesNoToBool(r.needTransportation), // checkbox
      parking_shuttle_notes: r.parkingShuttleNotes,
      need_hotel: yesNoToBool(r.needHotel), // checkbox
      preferred_lodging: r.preferredLodging,
      accommodation_notes: r.accommodationNotes,
      picnic_paddleboarding: a.picnicPaddleboarding,
      plein_air_painting: a.pleinAirPainting,
      petal_party: a.petalParty,
      vegetable_harvesting: a.vegetableHarvesting,
      helicopter_tour: a.helicopterTour,
      progressive_dinner: a.progressiveDinner,
      night_swim: a.nightSwim,
      breakfast: a.breakfast,
      yoga_sound_bath: a.yogaSoundBath,
      brunch_social: a.brunchSocial,
      chattanooga_shuttle_tour: a.chattanoogaShuttleTour,
      farewell_feast: a.farewellFeast,
      food_restrictions: r.foodRestrictions,
      food_allergies: r.foodAllergies,
      alcohol_preference: r.alcoholPreference,
      misc_note: r.miscNote
    };

    // Start from the existing row so untouched columns are preserved.
    var rowValues = d.rows[i].slice();
    while (rowValues.length < d.header.length) rowValues.push('');

    var setCol = function (name, value) {
      var ci = colIndex(d.header, name);
      if (ci >= 0 && value != null) {
        rowValues[ci] = typeof value === 'boolean' ? value : String(value);
      }
    };

    Object.keys(updates).forEach(function (name) {
      setCol(name, updates[name]);
    });

    // Contact / company / address / industry are editable, but only overwrite
    // when the guest provided a non-blank value — never wipe existing data with
    // an empty submit. setColAny writes to the first matching column name.
    var setColAny = function (names, value) {
      if (value == null || String(value).trim() === '') return;
      for (var k = 0; k < names.length; k++) {
        var ci = colIndex(d.header, names[k]);
        if (ci >= 0) {
          rowValues[ci] = String(value).trim();
          return;
        }
      }
    };
    setColAny(['primary_name'], r.name);
    setColAny(['company_name'], r.company);
    setColAny(['primary_email'], r.email);
    setColAny(['industry'], r.industry);
    setColAny(['street', 'address'], r.street);
    setColAny(['street_2', 'stree_2', 'apt'], r.street2);
    setColAny(['city_state'], r.cityState);
    setColAny(['zip_code', 'zip'], r.zip);

    // submitted_at only the first time; last_updated always.
    var now = new Date().toISOString();
    var subI = colIndex(d.header, 'submitted_at');
    if (subI >= 0) {
      var existing = String(d.rows[i][subI] == null ? '' : d.rows[i][subI]).trim();
      if (!existing) rowValues[subI] = now;
    }
    setCol('last_updated', now);

    d.sheet.getRange(rowNumber, 1, 1, d.header.length).setValues([rowValues]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
