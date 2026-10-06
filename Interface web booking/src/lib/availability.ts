/**
 * Mock availability so the calendar feels alive before the backend exists.
 * Everything here is deterministic: the same date always yields the same
 * slots, which keeps the UI stable across renders and easy to swap later.
 */

export type SlotPeriod = "Comida" | "Cena";

export type Slot = {
  time: string;
  period: SlotPeriod;
  available: boolean;
};

const LUNCH_SLOTS = ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];
const DINNER_SLOTS = ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"];

function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function getSlots(iso: string): Slot[] {
  const all: Omit<Slot, "available">[] = [
    ...LUNCH_SLOTS.map((time) => ({ time, period: "Comida" as const })),
    ...DINNER_SLOTS.map((time) => ({ time, period: "Cena" as const })),
  ];

  return all.map((slot) => {
    // Evenings fill up faster than midday, mirroring a real restaurant.
    const closedBelow = slot.period === "Cena" ? 0.16 : 0.34;
    const roll = (hash(`${iso}|${slot.time}`) % 100) / 100;
    return { ...slot, available: roll >= closedBelow };
  });
}

export function getAvailabilityCount(iso: string): number {
  return getSlots(iso).filter((slot) => slot.available).length;
}

/** Short, human-friendly reservation code, e.g. "PC-8K3QF". */
export function reservationCode(date: string, time: string, people: number): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let value = hash(`${date}|${time}|${people}`);
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  return `PC-${code}`;
}
