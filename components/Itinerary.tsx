import { MONDAY_ACTIVITIES, TUESDAY_ACTIVITIES, type ActivityItem } from '@/lib/retreat';

function DayList({ title, items }: { title: string; items: ActivityItem[] }) {
  return (
    <div className="itin-day">
      <h3>{title}</h3>
      <ul className="itin-list">
        {items.map((a) => (
          <li key={a.key}>
            <span className="itin-time">
              {a.day} · {a.time}
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
      <DayList title="Monday, August Third" items={MONDAY_ACTIVITIES} />
      <DayList title="Tuesday, August Fourth" items={TUESDAY_ACTIVITIES} />
    </section>
  );
}
