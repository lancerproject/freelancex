// Read-only star display. `value` is 0–5 (can be fractional, e.g. 4.3).

export function StarRating({
  value,
  size = "text-base",
}: {
  value: number;
  size?: string;
}) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex items-center ${size}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}
