// "$0 earned" / "$7K+ earned" style label for a freelancer's lifetime earnings
// on Xwork — shown on proposal cards and the proposal detail (like Upwork).
export function earnedLabel(n: number): string {
  if (!n || n <= 0) return "$0 earned";
  if (n >= 1000) return `$${Math.floor(n / 1000)}K+ earned`;
  if (n >= 100) return `$${Math.floor(n / 100) * 100}+ earned`;
  return "$1+ earned";
}
