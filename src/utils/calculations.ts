export function calculateDilution(dose: number, targetStrength: number) {
  if (targetStrength <= 0) return 0;
  return dose / targetStrength;
}
