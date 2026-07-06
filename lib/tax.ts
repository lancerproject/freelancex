// A freelancer must complete and certify their tax information (Form W-9 for
// U.S. persons, or a W-8 for everyone else) before they can withdraw funds.
// This checks the saved tax_info JSON has the essentials filled and certified.
export function taxInfoComplete(taxInfoJson?: string | null): boolean {
  if (!taxInfoJson) return false;
  try {
    const t = JSON.parse(taxInfoJson);
    // `submitted` is set true only when all sections (residence + taxpayer
    // identification + TIN/certification) are complete — the authoritative
    // signal that the form is done. The legacy single-form save also sets it.
    return Boolean(t.submitted);
  } catch {
    return false;
  }
}
