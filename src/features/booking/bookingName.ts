export function isValidBookingName(value: string): boolean {
  const name = value.trim();
  return /^\p{L}[\p{L}\p{M} .'’\-]*$/u.test(name)
    && (name.match(/\p{L}/gu)?.length ?? 0) >= 2;
}
