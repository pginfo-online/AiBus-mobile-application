export type PassengerGender = "M" | "F" | "O";
export interface SavedPassenger {
  id: string;
  name: string;
  dateOfBirth: string | null;
  age: number | null;
  ageRecordedOn: string | null;
  gender: PassengerGender;
  mobile: string | null;
}
export interface PassengerInput {
  name: string;
  dateOfBirth?: string | null;
  age?: number | null;
  gender: PassengerGender;
  mobile?: string | null;
}

export function passengerAge(
  passenger: Pick<SavedPassenger, "dateOfBirth" | "age" | "ageRecordedOn">,
  on = new Date(),
): number {
  const date = passenger.dateOfBirth || passenger.ageRecordedOn;
  if (!date) return passenger.age ?? 0;
  const birth = new Date(date);
  let years = on.getFullYear() - birth.getUTCFullYear();
  if (
    on.getMonth() < birth.getUTCMonth() ||
    (on.getMonth() === birth.getUTCMonth() && on.getDate() < birth.getUTCDate())
  )
    years--;
  return passenger.dateOfBirth ? years : (passenger.age ?? 0) + years;
}
export function validBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  const age = passengerAge({
    dateOfBirth: value,
    age: null,
    ageRecordedOn: null,
  });
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date() &&
    age >= 0 &&
    age <= 120
  );
}
export const validMobile = (value: string) => /^[6-9]\d{9}$/.test(value);
export const validEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validGstin = (value: string) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value);

// Preserve occupied seats when deselecting; don't move a passenger into a gender-restricted seat.
export function availableSeatIndex(
  seats: { requiredGender?: "M" | "F" }[],
  assignments: (string | null)[],
  gender: PassengerGender,
) {
  return seats.findIndex(
    (seat, index) =>
      !assignments[index] &&
      (!seat.requiredGender || seat.requiredGender === gender),
  );
}
