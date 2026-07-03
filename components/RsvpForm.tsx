'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Attendee, RsvpResponses, ActivityResponses } from '@/types/rsvp';
import { emptyResponses } from '@/types/rsvp';
import { ACTIVITIES, ARRIVAL_DATES, DEPARTURE_DATES, type ActivityItem } from '@/lib/retreat';
import { getBasePath } from '@/lib/basePath';
import FormStep, { RadioGroup, TextField, TextArea } from './FormStep';

const ATTENDING = 'Attending';
const UNABLE = 'Unable to Attend';
const PARTIAL = 'Partial Attendance';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

type StepId =
  | 'attendance'
  | 'transportation'
  | 'accommodation'
  | 'activities'
  | 'food'
  | 'review';

/** Format a US phone number as the guest types: 423-555-1234. */
function formatPhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1); // drop US country code
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function RsvpForm({
  attendee,
  onStepChange,
}: {
  attendee: Attendee;
  onStepChange?: (index: number) => void;
}) {
  // Seed the form from any saved responses so updates pre-fill.
  const [responses, setResponses] = useState<RsvpResponses>(() => ({
    ...emptyResponses(),
    ...attendee.responses,
    activities: { ...emptyResponses().activities, ...attendee.responses.activities },
    name: attendee.responses.name || attendee.name || '',
    company: attendee.responses.company || attendee.company || '',
    email: attendee.responses.email || attendee.email || '',
    phone: formatPhone(attendee.responses.phone || attendee.phone || ''),
  }));

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [stepError, setStepError] = useState('');
  const formRef = useRef<HTMLElement>(null);

  // ------- field helpers -------
  function setField<K extends keyof RsvpResponses>(key: K, value: RsvpResponses[K]) {
    setResponses((prev) => ({ ...prev, [key]: value }));
    setStepError('');
  }
  function setActivity(key: keyof ActivityResponses, value: string) {
    setResponses((prev) => ({
      ...prev,
      activities: { ...prev.activities, [key]: value as ActivityResponses[typeof key] },
    }));
  }

  // ------- which steps are active (dynamic) -------
  const notAttending = responses.rsvpStatus === UNABLE;

  const activeSteps: StepId[] = useMemo(() => {
    if (notAttending) {
      // Skip logistics for guests who can't make it.
      return ['attendance', 'food', 'review'];
    }
    return ['attendance', 'transportation', 'accommodation', 'activities', 'food', 'review'];
  }, [notAttending]);

  const safeIndex = Math.min(stepIndex, activeSteps.length - 1);
  const currentStep = activeSteps[safeIndex];

  // Report the active step up so the page can hide the intro sections.
  useEffect(() => {
    onStepChange?.(safeIndex);
  }, [safeIndex, onStepChange]);

  // Only show activities for the day(s) the guest is attending.
  const shownActivities: ActivityItem[] = useMemo(() => {
    const days = responses.attendingDays;
    if (days === 'Monday') return ACTIVITIES.filter((a) => a.day === 'Mon');
    if (days === 'Tuesday') return ACTIVITIES.filter((a) => a.day === 'Tue');
    return ACTIVITIES; // Both Days, or unspecified
  }, [responses.attendingDays]);

  // ------- navigation -------
  function validateStep(step: StepId): string {
    if (step === 'attendance') {
      if (!responses.rsvpStatus) return 'Please choose your RSVP status to continue.';
      if (responses.rsvpStatus === PARTIAL && !responses.attendingDays) {
        return 'Please let us know which day(s) you plan to attend.';
      }
    }
    return '';
  }

  function goToStep(index: number) {
    setStepIndex(index);
    // Bring the form into view so the new step is visible after navigating.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function next() {
    const msg = validateStep(currentStep);
    if (msg) {
      setStepError(msg);
      return;
    }
    setStepError('');
    goToStep(Math.min(safeIndex + 1, activeSteps.length - 1));
  }
  function back() {
    setStepError('');
    goToStep(Math.max(safeIndex - 1, 0));
  }

  // ------- submit -------
  async function submit() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${getBasePath()}/api/rsvp/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Identify by the stable, looked-up email (not the editable field).
          email: attendee.email || attendee.alternateEmail || undefined,
          responses,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'We could not save your RSVP. Please try again.');
      }
      setDone(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ------- confirmation -------
  if (done) {
    const firstName = (responses.name || attendee.name || '').trim().split(/\s+/)[0];
    return (
      <section className="card confirm center-state" ref={formRef}>
        <div className="seal">✦</div>
        <h2>Thank you{firstName ? `, ${firstName}` : ''}.</h2>
        <p className="welcome-copy">
          Your RSVP has been received. Our team will follow up with final details, lodging
          assignments, and any transportation notes as the retreat approaches.
        </p>
        <p className="welcome-copy" style={{ fontSize: '0.98rem', opacity: 0.85 }}>
          Need to change something? You can update your RSVP any time.
        </p>
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: '0.4rem' }}
          onClick={() => {
            setDone(false);
            goToStep(activeSteps.length - 1); // back to the Review step
          }}
        >
          Edit submission
        </button>
        <p className="welcome-copy" style={{ marginTop: '1.4rem', fontSize: '0.98rem' }}>
          Follow along at{' '}
          <a
            href="https://www.happyvalleyfarms.com/follow"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#14311f', fontWeight: 600 }}
          >
            happyvalleyfarms.com/follow
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="card" aria-labelledby="rsvp-heading" ref={formRef}>
      <p className="eyebrow section-eyebrow" id="rsvp-heading">
        Your RSVP
      </p>

      <div className="progress" aria-hidden="true">
        {activeSteps.slice(0, -1).map((s, i) => (
          <span
            key={s}
            className={`dot ${i === safeIndex ? 'active' : i < safeIndex ? 'done' : ''}`}
          />
        ))}
      </div>
      <p className="step-count">
        Step {Math.min(safeIndex + 1, activeSteps.length)} of {activeSteps.length}
      </p>

      {/* ---------------- Step: Attendance ---------------- */}
      {currentStep === 'attendance' && (
        <FormStep title="Attendance">
          <RadioGroup
            label="Will you be joining us?"
            name="rsvpStatus"
            options={[ATTENDING, PARTIAL, UNABLE]}
            value={responses.rsvpStatus}
            onChange={(v) => {
              setField('rsvpStatus', v);
              // Attending defaults to Both Days (hidden); Partial asks; Unable clears.
              if (v === ATTENDING) setField('attendingDays', 'Both Days');
              else setField('attendingDays', '');
            }}
          />
          {responses.rsvpStatus === PARTIAL && (
            <RadioGroup
              label="Which day(s) will you attend?"
              name="attendingDays"
              options={['Monday', 'Tuesday', 'Both Days']}
              value={responses.attendingDays}
              onChange={(v) => setField('attendingDays', v)}
            />
          )}
          <RadioGroup
            label="Which best describes your work?"
            name="industry"
            options={['Wedding', 'Corporate', 'Both']}
            value={responses.industry}
            onChange={(v) => setField('industry', v)}
          />
          <div className="field-grid">
            <TextField
              label="Full name"
              autoComplete="name"
              value={responses.name}
              onChange={(v) => setField('name', v)}
            />
            <TextField
              label="Company"
              autoComplete="organization"
              value={responses.company}
              onChange={(v) => setField('company', v)}
            />
          </div>
          <div className="field-grid">
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={responses.email}
              onChange={(v) => setField('email', v)}
            />
            <TextField
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="423-555-1234"
              value={responses.phone}
              onChange={(v) => setField('phone', formatPhone(v))}
            />
          </div>
          <RadioGroup
            label="Shirt / pullover size"
            name="shirtSize"
            options={SHIRT_SIZES}
            value={responses.shirtSize}
            onChange={(v) => setField('shirtSize', v)}
          />
        </FormStep>
      )}

      {/* ---------------- Step: Transportation ---------------- */}
      {currentStep === 'transportation' && (
        <FormStep title="Transportation & Arrival">
          <DateTimeField
            label="Arrival"
            name="arrivalDate"
            dates={ARRIVAL_DATES}
            dateValue={responses.arrivalDate}
            onDate={(v) => setField('arrivalDate', v)}
            timeValue={responses.arrivalTime}
            onTime={(v) => setField('arrivalTime', v)}
            timePlaceholder="9:30 AM"
          />
          <RadioGroup
            label="Travel mode"
            name="travelMode"
            options={['Driving', 'Flying', 'Local', 'Other']}
            value={responses.travelMode}
            onChange={(v) => setField('travelMode', v)}
          />
          <DateTimeField
            label="Departure"
            name="departureDate"
            dates={DEPARTURE_DATES}
            dateValue={responses.departureDate}
            onDate={(v) => setField('departureDate', v)}
            timeValue={responses.departureTime}
            onTime={(v) => setField('departureTime', v)}
            timePlaceholder="After dinner"
          />
          <RadioGroup
            label="Do you need transportation assistance from or to the airport?"
            name="needTransportation"
            options={['Yes', 'No']}
            value={responses.needTransportation}
            onChange={(v) => setField('needTransportation', v as RsvpResponses['needTransportation'])}
          />
          <TextArea
            label="Parking or shuttle notes"
            value={responses.parkingShuttleNotes}
            onChange={(v) => setField('parkingShuttleNotes', v)}
          />
        </FormStep>
      )}

      {/* ---------------- Step: Accommodation ---------------- */}
      {currentStep === 'accommodation' && (
        <FormStep
          title="Accommodation Preferences"
          note="On-site accommodations are limited and will be offered first come, first served to out-of-town guests. Everyone else who needs accommodations will be staying at The Edwin in downtown Chattanooga, TN."
        >
          <RadioGroup
            label="Do you need overnight accommodations?"
            name="lodgingNeeded"
            options={['Yes', 'No']}
            value={responses.lodgingNeeded}
            onChange={(v) => setField('lodgingNeeded', v as RsvpResponses['lodgingNeeded'])}
          />
          <TextArea
            label="Accommodation Notes"
            hint="Room or accessibility needs, mobility considerations, roommate preferences, or anything else about your stay."
            value={responses.accommodationNotes}
            onChange={(v) => setField('accommodationNotes', v)}
          />
        </FormStep>
      )}

      {/* ---------------- Step: Activities ---------------- */}
      {currentStep === 'activities' && (
        <FormStep
          title="Activity RSVPs"
          note="Please RSVP to each activity so our team can plan accurately for transportation, vendors, meals, and per-person activities."
        >
          {shownActivities.map((a) => (
            <div className="activity" key={a.key}>
              <span className="a-when">
                <span className="t-day">{a.day}</span>
                <span className="t-hour">{a.time}</span>
              </span>
              <div className="a-main">
                <span className="a-name">{a.label}</span>
                <div className="choices" role="radiogroup" aria-label={a.label}>
                  {['Yes', 'No', 'Not Sure'].map((opt) => (
                    <label className="choice" key={opt}>
                      <input
                        type="radio"
                        name={a.key}
                        value={opt}
                        checked={responses.activities[a.key] === opt}
                        onChange={() => setActivity(a.key, opt)}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </FormStep>
      )}

      {/* ---------------- Step: Food & Guest Notes ---------------- */}
      {currentStep === 'food' && (
        <FormStep title="Food & Guest Notes">
          <TextArea
            label="Dietary restrictions"
            value={responses.foodRestrictions}
            onChange={(v) => setField('foodRestrictions', v)}
          />
          <TextArea
            label="Food allergies"
            value={responses.foodAllergies}
            onChange={(v) => setField('foodAllergies', v)}
          />
          <RadioGroup
            label="Alcohol preference"
            name="alcoholPreference"
            options={['Yes', 'No', 'No preference']}
            value={responses.alcoholPreference}
            onChange={(v) => setField('alcoholPreference', v)}
          />
          <TextArea
            label="What's something unique about you?"
            value={responses.uniqueAboutYou}
            onChange={(v) => setField('uniqueAboutYou', v)}
          />
          <TextArea
            label="Why are you excited to attend the retreat?"
            value={responses.whyExcited}
            onChange={(v) => setField('whyExcited', v)}
          />
          <TextField
            label="Social handles"
            hint="If you'd like to be tagged in any content (Instagram, TikTok, etc.)."
            placeholder="@yourhandle"
            value={responses.socialMedia}
            onChange={(v) => setField('socialMedia', v)}
          />
          <TextArea
            label="Anything else the Happy Valley Farms team should know?"
            value={responses.miscNote}
            onChange={(v) => setField('miscNote', v)}
          />
        </FormStep>
      )}

      {/* ---------------- Step: Review ---------------- */}
      {currentStep === 'review' && (
        <FormStep title="Review & Submit">
          <ReviewSummary
            responses={responses}
            shownActivities={notAttending ? [] : shownActivities}
            notAttending={notAttending}
          />
          {error ? <p className="inline-error">{error}</p> : null}
        </FormStep>
      )}

      {stepError ? <p className="inline-error">{stepError}</p> : null}

      {/* ---------------- Navigation ---------------- */}
      <div className="actions">
        {safeIndex > 0 && (
          <button type="button" className="btn-ghost" onClick={back} disabled={saving}>
            Back
          </button>
        )}
        <span className="spacer" />
        {currentStep !== 'review' ? (
          <button type="button" className="btn-primary" onClick={next}>
            Continue
          </button>
        ) : (
          <button type="button" className="btn-gold" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : 'Submit RSVP'}
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Compact date + time picker: "August" once, day chips (weekday above the
// date), and the time field on the same row.
// ---------------------------------------------------------------------------
function DateTimeField({
  label,
  name,
  dates,
  dateValue,
  onDate,
  timeValue,
  onTime,
  timePlaceholder,
}: {
  label: string;
  name: string;
  dates: { value: string; weekday: string; day: string }[];
  dateValue: string;
  onDate: (v: string) => void;
  timeValue: string;
  onTime: (v: string) => void;
  timePlaceholder?: string;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="datetime-row">
        <span className="month-label">August</span>
        <div className="day-chips" role="radiogroup" aria-label={`${label} date`}>
          {dates.map((d) => (
            <label className="day-chip" key={d.value}>
              <input
                type="radio"
                name={name}
                value={d.value}
                checked={dateValue === d.value}
                onChange={() => onDate(d.value)}
              />
              <span className="chip-inner">
                <span className="wd">{d.weekday}</span>
                <span className="dn">{d.day}</span>
              </span>
            </label>
          ))}
        </div>
        <input
          className="time-input"
          type="text"
          placeholder={timePlaceholder}
          aria-label={`${label} time`}
          value={timeValue}
          onChange={(e) => onTime(e.target.value)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review summary
// ---------------------------------------------------------------------------
function Row({ k, v }: { k: string; v: string }) {
  const empty = !v || !v.trim();
  return (
    <div className="summary-row">
      <span className="k">{k}</span>
      <span className={`v${empty ? ' empty' : ''}`}>{empty ? 'Not provided' : v}</span>
    </div>
  );
}

function ReviewSummary({
  responses,
  shownActivities,
  notAttending,
}: {
  responses: RsvpResponses;
  shownActivities: ActivityItem[];
  notAttending: boolean;
}) {
  return (
    <div className="summary">
      <div className="summary-group">
        <h3>Guest</h3>
        <Row k="Name" v={responses.name} />
        {responses.company ? <Row k="Company" v={responses.company} /> : null}
        <Row k="Email" v={responses.email} />
        <Row k="Phone" v={responses.phone} />
        {responses.industry ? <Row k="Industry" v={responses.industry} /> : null}
        {responses.shirtSize ? <Row k="Shirt size" v={responses.shirtSize} /> : null}
      </div>

      <div className="summary-group">
        <h3>Attendance</h3>
        <Row k="RSVP status" v={responses.rsvpStatus} />
        {!notAttending ? <Row k="Attending days" v={responses.attendingDays} /> : null}
      </div>

      {!notAttending && (
        <>
          <div className="summary-group">
            <h3>Transportation</h3>
            <Row k="Arrival" v={[responses.arrivalDate, responses.arrivalTime].filter(Boolean).join(' · ')} />
            <Row k="Departure" v={[responses.departureDate, responses.departureTime].filter(Boolean).join(' · ')} />
            <Row k="Travel mode" v={responses.travelMode} />
            <Row k="Needs airport transportation" v={responses.needTransportation} />
            {responses.parkingShuttleNotes ? (
              <Row k="Parking / shuttle notes" v={responses.parkingShuttleNotes} />
            ) : null}
          </div>

          <div className="summary-group">
            <h3>Accommodation</h3>
            <Row k="Overnight accommodations" v={responses.lodgingNeeded} />
            {responses.accommodationNotes ? (
              <Row k="Accommodation notes" v={responses.accommodationNotes} />
            ) : null}
          </div>

          <div className="summary-group">
            <h3>Activities</h3>
            {shownActivities.map((a) => (
              <Row key={a.key} k={`${a.label} (${a.day})`} v={responses.activities[a.key]} />
            ))}
          </div>
        </>
      )}

      <div className="summary-group">
        <h3>Food & Notes</h3>
        {responses.foodRestrictions ? (
          <Row k="Dietary restrictions" v={responses.foodRestrictions} />
        ) : null}
        {responses.foodAllergies ? <Row k="Food allergies" v={responses.foodAllergies} /> : null}
        <Row k="Alcohol preference" v={responses.alcoholPreference} />
        {responses.uniqueAboutYou ? <Row k="Something unique" v={responses.uniqueAboutYou} /> : null}
        {responses.whyExcited ? <Row k="Excited to attend" v={responses.whyExcited} /> : null}
        {responses.socialMedia ? <Row k="Social handles" v={responses.socialMedia} /> : null}
        {responses.miscNote ? <Row k="Additional notes" v={responses.miscNote} /> : null}
      </div>
    </div>
  );
}
