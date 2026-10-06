import type { Slot, SlotPeriod } from "@/lib/availability";

const PERIODS: SlotPeriod[] = ["Comida", "Cena"];

export default function TimeSlots({
  slots,
  value,
  onChange,
}: {
  slots: Slot[];
  value: string;
  onChange: (time: string) => void;
}) {
  return (
    <div className="slot-picker">
      {PERIODS.map((period) => {
        const group = slots.filter((slot) => slot.period === period);
        if (group.length === 0) return null;
        const openCount = group.filter((slot) => slot.available).length;

        return (
          <div className="slot-block" key={period}>
            <span className="slot-label">
              {period}
              <em>{openCount > 0 ? `${openCount} disponibles` : "Sin mesas"}</em>
            </span>
            <div className="slot-grid">
              {group.map((slot) => (
                <button
                  aria-pressed={slot.time === value}
                  className={`slot-chip ${slot.time === value ? "is-selected" : ""}`}
                  disabled={!slot.available}
                  key={slot.time}
                  onClick={() => onChange(slot.time)}
                  type="button"
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
