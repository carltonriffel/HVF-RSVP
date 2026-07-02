import { MONDAY_ITINERARY, TUESDAY_ITINERARY, type ItineraryItem } from '@/lib/retreat';

function DayList({ title, items }: { title: string; items: ItineraryItem[] }) {
  return (
    <div className="itin-day">
      <h3>{title}</h3>
      <ul className="itin-list">
        {items.map((a) => (
          <li key={a.label}>
            <span className="itin-time">
              <span className="t-day">{a.day}</span>
              <span className="t-hour">{a.time}</span>
            </span>
            <span className="itin-body">
              <strong>{a.label}</strong>
              {a.detail ? <span className="detail"> — {a.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Itinerary() {
  return (
    <section className="card" aria-labelledby="itinerary-heading">
      <p className="eyebrow section-eyebrow">The Two Days</p>
      <h2 id="itinerary-heading">Itinerary</h2>
      <DayList title="Monday, August 3" items={MONDAY_ITINERARY} />
      <DayList title="Tuesday, August 4" items={TUESDAY_ITINERARY} />
    </section>
  );
}
