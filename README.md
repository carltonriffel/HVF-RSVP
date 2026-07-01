# Happy Valley Farms — Planner Retreat RSVP

A small, polished Next.js app for the invite-only **Event Planner Retreat at Happy
Valley Farms**. Invited planners open a personal link (or look themselves up by
email), review the itinerary, complete or update their RSVP, and their answers
are saved directly to a Google Sheet.

- **No accounts / logins.** Guests are recognized by the email on their invitation.
- **Google Sheet is the database** — connected through a Google Apps Script that
  lives inside the sheet. No service account, no API keys, no private key.
- **Credentials stay on the server.** The browser never sees the script URL or secret.
- **Runs on Webflow Cloud** (mounted at `/planner-rsvp`) or anywhere Next.js runs.

---

## 1. What you need

1. A **Google account** with the Google Sheet.
2. About 5 minutes to paste in a script and deploy it (steps below).
3. [Node.js 18 or newer](https://nodejs.org) installed, to run it locally.

That's it — no Google Cloud Console or service account.

---

## 2. Set up the Google Sheet

1. Open (or create) your Google Sheet.
2. Rename the first tab (bottom-left) to **`Invites_RSVPs`**.
3. Paste this as **row 1** (the header row). Copy the whole line and paste into
   cell **A1**; it is tab-separated, so Google fills A1 through AN1 automatically:

   ```
   company_name	primary_name	primary_email	alternate_name	alternate_email	phone	location	address	apt	city_state	zip_code	formal_envelope_name	need_hotel	need_transportation	num_invited	num_rsvp	misc_note	food_restrictions	gift	gift_type	ty_note_sent	sv_notes	rsvp_status	attending_days	arrival_date	arrival_time	travel_mode	departure_date	departure_time	parking_shuttle_notes	preferred_lodging	accessibility_room_notes	roommate_notes	accommodation_notes	mobility_notes	picnic_paddleboarding	plein_air_painting	petal_party	vegetable_harvesting	helicopter_tour	progressive_dinner	night_swim	breakfast	yoga_sound_bath	brunch_social	chattanooga_shuttle_tour	farewell_feast	food_allergies	alcohol_preference	submitted_at	last_updated
   ```

   These are columns **A through AY** (51 columns). The app reads the header row
   as the definitive column map, so the columns can be reordered as long as the
   names match.

4. Add one row per invited guest. Fill in **primary_email** (required — this is
   how each guest is identified) and **primary_name**, plus any admin columns you
   track (company_name, address, num_invited, gift, etc.). Leave the RSVP response
   columns blank — the app fills those in.

5. **Make `need_hotel` and `need_transportation` checkbox columns.** Select each
   column, then **Insert → Checkbox**. The app reads and writes them as
   true/false. (If you skip this they'll still work as the text `TRUE`/`FALSE`.)

### Invite links

Each guest is identified by their **email address**, which is carried in their
personal link. A guest's link is your site plus `?email=THEIR_EMAIL`:

```
https://your-site.com/planner-rsvp?email=megan@example.com
```

Guests who open the site without their link can find themselves by entering the
email address on their invitation. (Phone is still collected as a contact field
in the form, but it is not used to look anyone up.)

---

## 3. Connect the sheet with Apps Script (about 5 minutes)

1. In your sheet, open **Extensions → Apps Script**. Delete anything in the editor.
2. Open **[apps-script/Code.gs](apps-script/Code.gs)** from this project, copy its
   **entire contents**, and paste them into the Apps Script editor. Save (💾).
3. Near the top of the script, change **`SHARED_SECRET`** to your own long random
   string (keep the quotes). Example: `'hvf-9f83k2xQ-do-not-share'`.
4. Click **Deploy → New deployment**:
   - Select type: **Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Click **Deploy**, authorize when prompted, and **copy the Web app URL**
     (it looks like `https://script.google.com/macros/s/AKfy…/exec`).

> **Editing the script later?** Deploy → Manage deployments → edit (pencil) →
> Version: **New version** → Deploy. The URL stays the same.

---

## 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Value |
| --- | --- |
| `APPS_SCRIPT_URL` | The Web app URL you copied in step 3. |
| `APPS_SCRIPT_SECRET` | The **same** string you set for `SHARED_SECRET` in the script. |

---

## 5. Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. To test a specific guest, add their token:
<http://localhost:3000/?email=megan@example.com>, or use the lookup screen with
the email address from that guest's row.

Build for production with `npm run build && npm start`.

---

## 6. Deploy to Webflow Cloud

This app is built to be mounted under a sub-path (e.g. `/planner-rsvp`).

1. Push this repository to GitHub.
2. In Webflow Cloud, connect the GitHub repo and create an environment whose
   **mount path** is `/planner-rsvp`.
3. Set the environment variable **`NEXT_PUBLIC_BASE_PATH=/planner-rsvp`** so the
   app's links and internal API calls resolve under that path. (Mounting at the
   site root instead? Leave this unset.)
4. Add **`APPS_SCRIPT_URL`** and **`APPS_SCRIPT_SECRET`** as environment variables
   in Webflow Cloud too. **Never commit real values** — `.env.local` is gitignored.
5. Deploy. Webflow Cloud builds the Next.js app and serves it at your mount path.

> The app only uses the standard `fetch` API to reach the Apps Script, so it runs
> on Webflow Cloud's Cloudflare Workers runtime without any extra packages.

---

## 7. How it works (for maintainers)

```
app/
  page.tsx                     The RSVP page: hero, welcome, itinerary, form, states
  layout.tsx                   Fonts + page shell
  globals.css                  All styling (estate-invitation theme)
  api/rsvp/lookup/route.ts     GET  – find one guest by email
  api/rsvp/submit/route.ts     POST – update that guest's row
components/
  Itinerary.tsx                The two-day schedule
  RsvpForm.tsx                 Multi-step form (Attendance -> Review) + submit
  FormStep.tsx                 Step wrapper + reusable field inputs
lib/
  googleSheets.ts              Calls the Apps Script Web App (server only)
  retreat.ts                   Itinerary + activity list (edit content here)
types/
  rsvp.ts                      The shared data shape
apps-script/
  Code.gs                      Paste into the sheet's Apps Script editor (the backend)
```

The flow: **browser → Next.js API route → Apps Script Web App → the sheet.** The
Next.js routes act as a server-side proxy, so the Apps Script URL and secret never
reach the browser, and the full sheet is never returned — only the one matching row.

**To change activity times or descriptions**, edit `lib/retreat.ts`. The times
shown next to each activity are placeholders — adjust them to the final schedule.

**The form is dynamic.** Guests who select *Unable to Attend* skip the logistics
steps. The activity step only shows activities for the day(s) a guest chose, and
lodging preferences appear only when a guest requests an on-site stay.

### API summary

- `GET /api/rsvp/lookup?email=guest@example.com` (`?invite=` is accepted as an
  alias) → returns only that guest's info and saved responses, or `404` with a
  friendly message.
- `POST /api/rsvp/submit` with `{ email, responses }` → updates only the matching
  row's **response** columns. Admin/CRM columns (address, gift, num_invited,
  sv_notes, ty_note_sent, etc.) are preserved untouched. It stamps `submitted_at`
  once and `last_updated` every time, and uses a lock so two people can't
  overwrite the same row at once.

### Data & privacy notes

- The full sheet is never returned to the browser — only the one matching row.
- The Apps Script URL and secret are read only inside `lib/googleSheets.ts`, which
  is imported only by server-side API routes.
- Guests are matched by exact email — `primary_email` or `alternate_email`
  (case- and whitespace-insensitive).
- The guest form writes only RSVP columns. Everything else in the row — contact,
  address, gift tracking, invite counts, internal notes — is left exactly as you
  entered it.
