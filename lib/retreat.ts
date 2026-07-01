// ---------------------------------------------------------------------------
// Retreat content: itinerary + the twelve activities.
// Shared by the Itinerary display and the Activity RSVP step so the labels,
// days, and times stay in sync in one place.
//
// NOTE: the times below are representative placeholders for display. Adjust
// them to the final schedule — they are only labels and do not affect saving.
// ---------------------------------------------------------------------------

import type { ActivityResponses } from '@/types/rsvp';

export interface ActivityItem {
  /** camelCase key that matches ActivityResponses */
  key: keyof ActivityResponses;
  label: string;
  day: 'Mon' | 'Tue';
  time: string;
  /** longer description used in the itinerary */
  detail?: string;
}

export const ACTIVITIES: ActivityItem[] = [
  {
    key: 'picnicPaddleboarding',
    label: 'Picnic & Paddleboarding',
    day: 'Mon',
    time: '9:00 AM',
    detail: 'Picnic and paddleboarding at Coolidge Park.',
  },
  {
    key: 'pleinAirPainting',
    label: 'Plein Air Painting',
    day: 'Mon',
    time: '11:30 AM',
    detail: 'Farm plein air painting with Olivia Reckert.',
  },
  {
    key: 'petalParty',
    label: 'Petal Party',
    day: 'Mon',
    time: '1:00 PM',
    detail: 'Bouquet crafting with Fox & Fern.',
  },
  {
    key: 'vegetableHarvesting',
    label: 'Vegetable Harvesting',
    day: 'Mon',
    time: '2:30 PM',
    detail: 'Harvesting with Farmer Bert at Happy Valley Farms.',
  },
  {
    key: 'helicopterTour',
    label: 'Helicopter Tour',
    day: 'Mon',
    time: '4:00 PM',
    detail: 'With Elite Helicopters, featuring views over Lula Lake Land Trust.',
  },
  {
    key: 'progressiveDinner',
    label: 'Progressive Dinner',
    day: 'Mon',
    time: '6:00 PM',
    detail:
      'A wagon ride and five-course farm-to-table dinner featuring produce from Happy Valley Farms with Michelle Wells, Events with Taste.',
  },
  {
    key: 'nightSwim',
    label: 'Night Swim',
    day: 'Mon',
    time: '9:00 PM',
    detail: 'Networking and wind-down.',
  },
  {
    key: 'breakfast',
    label: 'Breakfast',
    day: 'Tue',
    time: '8:00 AM',
    detail: 'Light bites and coffee at the Farm.',
  },
  {
    key: 'yogaSoundBath',
    label: 'Yoga & Sound Bath',
    day: 'Tue',
    time: '9:00 AM',
    detail: 'Poolside restoration with Deb & Flow.',
  },
  {
    key: 'brunchSocial',
    label: 'Brunch Social',
    day: 'Tue',
    time: '11:00 AM',
    detail:
      "Mimosas and connection with Chattanooga's vendor community, with fare from The Unicorn.",
  },
  {
    key: 'chattanoogaShuttleTour',
    label: 'Chattanooga Shuttle Tour',
    day: 'Tue',
    time: '1:00 PM',
    detail:
      'Local must-sees ending with cocktails and hors d’oeuvres at The Edwin Hotel.',
  },
  {
    key: 'farewellFeast',
    label: 'Farewell Feast',
    day: 'Tue',
    time: '6:00 PM',
    detail: 'At 2nd American restaurant.',
  },
];

export const MONDAY_ACTIVITIES = ACTIVITIES.filter((a) => a.day === 'Mon');
export const TUESDAY_ACTIVITIES = ACTIVITIES.filter((a) => a.day === 'Tue');

export const RETREAT = {
  title: 'Event Planner Retreat at Happy Valley Farms',
  subtitle: 'A private two-day gathering at Happy Valley Farms',
  dates: 'Monday, August 3rd through Tuesday, August 4th',
  deadline: 'Reply by July 13th',
};
