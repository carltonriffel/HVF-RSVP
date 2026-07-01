// ---------------------------------------------------------------------------
// Shared types for the Happy Valley Farms Planner Retreat RSVP.
// This file is the single source of truth for the data shape that flows
// between the Google Sheet, the API routes, and the React form.
//
// The sheet has many columns (A–AY), but most are admin/CRM fields the guest
// form never touches (address, gift, num_invited, sv_notes, etc.). The types
// below cover only the identity fields and the responses a guest can edit.
// ---------------------------------------------------------------------------

/** A Yes / No / Not Sure answer for a single activity. */
export type ActivityAnswer = '' | 'Yes' | 'No' | 'Not Sure';

/** A Yes / No answer that maps to a true/false checkbox in the sheet. */
export type YesNo = '' | 'Yes' | 'No';

/** The twelve retreat activities, keyed in camelCase. */
export interface ActivityResponses {
  picnicPaddleboarding: ActivityAnswer;
  pleinAirPainting: ActivityAnswer;
  petalParty: ActivityAnswer;
  vegetableHarvesting: ActivityAnswer;
  helicopterTour: ActivityAnswer;
  progressiveDinner: ActivityAnswer;
  nightSwim: ActivityAnswer;
  breakfast: ActivityAnswer;
  yogaSoundBath: ActivityAnswer;
  brunchSocial: ActivityAnswer;
  chattanoogaShuttleTour: ActivityAnswer;
  farewellFeast: ActivityAnswer;
}

/** Everything a guest can fill in or update (maps to writable sheet columns). */
export interface RsvpResponses {
  // Contact & company (editable so guests can correct what we have on file)
  name: string; // primary_name
  company: string; // company_name
  email: string; // primary_email
  phone: string; // phone
  industry: string; // Industry (Wedding / Corporate / Both)
  shirtSize: string; // shirt_size

  // Attendance
  rsvpStatus: string; // rsvp_status
  attendingDays: string; // attending_days

  // Transportation & arrival
  arrivalDate: string; // arrival_date
  arrivalTime: string; // arrival_time
  travelMode: string; // travel_mode
  departureDate: string; // departure_date
  departureTime: string; // departure_time
  needTransportation: YesNo; // need_transportation (checkbox -> true/false)
  parkingShuttleNotes: string; // parking_shuttle_notes

  // Accommodation
  lodgingNeeded: YesNo; // lodging_needed (checkbox -> true/false)
  accommodationNotes: string; // accommodation_notes (room/accessibility/mobility/roommate)

  // Activities
  activities: ActivityResponses;

  // Food & guest notes
  foodRestrictions: string; // food_restrictions
  foodAllergies: string; // food_allergies
  alcoholPreference: string; // alcohol_preference

  // Getting to know you
  uniqueAboutYou: string; // unique_about_you
  whyExcited: string; // why_excited
  socialMedia: string; // social_media
  miscNote: string; // misc_note
}

/** The read-only identity fields plus the saved responses. */
export interface Attendee {
  email: string; // primary_email (the identifier)
  alternateEmail: string; // alternate_email
  name: string; // primary_name
  company: string; // company_name
  phone: string; // phone
  responses: RsvpResponses;
}

/** Response shape for GET /api/rsvp/lookup */
export interface LookupSuccess {
  ok: true;
  attendee: Attendee;
}
export interface ApiError {
  ok: false;
  error: string;
}

/** Body shape for POST /api/rsvp/submit */
export interface SubmitBody {
  email?: string;
  responses: RsvpResponses;
}

export interface SubmitSuccess {
  ok: true;
  message: string;
}

/** An empty response object – used to seed the form. */
export function emptyResponses(): RsvpResponses {
  return {
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    shirtSize: '',
    rsvpStatus: '',
    attendingDays: '',
    arrivalDate: '',
    arrivalTime: '',
    travelMode: '',
    departureDate: '',
    departureTime: '',
    needTransportation: '',
    parkingShuttleNotes: '',
    lodgingNeeded: '',
    accommodationNotes: '',
    activities: {
      picnicPaddleboarding: '',
      pleinAirPainting: '',
      petalParty: '',
      vegetableHarvesting: '',
      helicopterTour: '',
      progressiveDinner: '',
      nightSwim: '',
      breakfast: '',
      yogaSoundBath: '',
      brunchSocial: '',
      chattanoogaShuttleTour: '',
      farewellFeast: '',
    },
    foodRestrictions: '',
    foodAllergies: '',
    alcoholPreference: '',
    uniqueAboutYou: '',
    whyExcited: '',
    socialMedia: '',
    miscNote: '',
  };
}
