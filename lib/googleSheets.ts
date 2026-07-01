// ---------------------------------------------------------------------------
// Google Sheets access — via a Google Apps Script Web App.
//
// The actual reading/writing happens in a script that lives inside the sheet
// (see apps-script/Code.gs). This module just calls that script's URL from the
// server with a shared secret, so no Google credentials ever touch the browser.
//
// Imported only by server-side API routes.
// ---------------------------------------------------------------------------

import type { Attendee, RsvpResponses } from '@/types/rsvp';

export interface Identifier {
  /** primary_email or alternate_email of the guest */
  email?: string;
}

function getConfig() {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET;
  if (!url || !secret) {
    throw new Error(
      'Missing Apps Script configuration. Set APPS_SCRIPT_URL and APPS_SCRIPT_SECRET.'
    );
  }
  return { url, secret };
}

interface ScriptResponse {
  ok: boolean;
  notFound?: boolean;
  error?: string;
  attendee?: Attendee;
}

/** Parse the Apps Script response, turning non-JSON replies into a clear error. */
async function parseScriptResponse(res: Response): Promise<ScriptResponse> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ScriptResponse;
  } catch {
    // Apps Script returns an HTML page when the deployment/URL/access is wrong.
    throw new Error(
      'Unexpected response from the Apps Script. Check that APPS_SCRIPT_URL is the ' +
        'deployed Web app URL and that access is set to "Anyone".'
    );
  }
}

/**
 * Find the single attendee matching an email (or invite token).
 * Returns null when nothing matches.
 */
export async function lookupAttendee(id: Identifier): Promise<Attendee | null> {
  const { url, secret } = getConfig();
  const qs = new URLSearchParams({ action: 'lookup', secret });
  if (id.email) qs.set('email', id.email);

  const res = await fetch(`${url}?${qs.toString()}`, {
    method: 'GET',
    redirect: 'follow', // Apps Script web apps 302 to their content URL
    cache: 'no-store',
  });

  const data = await parseScriptResponse(res);
  if (data.ok && data.attendee) return data.attendee;
  if (data.notFound) return null;
  if (data.error === 'Unauthorized') {
    throw new Error('Apps Script rejected the request (secret mismatch).');
  }
  if (data.error) throw new Error(data.error);
  return null;
}

export type SubmitResult = 'ok' | 'not_found';

/**
 * Update exactly one row with the supplied responses. The Apps Script preserves
 * identity columns, stamps submitted_at once, and refreshes last_updated.
 */
export async function submitResponses(
  id: Identifier,
  responses: RsvpResponses
): Promise<SubmitResult> {
  const { url, secret } = getConfig();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow',
    body: JSON.stringify({
      action: 'submit',
      secret,
      email: id.email || '',
      responses,
    }),
  });

  const data = await parseScriptResponse(res);
  if (data.ok) return 'ok';
  if (data.notFound) return 'not_found';
  if (data.error === 'Unauthorized') {
    throw new Error('Apps Script rejected the request (secret mismatch).');
  }
  throw new Error(data.error || 'The Apps Script did not save the RSVP.');
}
