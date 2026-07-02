// ---------------------------------------------------------------------------
// Retreat content: the full itinerary + the twelve RSVP-able activities.
// Shared by the Itinerary display and the Activity RSVP step so the labels,
// days, and times stay in sync in one place.
//
// Items WITH a `key` get a Yes / No / Not Sure selector and save to the sheet
// column of the same name. Items WITHOUT a `key` (Refresh Break, Cocktails at
// The Edwin, Before-Dinner Drinks) appear on the itinerary only.
// ---------------------------------------------------------------------------

import type { ActivityResponses } from '@/types/rsvp';

export interface ItineraryItem {
  /** camelCase key that matches ActivityResponses; omit for itinerary-only items */
  key?: keyof ActivityResponses;
  label: string;
  day: 'Mon' | 'Tue';
  time: string;
  /** longer description used in the itinerary */
  detail?: string;
}

/** An itinerary item the guest can RSVP to (always has a sheet-backed key). */
export interface ActivityItem extends ItineraryItem {
  key: keyof ActivityResponses;
}

export const ITINERARY: ItineraryItem[] = [
  {
    key: 'picnicPaddleboarding',
    label: 'Picnic & River Outing',
    day: 'Mon',
    time: '10:30 AM',
    detail:
      'A relaxed picnic and meet-and-greet at Coolidge Park, followed by paddleboarding, kayaking, or an easy boat ride.',
  },
  {
    key: 'pleinAirPainting',
    label: 'Plein Air Painting',
    day: 'Mon',
    time: '3:30 PM',
    detail: 'A guided painting class at the farm with Olivia Reckert.',
  },
  {
    key: 'petalParty',
    label: 'Petal Party',
    day: 'Mon',
    time: '4:45 PM',
    detail:
      'Fresh-cut bouquet making with Liza Greever of Fox & Fern Botanical Styling.',
  },
  {
    key: 'vegetableHarvesting',
    label: 'Garden Harvest',
    day: 'Mon',
    time: '5:30 PM',
    detail: 'A hands-on vegetable harvest with Farmer Bert at Happy Valley Farms.',
  },
  {
    key: 'progressiveDinner',
    label: 'Progressive Farm Dinner',
    day: 'Mon',
    time: '6:15 PM',
    detail:
      'A wagon ride and five-course farm-to-table dinner by Michelle Wells of Events with Taste.',
  },
  {
    key: 'helicopterTour',
    label: 'Cocktails & Helicopter Rides',
    day: 'Mon',
    time: '7:00 PM',
    detail:
      'Greenhouse patio cocktails, appetizers, and optional helicopter rides with Elite Helicopters.',
  },
  {
    key: 'nightSwim',
    label: 'Dessert & Night Swim',
    day: 'Mon',
    time: '9:15 PM',
    detail: 'Dessert on the pool deck, optional swimming, and relaxed time to connect.',
  },
  {
    key: 'breakfast',
    label: 'Coffee & Light Breakfast',
    day: 'Tue',
    time: '7:30 AM',
    detail: 'Coffee and light breakfast at Hutcheson Hall.',
  },
  {
    key: 'yogaSoundBath',
    label: 'Yoga & Sound Bath',
    day: 'Tue',
    time: '8:30 AM',
    detail: 'A poolside restoration session with Deb & Flow.',
  },
  {
    label: 'Refresh Break',
    day: 'Tue',
    time: '10:00 AM',
    detail: 'Time to shower, reset, and prepare for brunch.',
  },
  {
    key: 'brunchSocial',
    label: 'Brunch Social',
    day: 'Tue',
    time: '12:00 PM',
    detail: "Mimosas, brunch, and connection with Chattanooga's vendor community.",
  },
  {
    key: 'chattanoogaShuttleTour',
    label: 'Downtown Chattanooga Tour',
    day: 'Tue',
    time: '2:45 PM',
    detail: 'A guided shuttle tour featuring local highlights and a few downtown stops.',
  },
  {
    label: 'Cocktails at The Edwin',
    day: 'Tue',
    time: '4:30 PM',
    detail: 'A tour of The Edwin Hotel with a small bite and cocktail.',
  },
  {
    label: 'Before-Dinner Drinks',
    day: 'Tue',
    time: '5:30 PM',
    detail: 'A casual cocktail stop at Rosecomb before dinner.',
  },
  {
    key: 'farewellFeast',
    label: 'Farewell Dinner',
    day: 'Tue',
    time: '6:30 PM',
    detail: 'A final dinner at 2nd American to close the retreat.',
  },
];

/** Only the items guests RSVP to (drives the Activity RSVPs step + review). */
export const ACTIVITIES: ActivityItem[] = ITINERARY.filter(
  (a): a is ActivityItem => a.key !== undefined
);

export const MONDAY_ITINERARY = ITINERARY.filter((a) => a.day === 'Mon');
export const TUESDAY_ITINERARY = ITINERARY.filter((a) => a.day === 'Tue');

export const RETREAT = {
  title: 'Event Planner Retreat at Happy Valley Farms',
  subtitle: 'A private two-day gathering Aug 3rd–4th at Happy Valley Farms',
  deadline: 'Reply by July 13th',
};

/**
 * Selectable arrival / departure dates for the retreat window (August 2026).
 * `value` is what gets saved to the sheet; weekday/day drive the chip display.
 */
export const ARRIVAL_DATES = [
  { value: 'Aug 2nd', weekday: 'Sun', day: '2nd' },
  { value: 'Aug 3rd', weekday: 'Mon', day: '3rd' },
  { value: 'Aug 4th', weekday: 'Tue', day: '4th' },
];

export const DEPARTURE_DATES = [
  { value: 'Aug 3rd', weekday: 'Mon', day: '3rd' },
  { value: 'Aug 4th', weekday: 'Tue', day: '4th' },
  { value: 'Aug 5th', weekday: 'Wed', day: '5th' },
  { value: 'Aug 6th', weekday: 'Thu', day: '6th' },
];
