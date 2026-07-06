// Maps each category to a representative line icon (brand purple).
// Used on the landing-page category grid.

const ICONS: Record<string, React.ReactNode> = {
  "Web Development": (
    <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 7l-4 10" />
  ),
  "Mobile Development": (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  "Design & Creative": (
    <>
      <path d="M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-.5-.3-.9-.6-1.2-.3-.3-.4-.6-.4-1 0-.7.6-1.3 1.3-1.3H15a6 6 0 006-6c0-3.9-4-6.7-9-6.7z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="14.5" cy="7.5" r="1" />
      <circle cx="17" cy="11" r="1" />
    </>
  ),
  "Writing & Translation": (
    <path d="M12 19l7-7a2.1 2.1 0 00-3-3l-7 7-1 4 4-1z" />
  ),
  "Marketing & Sales": (
    <>
      <path d="M3 11l14-6v14L3 13z" />
      <path d="M7 12v4a2 2 0 004 0" />
      <path d="M17 8a3 3 0 010 6" />
    </>
  ),
  "Data & Analytics": (
    <>
      <path d="M5 21V10M10 21V4M15 21v-7M20 21V8" />
    </>
  ),
  "Admin & Customer Support": (
    <>
      <path d="M4 17v-4a8 8 0 0116 0v4" />
      <rect x="3" y="16" width="3" height="5" rx="1" />
      <rect x="18" y="16" width="3" height="5" rx="1" />
    </>
  ),
  "Video & Animation": (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  "Music & Audio": (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </>
  ),
  "Finance & Accounting": (
    <>
      <path d="M4 9l8-5 8 5" />
      <path d="M5 9v8M19 9v8M9 9v8M15 9v8M3 21h18" />
    </>
  ),
  "Engineering & Architecture": (
    <>
      <path d="M14.7 6.3a4 4 0 00-5.2 5.2L3 18v3h3l6.5-6.5a4 4 0 005.2-5.2l-2.6 2.6-2-2 2.6-2.6z" />
    </>
  ),
  "Cybersecurity & IT": (
    <>
      <path d="M12 3l7 3v5c0 4.4-3 8.3-7 9.5C8 19.3 5 15.4 5 11V6z" />
      <path d="M9.5 12l1.7 1.7L15 10" />
    </>
  ),
  Other: (
    <>
      <circle cx="6" cy="6" r="1.5" />
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="18" cy="6" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
      <circle cx="6" cy="18" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
    </>
  ),
};

export function CategoryIcon({ name }: { name: string }) {
  return (
    <svg
      className="h-8 w-8 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name] ?? ICONS.Other}
    </svg>
  );
}
