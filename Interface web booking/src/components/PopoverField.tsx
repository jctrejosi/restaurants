import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

type PopoverFieldProps = {
  icon: ReactNode;
  label: string;
  value?: string;
  placeholder: string;
  className?: string;
  children: (close: () => void) => ReactNode;
};

export default function PopoverField({
  icon,
  label,
  value,
  placeholder,
  className = "",
  children,
}: PopoverFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`popover-field ${className} ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        aria-expanded={open}
        className="popover-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="popover-label">{icon} {label}</span>
        <span className="popover-value">
          <span className={value ? "" : "is-placeholder"}>{value || placeholder}</span>
          <Icon name="chevron" size={15}/>
        </span>
      </button>
      {open && <div className="popover-panel">{children(() => setOpen(false))}</div>}
    </div>
  );
}
