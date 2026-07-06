// Small status dot shown next to a user's name in chat.
// Green = online for messages, light grey = offline.

export function PresenceDot({
  online,
  className = "",
}: {
  online: boolean;
  className?: string;
}) {
  return (
    <span
      title={online ? "Online" : "Offline"}
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        online ? "bg-primary" : "bg-neutral-300"
      } ${className}`}
    />
  );
}
