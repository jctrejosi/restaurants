import Icon from "./Icon";
import PopoverField from "./PopoverField";
import TimeSlots from "./TimeSlots";
import type { Slot } from "@/lib/availability";

export default function TimeField({
  date,
  slots,
  value,
  onChange,
  className,
}: {
  date: string;
  slots: Slot[];
  value: string;
  onChange: (time: string) => void;
  className?: string;
}) {
  return (
    <PopoverField
      className={className}
      icon={<Icon name="clock" size={17}/>}
      label="Hora"
      placeholder={date ? "Elige una hora" : "Elige fecha"}
      value={value || undefined}
    >
      {(close) =>
        date ? (
          <TimeSlots
            onChange={(time) => { onChange(time); close(); }}
            slots={slots}
            value={value}
          />
        ) : (
          <p className="popover-hint">Primero elige un día para ver los horarios.</p>
        )
      }
    </PopoverField>
  );
}
