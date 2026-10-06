import Calendar from "./Calendar";
import Icon from "./Icon";
import PopoverField from "./PopoverField";
import { formatLongDate } from "@/lib/dates";

export default function DateField({
  value,
  onChange,
  min,
  max,
  availability,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  min: string;
  max: string;
  availability?: (iso: string) => number;
  className?: string;
}) {
  return (
    <PopoverField
      className={className}
      icon={<Icon name="calendar" size={17}/>}
      label="Fecha"
      placeholder="Elige un día"
      value={value ? formatLongDate(value) : undefined}
    >
      {(close) => (
        <Calendar
          availability={availability}
          max={max}
          min={min}
          onChange={(iso) => { onChange(iso); close(); }}
          value={value}
        />
      )}
    </PopoverField>
  );
}
