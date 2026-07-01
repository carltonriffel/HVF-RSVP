import { NextRequest, NextResponse } from 'next/server';
import { lookupAttendee } from '@/lib/googleSheets';
import type { ApiError, LookupSuccess } from '@/types/rsvp';

// This route reads private credentials and must never be statically cached.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NOT_FOUND_MESSAGE =
  "We couldn't find your invitation. Please check the email address on your " +
  'invitation, or contact our team.';

/**
 * GET /api/rsvp/lookup?email=guest@example.com
 *      /api/rsvp/lookup?invite=guest@example.com   (alias — also treated as email)
 *
 * Returns only the single matching attendee. Never returns other rows.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // The invite link and the manual lookup both identify guests by email.
  // `invite` is accepted as an alias so links using either name work.
  const email = (params.get('email') || params.get('invite'))?.trim() || '';

  if (!email) {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Please provide the email address on your invitation.' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json<ApiError>(
      { ok: false, error: 'That email address does not look valid.' },
      { status: 400 }
    );
  }

  try {
    const attendee = await lookupAttendee({ email });

    if (!attendee) {
      return NextResponse.json<ApiError>(
        { ok: false, error: NOT_FOUND_MESSAGE },
        { status: 404 }
      );
    }

    return NextResponse.json<LookupSuccess>({ ok: true, attendee });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('lookup error:', detail);
    return NextResponse.json(
      {
        ok: false,
        error: 'Something went wrong looking up your invitation. Please try again.',
        detail,
      },
      { status: 500 }
    );
  }
}
