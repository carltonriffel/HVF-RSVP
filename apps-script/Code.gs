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

// The PUBLIC URL of your deployed RSVP app (Webflow Cloud), used for the buttons
// in the invite & confirmation emails. Include the mount path, no trailing slash.
// Example: 'https://your-site.com/planner-rsvp'
var APP_URL = 'https://www.happyvalleyfarms.com/planner-rsvp';

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

    // Email the guest a summary of their submission. Never fail the save if the
    // email can't be sent.
    try {
      sendConfirmationEmail(rowToAttendee(d.header, rowValues));
    } catch (mailErr) {
      if (typeof console !== 'undefined' && console.log) console.log('confirm mail: ' + mailErr);
    }

    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// ===========================================================================
// EMAILS
// ---------------------------------------------------------------------------
// 1. Invite email — sent when the `send_invite` checkbox is ticked.
//      Set up once: Apps Script editor → Triggers (clock icon) → Add Trigger →
//      Function: onSheetEdit, Event source: From spreadsheet, Type: On edit →
//      Save → authorize. (An installable trigger is required; a simple onEdit
//      cannot send email.) Optional: add an `invite_sent_at` column and the
//      script will stamp it and never double-send.
// 2. Confirmation email — sent automatically after each RSVP submission.
// Both use APP_URL (set above) for their buttons, with ?email= so the app
// looks the guest up immediately.
// ===========================================================================

/** The RSVP link for a guest, pre-loaded with their email. */
function rsvpLink(email) {
  return APP_URL + '?email=' + encodeURIComponent(email || '');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Shared branded email wrapper (logo header + cream card + footer). */
function emailShell(innerHtml) {
  var logo =
    'https://cdn.prod.website-files.com/65df7ac34fd99d356d984e76/6a21a1bbbdba9a37327c439b_Event%20Logo%20over%20horizontal.png';
  return (
    '<div style="margin:0;padding:0;background:#0f2417;">' +
    '<div style="max-width:600px;margin:0 auto;padding:26px 0;font-family:Georgia,\'Times New Roman\',serif;">' +
    '<div style="text-align:center;padding:6px 24px 18px;">' +
    '<img src="' + logo + '" alt="Happy Valley Farms" width="200" style="max-width:58%;height:auto;" />' +
    '</div>' +
    '<div style="background:#f6f1e4;border-radius:6px;margin:0 16px;padding:32px 30px;color:#26302a;">' +
    innerHtml +
    '</div>' +
    '<div style="text-align:center;color:#9db3a2;font-size:12px;font-style:italic;padding:18px 24px;">' +
    'Happy Valley Farms · 490 Hutcheson Dr, Rossville GA 30741' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/** A bulletproof-ish gold button. */
function emailButton(label, url) {
  return (
    '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">' +
    '<tr><td style="border-radius:6px;background:#b9974f;">' +
    '<a href="' + url + '" style="display:inline-block;padding:13px 32px;font-family:Georgia,serif;' +
    'font-size:16px;color:#2a2412;text-decoration:none;font-weight:bold;letter-spacing:0.03em;">' +
    label +
    '</a></td></tr></table>'
  );
}

function firstNameOf(name) {
  var f = String(name || '').trim().split(/\s+/)[0];
  return f || 'there';
}

// ---------------------------------------------------------------------------
// Invite email
// ---------------------------------------------------------------------------
function sendInviteEmail(att) {
  if (!att || !att.email) return;
  var first = firstNameOf(att.name);
  var link = rsvpLink(att.email);

  var inner =
    '<p style="text-transform:uppercase;letter-spacing:0.22em;font-size:11px;color:#b9974f;text-align:center;margin:0 0 6px;">You are cordially invited</p>' +
    '<h1 style="text-align:center;font-size:26px;font-weight:500;color:#14311f;margin:0 0 4px;">Event Planner Retreat</h1>' +
    '<p style="text-align:center;font-style:italic;color:#5a655c;margin:0 0 22px;">A private two-day gathering · Aug 3rd–4th</p>' +
    '<p style="font-size:16px;line-height:1.6;margin:0 0 14px;">Dear ' + escapeHtml(first) + ',</p>' +
    '<p style="font-size:16px;line-height:1.6;margin:0 0 14px;">By now, a printed invitation should have arrived in your mailbox. We wanted to reach out personally — we are so glad to welcome you to Happy Valley Farms, and we can’t wait for you to experience the estate, the farm, and everything we have planned firsthand.</p>' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 6px;color:#5a655c;"><strong style="color:#14311f;">What to expect:</strong> Two unhurried days of curated hospitality — farm-to-table dinners, paddleboarding on the river, a helicopter tour over Lula Lake, plein air painting, bouquet crafting, a poolside yoga &amp; sound bath, and the best of Chattanooga’s food and views, all in the company of fellow planners.</p>' +
    emailButton('RSVP Now', link) +
    '<p style="text-align:center;font-style:italic;color:#7c2b2b;font-size:14px;margin:2px 0 0;">Kindly reply by July 13th.</p>';

  MailApp.sendEmail({
    to: att.email,
    name: 'Happy Valley Farms',
    subject: 'You’re Invited — Event Planner Retreat at Happy Valley Farms',
    htmlBody: emailShell(inner),
    body:
      'Dear ' + first + ',\n\nYou are invited to the Event Planner Retreat at Happy Valley Farms, ' +
      'Aug 3rd–4th. Please RSVP here: ' + link + '\n\nKindly reply by July 13th.',
  });
}

// ---------------------------------------------------------------------------
// Confirmation email (summary of what the guest submitted)
// ---------------------------------------------------------------------------
function sendConfirmationEmail(att) {
  if (!att || !att.email) return;
  var first = firstNameOf(att.name);
  var link = rsvpLink(att.email);
  var r = att.responses || {};

  var rows = [];
  var add = function (label, val) {
    if (val != null && String(val).trim() !== '') rows.push([label, String(val)]);
  };
  add('RSVP', r.rsvpStatus);
  add('Days', r.attendingDays);
  add('Arrival', [r.arrivalDate, r.arrivalTime].filter(function (x) { return x; }).join(' · '));
  add('Departure', [r.departureDate, r.departureTime].filter(function (x) { return x; }).join(' · '));
  add('Travel', r.travelMode);
  add('Airport transportation', r.needTransportation);
  add('Needs lodging', r.needHotel);
  add('Preferred lodging', r.preferredLodging);

  var labelMap = {
    picnicPaddleboarding: 'Picnic & Paddleboarding',
    pleinAirPainting: 'Plein Air Painting',
    petalParty: 'Petal Party',
    vegetableHarvesting: 'Vegetable Harvesting',
    helicopterTour: 'Helicopter Tour',
    progressiveDinner: 'Progressive Dinner',
    nightSwim: 'Night Swim',
    breakfast: 'Breakfast',
    yogaSoundBath: 'Yoga & Sound Bath',
    brunchSocial: 'Brunch Social',
    chattanoogaShuttleTour: 'Chattanooga Shuttle Tour',
    farewellFeast: 'Farewell Feast',
  };
  var A = r.activities || {};
  var joining = [];
  Object.keys(labelMap).forEach(function (k) {
    if (A[k] === 'Yes') joining.push(labelMap[k]);
  });
  add('Joining', joining.join(', '));
  add('Dietary restrictions', r.foodRestrictions);
  add('Food allergies', r.foodAllergies);
  add('Alcohol', r.alcoholPreference);
  add('Notes', r.miscNote);

  var tableRows = rows
    .map(function (p) {
      return (
        '<tr>' +
        '<td style="padding:7px 0;border-bottom:1px solid #e3dcc7;color:#5a655c;font-size:14px;vertical-align:top;width:44%;">' +
        escapeHtml(p[0]) +
        '</td>' +
        '<td style="padding:7px 0;border-bottom:1px solid #e3dcc7;color:#14311f;font-size:14px;font-weight:500;">' +
        escapeHtml(p[1]) +
        '</td></tr>'
      );
    })
    .join('');

  var inner =
    '<p style="text-transform:uppercase;letter-spacing:0.22em;font-size:11px;color:#b9974f;text-align:center;margin:0 0 6px;">RSVP Received</p>' +
    '<h1 style="text-align:center;font-size:26px;font-weight:500;color:#14311f;margin:0 0 16px;">Thank you, ' + escapeHtml(first) + '.</h1>' +
    '<p style="font-size:16px;line-height:1.6;margin:0 0 16px;">We’ve received your RSVP for the Event Planner Retreat at Happy Valley Farms. Here’s a summary of what you shared:</p>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0;">' +
    tableRows +
    '</table>' +
    '<p style="font-size:15px;line-height:1.6;margin:18px 0 0;color:#5a655c;">Need to make a change? You can update your RSVP any time before the deadline.</p>' +
    emailButton('Edit My RSVP', link) +
    '<p style="text-align:center;font-style:italic;color:#7c2b2b;font-size:14px;margin:0;">Please finalize by July 13th.</p>';

  MailApp.sendEmail({
    to: att.email,
    name: 'Happy Valley Farms',
    subject: 'Your RSVP — Event Planner Retreat at Happy Valley Farms',
    htmlBody: emailShell(inner),
    body:
      'Thank you, ' + first + '. We’ve received your RSVP for the Event Planner Retreat at ' +
      'Happy Valley Farms. You can review or edit it any time before July 13th here: ' + link,
  });
}

// ---------------------------------------------------------------------------
// Installable On-Edit trigger: send an invite when send_invite is checked.
// ---------------------------------------------------------------------------
function onSheetEdit(e) {
  try {
    var range = e && e.range;
    if (!range) return;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;
    var row = range.getRow();
    if (row === 1) return; // header

    var header = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0]
      .map(function (h) { return normalizeHeader(String(h)); });

    var siCol = colIndex(header, 'send_invite');
    if (siCol < 0) return;
    if (range.getColumn() !== siCol + 1) return; // edit wasn't the send_invite column
    if (range.getValue() !== true) return; // only act when it becomes checked

    var rowValues = sheet.getRange(row, 1, 1, header.length).getValues()[0];
    var att = rowToAttendee(header, rowValues);
    if (!att.email) return;

    // If an invite_sent_at column exists and is already filled, don't resend.
    var sentCol = colIndex(header, 'invite_sent_at');
    if (sentCol >= 0 && String(rowValues[sentCol] || '').trim() !== '') return;

    sendInviteEmail(att);

    if (sentCol >= 0) {
      sheet.getRange(row, sentCol + 1).setValue(new Date().toISOString());
    }
  } catch (err) {
    if (typeof console !== 'undefined' && console.log) console.log('onSheetEdit error: ' + err);
  }
}
