import { WizardProgress } from "@/components/wizard-progress";

// Wraps every "create your profile" step with a shared progress strip at the
// very top, so the user always sees how far along they are (and, combined with
// profile_step resume, exactly where they left off).
export default function CreateProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <WizardProgress />
      {children}
    </>
  );
}
