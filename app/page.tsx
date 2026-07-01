'use client';

import { useEffect, useState } from 'react';
import type { Attendee } from '@/types/rsvp';
import { RETREAT } from '@/lib/retreat';
import Itinerary from '@/components/Itinerary';
import RsvpForm from '@/components/RsvpForm';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

type View = 'loading' | 'lookup' | 'found';

export default function Page() {
  const [view, setView] = useState<View>('loading');
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  // The intro (welcome + itinerary) shows on the first form step, then hides so
  // the guest can focus on the form.
  const [formStep, setFormStep] = useState(0);

  // On load, read the guest's email from the URL and look it up. The invite
  // link carries the email (e.g. ?email=guest@example.com); ?invite= is also
  // accepted as an alias for the same value.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = (params.get('email') || params.get('invite'))?.trim();
    if (!email) {
      setView('lookup');
      return;
    }
    lookup(email)
      .then((found) => {
        if (found) {
          setAttendee(found);
          setView('found');
        } else {
          setView('lookup'); // fall back to manual lookup
        }
      })
      .catch(() => setView('lookup'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(email: string): Promise<Attendee | null> {
    const qs = new URLSearchParams({ email });
    const res = await fetch(`${BASE}/api/rsvp/lookup?${qs.toString()}`);
    const data = await res.json();
    if (res.ok && data.ok) return data.attendee as Attendee;
    if (res.status === 404) return null;
    throw new Error(data.error || 'Lookup failed.');
  }

  return (
    <main className="wrap">
      <Hero />

      {view === 'loading' && <LoadingState />}

      {view === 'lookup' && (
        <LookupCard
          onFound={(a) => {
            setAttendee(a);
            setView('found');
          }}
          runLookup={lookup}
        />
      )}

      {view === 'found' && attendee && (
        <>
          {formStep === 0 && (
            <>
              <Welcome name={attendee.name} />
              <Itinerary />
            </>
          )}
          <RsvpForm attendee={attendee} onStepChange={setFormStep} />
        </>
      )}

      <p className="footer-note">Happy Valley Farms · 490 Hutcheson Dr, Rossville GA 30741</p>
    </main>
  );
}

// ---------------------------------------------------------------------------
function Hero() {
  return (
    <header className="hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo"
        src="https://cdn.prod.website-files.com/65df7ac34fd99d356d984e76/6a21a1bbbdba9a37327c439b_Event%20Logo%20over%20horizontal.png"
        alt="Happy Valley Farms Event Planner Retreat"
      />
      <p className="eyebrow">You are cordially invited</p>
      <h1>{RETREAT.title}</h1>
      <p className="subtitle">{RETREAT.subtitle}</p>
      <div className="rule">
        <span>✦</span>
      </div>
      <div className="meta">
        <span className="dates">{RETREAT.dates}</span>
        <span className="deadline">{RETREAT.deadline}</span>
      </div>
    </header>
  );
}

function Welcome({ name }: { name: string }) {
  const firstName = name.trim().split(/\s+/)[0] || 'Guest';
  return (
    <section className="card">
      <p className="eyebrow section-eyebrow">Welcome</p>
      <p className="welcome-name">Welcome, {firstName}</p>
      <p className="welcome-copy">
        We&rsquo;re looking forward to welcoming you to Happy Valley Farms for two days of curated
        hospitality, meaningful connection, and a firsthand look at the estate, the farm, and the
        Chattanooga experiences surrounding it.
      </p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="card center-state">
      <div className="spinner" aria-hidden="true" />
      <p className="error-text">Looking for your invitation…</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
function LookupCard({
  onFound,
  runLookup,
}: {
  onFound: (a: Attendee) => void;
  runLookup: (email: string) => Promise<Attendee | null>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const entry = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry)) {
      setError('Please enter the email address on your invitation.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const found = await runLookup(entry);
      if (found) {
        onFound(found);
      } else {
        setError(
          "We couldn't find your invitation link. Please check your invite email or contact our team."
        );
      }
    } catch {
      setError('Something went wrong. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <p className="eyebrow section-eyebrow">Find Your Invitation</p>
      <h2>Look up your RSVP</h2>
      <p className="welcome-copy" style={{ marginBottom: '1rem' }}>
        Enter the email address on your invitation and we&rsquo;ll bring up your details.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="lookup">Email address</label>
          <input
            id="lookup"
            type="email"
            value={value}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
          />
        </div>
        {error ? <p className="inline-error">{error}</p> : null}
        <div className="actions">
          <span className="spacer" />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Looking…' : 'Continue'}
          </button>
        </div>
      </form>
    </section>
  );
}
