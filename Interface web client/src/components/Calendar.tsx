import { useMemo, useState } from "react";
import Icon from "./Icon";
import {
  addDays,
  addMonths,
  fromISODate,
  startOfMonth,
  toISODate,
  todayISO,
} from "@/lib/dates";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

type CalendarProps = {
  value: string;
  onChange: (iso: string) => void;
  min: string;
  max: string;
  /** Free-slot count per ISO date, used for the availability dot. */
  availability?: (iso: string) => number;
};

function isBetween(iso: string, min: string, max: string): boolean {
  return iso >= min && iso <= max;
}

export default function Calendar({ value, onChange, min, max, availability }: CalendarProps) {
  const today = todayISO();
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value ? fromISODate(value) : fromISODate(min)),
  );

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    // getDay(): 0=Sunday..6=Saturday — shift so the week starts on Monday.
    const offset = (first.getDay() + 6) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [viewMonth]);

  const minMonth = startOfMonth(fromISODate(min));
  const maxMonth = startOfMonth(fromISODate(max));
  const canGoPrev = viewMonth > minMonth;
  const canGoNext = viewMonth < maxMonth;

  const quickPicks = useMemo(() => {
    const todayDate = fromISODate(today);
    const daysToSaturday = (6 - todayDate.getDay() + 7) % 7;
    return [
      { label: "Hoy", iso: today },
      { label: "Mañana", iso: toISODate(addDays(todayDate, 1)) },
      { label: "Este finde", iso: toISODate(addDays(todayDate, daysToSaturday)) },
    ];
  }, [today]);

  return (
    <div className="booking-calendar">
      <div className="calendar-head">
        <span className="calendar-month">{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
        <div className="calendar-nav">
          <button aria-label="Mes anterior" disabled={!canGoPrev} onClick={() => setViewMonth(addMonths(viewMonth, -1))} type="button">
            <Icon name="chevronLeft" size={17}/>
          </button>
          <button aria-label="Mes siguiente" disabled={!canGoNext} onClick={() => setViewMonth(addMonths(viewMonth, 1))} type="button">
            <Icon name="chevron" size={17}/>
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-grid" role="grid">
        {cells.map((day) => {
          const iso = toISODate(day);
          const outside = day.getMonth() !== viewMonth.getMonth();
          const disabled = !isBetween(iso, min, max);
          const selected = iso === value;
          const count = availability ? availability(iso) : undefined;
          const dotState = count === undefined ? null : count === 0 ? "is-full" : count <= 3 ? "is-low" : "is-open";
          const classes = [
            "calendar-day",
            outside ? "is-outside" : "",
            disabled ? "is-disabled" : "",
            selected ? "is-selected" : "",
            iso === today ? "is-today" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              aria-label={iso}
              aria-pressed={selected}
              className={classes}
              disabled={disabled || outside}
              key={iso}
              onClick={() => onChange(iso)}
              type="button"
            >
              <span>{day.getDate()}</span>
              {!outside && !disabled && dotState && <i className={`day-dot ${dotState}`}/>}
            </button>
          );
        })}
      </div>

      <div className="calendar-quick">
        {quickPicks.map((pick) => (
          <button
            disabled={!isBetween(pick.iso, min, max)}
            key={pick.label}
            onClick={() => { onChange(pick.iso); setViewMonth(startOfMonth(fromISODate(pick.iso))); }}
            type="button"
          >
            {pick.label}
          </button>
        ))}
      </div>
    </div>
  );
}
