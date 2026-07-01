import { NextRequest, NextResponse } from 'next/server';
import { submitResponses, safeErrorCode } from '@/lib/googleSheets';
import { emptyResponses } from '@/types/rsvp';
import type { ApiError, RsvpResponses, SubmitBody, SubmitSuccess } from '@/types/rsvp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/rsvp/submit
 *
 * Body: { email, responses }
 * Resolves the matching row by email, updates ONLY that row's response columns
 * (admin/CRM columns are preserved), stamps submitted_at / last_updated.
 */
export async function POST(request: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Invalid request. Please try submitting again.' },
      { status: 400 }
    );
  }

  const email = body.email?.trim() || '';

  if (!email) {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'We could not identify your invitation. Please reload and try again.' },
      { status: 400 }
    );
  }

  if (!body.responses || typeof body.responses !== 'object') {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'No RSVP responses were provided.' },
      { status: 400 }
    );
  }

  // Normalize the incoming responses against a known-good shape so unexpected
  // or missing fields can't corrupt the row.
  const responses = sanitizeResponses(body.responses);

  // Require at least an RSVP status so we don't overwrite a row with blanks.
  if (!responses.rsvpStatus) {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Please choose an RSVP status before submitting.' },
      { status: 400 }
    );
  }

  try {
    const result = await submitResponses({ email }, responses);

    if (result === 'not_found') {
      return NextResponse.json<ApiError>(
        { ok: false, error: 'We could not find your invitation to update. Please contact our team.' },
        { status: 404 }
      );
    }

    return NextResponse.json<SubmitSuccess>({
      ok: true,
      message: 'Your RSVP has been received.',
    });
  } catch (err) {
    // Full message (may include the Apps Script URL) stays in the server log only.
    console.error('submit error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      {
        ok: false,
        error: 'We could not save your RSVP. Your answers are safe — please try again.',
        code: safeErrorCode(err),
      },
      { status: 500 }
    );
  }
}

/** Coerce arbitrary input into the exact RsvpResponses shape. */
function sanitizeResponses(input: Partial<RsvpResponses>): RsvpResponses {
  const base = emptyResponses();
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  // Restrict the two checkbox fields to Yes / No / '' (blank = unanswered).
  const yesNo = (v: unknown): '' | 'Yes' | 'No' => {
    const s = str(v);
    return s === 'Yes' || s === 'No' ? s : '';
  };

  const activitiesInput = (input.activities ?? {}) as Record<string, unknown>;
  const activities = { ...base.activities };
  (Object.keys(base.activities) as (keyof typeof base.activities)[]).forEach((key) => {
    const value = str(activitiesInput[key]);
    // Only accept the allowed answers.
    activities[key] = (['Yes', 'No', 'Not Sure'].includes(value)
      ? value
      : '') as (typeof base.activities)[typeof key];
  });

  // Keep an edited email only if it looks valid; otherwise leave blank so the
  // Apps Script preserves the existing value instead of overwriting it.
  const emailInput = str(input.email);
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput) ? emailInput : '';

  const industryInput = str(input.industry);
  const industry = ['Wedding', 'Corporate', 'Both'].includes(industryInput)
    ? industryInput
    : '';

  const shirtInput = str(input.shirtSize);
  const shirtSize = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].includes(shirtInput)
    ? shirtInput
    : '';

  return {
    name: str(input.name),
    company: str(input.company),
    email,
    phone: str(input.phone),
    industry,
    shirtSize,
    rsvpStatus: str(input.rsvpStatus),
    attendingDays: str(input.attendingDays),
    arrivalDate: str(input.arrivalDate),
    arrivalTime: str(input.arrivalTime),
    travelMode: str(input.travelMode),
    departureDate: str(input.departureDate),
    departureTime: str(input.departureTime),
    needTransportation: yesNo(input.needTransportation),
    parkingShuttleNotes: str(input.parkingShuttleNotes),
    lodgingNeeded: yesNo(input.lodgingNeeded),
    accommodationNotes: str(input.accommodationNotes),
    activities,
    foodRestrictions: str(input.foodRestrictions),
    foodAllergies: str(input.foodAllergies),
    alcoholPreference: str(input.alcoholPreference),
    uniqueAboutYou: str(input.uniqueAboutYou),
    whyExcited: str(input.whyExcited),
    socialMedia: str(input.socialMedia),
    miscNote: str(input.miscNote),
  };
}
