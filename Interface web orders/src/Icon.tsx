import type { ReactNode } from "react";

export type IconName =
  | "arrow"
  | "bag"
  | "bike"
  | "card"
  | "cash"
  | "chevron"
  | "check"
  | "clock"
  | "close"
  | "leaf"
  | "minus"
  | "pin"
  | "plus"
  | "receipt"
  | "search"
  | "store"
  | "transfer"
  | "user";

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bag: <><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    bike: <><circle cx="5" cy="17" r="3" /><circle cx="19" cy="17" r="3" /><path d="m5 17 4-8h4l3 8M8 12h7M14 7h3" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
    cash: <><rect x="2.5" y="6.5" width="19" height="11" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 13 4 4L19 7" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    leaf: <><path d="M19 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 9-15Z" /><path d="M5 20c2-5 5-8 10-11" /></>,
    minus: <path d="M5 12h14" />,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    receipt: <><path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21V3Z" /><path d="M9 8h6M9 12h6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    store: <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6" /><path d="M8 20v-6h8v6" /></>,
    transfer: <><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
