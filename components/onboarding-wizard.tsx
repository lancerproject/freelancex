"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveOnboarding } from "@/app/onboarding/actions";

type Option = { value: string; label: string; emoji: string };
type Step = {
  name: "experience" | "goal" | "availability";
  question: string;
  subtitle: string;
  options: Option[];
};

// Original Xwork onboarding questions, laid out like Upwork's "a few quick
// questions" flow (3 steps, progress bar, selectable cards).
const STEPS: Step[] = [
  {
    name: "experience",
    question: "A few quick questions: first, have you freelanced before?",
    subtitle:
      "This helps us know how much guidance to give you. We won't share your answer with anyone, including clients.",
    options: [
      { value: "new", label: "I am brand new to this", emoji: "🔍" },
      { value: "some", label: "I have some experience", emoji: "✏️" },
      { value: "expert", label: "I am an expert", emoji: "💼" },
    ],
  },
  {
    name: "goal",
    question: "Got it. What's your biggest goal for freelancing?",
    subtitle:
      "People freelance for all kinds of reasons. Tell us yours so we can highlight the opportunities that fit your goals — while still showing you everything.",
    options: [
      { value: "main_income", label: "To earn my main income", emoji: "💰" },
      { value: "side_money", label: "To make money on the side", emoji: "💵" },
      {
        value: "experience",
        label: "To get experience, for a full-time job",
        emoji: "🏅",
      },
      { value: "no_goal", label: "I don't have a goal in mind yet", emoji: "🔍" },
    ],
  },
  {
    name: "availability",
    question: "How do you want to work?",
    subtitle:
      "Let us know how much time you'd like to put in. This just helps us match you better.",
    options: [
      { value: "part", label: "Part-time, a few hours a week", emoji: "🕐" },
      { value: "full", label: "Full-time, I'm all in", emoji: "🚀" },
      { value: "flex", label: "Whenever the right job comes up", emoji: "🌙" },
    ],
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showError, setShowError] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const select = (value: string) => {
    setShowError(false);
    setAnswers((a) => ({ ...a, [current.name]: value }));
  };

  const finish = () => {
    const fd = new FormData();
    fd.set("experience", answers.experience || "");
    fd.set("goal", answers.goal || "");
    fd.set("availability", answers.availability || "");
    startTransition(() => saveOnboarding(fd));
  };

  const back = () => {
    setShowError(false);
    if (step === 0) router.push("/get-started");
    else setStep((s) => s - 1);
  };

  // Move forward without requiring an answer (used by "Skip for now").
  const advance = () => {
    setShowError(false);
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  // "Next" requires a selection first; otherwise show the required message.
  const next = () => {
    if (!answers[current.name]) {
      setShowError(true);
      return;
    }
    advance();
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
      {/* progress */}
      <div className="text-sm text-neutral-500 mb-2">
        {step + 1}/{STEPS.length}
      </div>
      <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden mb-10">
        <div
          className="h-full bg-neutral-900 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        {current.question}
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">{current.subtitle}</p>

      <div
        className={`grid grid-cols-1 gap-5 mt-10 ${
          current.options.length >= 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-3"
        }`}
      >
        {current.options.map((opt) => {
          const selected = answers[current.name] === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={`relative text-left rounded-xl border p-6 h-56 flex flex-col justify-between transition ${
                selected
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-neutral-200 hover:border-neutral-400"
              }`}
            >
              {/* radio */}
              <span
                className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-neutral-300"
                }`}
              >
                {selected && <span className="text-xs">✓</span>}
              </span>
              <div className="text-5xl">{opt.emoji}</div>
              <div className="text-xl font-medium text-neutral-900">
                {opt.label}
              </div>
            </button>
          );
        })}
      </div>

      {showError && (
        <p className="mt-4 text-sm text-red-600 flex items-center gap-1.5">
          <span>⚠</span> This field is required. Please pick an option or choose
          “Skip for now”.
        </p>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-10">
        <button
          type="button"
          onClick={back}
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </button>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={advance}
            disabled={pending}
            className="text-neutral-700 font-medium hover:underline disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={next}
            disabled={pending}
            className="px-7 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {pending
              ? "Saving…"
              : isLast
              ? "Next, create a profile"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
