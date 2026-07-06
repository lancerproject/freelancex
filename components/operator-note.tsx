import { OPERATOR } from "@/lib/legal";

// Small "operated by" block shown at the top of every legal page. Reads from
// the single OPERATOR record in lib/legal.ts. Fields left blank are hidden.
export function OperatorNote() {
  const parts: { label: string; value: string }[] = [];
  if (OPERATOR.entity) parts.push({ label: "Operated by", value: OPERATOR.entity });
  if (OPERATOR.address) parts.push({ label: "Registered address", value: OPERATOR.address });
  if (OPERATOR.email) parts.push({ label: "Contact", value: OPERATOR.email });
  if (OPERATOR.jurisdiction)
    parts.push({ label: "Governing law", value: OPERATOR.jurisdiction });

  if (parts.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <dl className="text-[10px] text-neutral-600 leading-relaxed space-y-0.5">
        {parts.map((p) => (
          <div key={p.label}>
            <span className="font-semibold text-neutral-700">{p.label}:</span>{" "}
            {p.value}
          </div>
        ))}
      </dl>
    </div>
  );
}
