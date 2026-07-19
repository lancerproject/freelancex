"use client";

import { useState } from "react";
import { createJob } from "./actions";
import { CATEGORIES, DURATIONS } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { SKILLS_BY_CATEGORY, DEFAULT_SKILLS, ALL_SKILLS } from "@/lib/skills";

const PROJECT_SIZES = [
  {
    value: "large",
    label: "Large",
    desc: "Longer term or complex initiatives (ex. set up day-to-day processes to manage projects and operations)",
  },
  {
    value: "medium",
    label: "Medium",
    desc: "Well-defined projects (ex. update and maintain CRM records for the sales team)",
  },
  {
    value: "small",
    label: "Small",
    desc: "Quick and straightforward tasks (ex. build a contact list from web research)",
  },
];

const EXPERIENCE_OPTIONS = [
  { value: "entry", label: "Entry", desc: "Looking for someone relatively new to this field" },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "Looking for substantial experience in this field",
  },
  {
    value: "expert",
    label: "Expert",
    desc: "Looking for comprehensive and deep expertise in this field",
  },
];

const ENGLISH_LEVELS = [
  { value: "", label: "Any level" },
  { value: "conversational", label: "Conversational" },
  { value: "fluent", label: "Fluent" },
  { value: "native", label: "Native or Bilingual" },
];

const TITLE_EXAMPLES = [
  "Build responsive WordPress site with booking/payment functionality",
  "Graphic designer needed to design ad creative for multiple campaigns",
  "Facebook ad specialist needed for product launch",
];

const STEP_LABELS = ["Title", "Skills", "Scope", "Budget", "Description"];

export default function NewJobWizard() {
  const [step, setStep] = useState(0); // 0 = get started; 1..5 = the 5 steps
  const [projectLength, setProjectLength] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState("intermediate");
  const [duration, setDuration] = useState("1_to_3_months");
  const [projectSize, setProjectSize] = useState("medium");
  const [contractToHire, setContractToHire] = useState("no");
  const [englishLevel, setEnglishLevel] = useState("");
  const [otherQuals, setOtherQuals] = useState("");
  const [talentLocation, setTalentLocation] = useState("worldwide");
  const jobType = "fixed";
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [screeningQuestions, setScreeningQuestions] = useState<string[]>([]);
  const [questionInput, setQuestionInput] = useState("");

  const addQuestion = () => {
    const v = questionInput.trim();
    if (v && screeningQuestions.length < 8 && !screeningQuestions.includes(v)) {
      setScreeningQuestions([...screeningQuestions, v]);
    }
    setQuestionInput("");
  };
  const removeQuestion = (i: number) =>
    setScreeningQuestions(screeningQuestions.filter((_, x) => x !== i));

  const addSkill = (s: string) => {
    const v = s.trim();
    if (v && skills.length < 10 && !skills.includes(v)) {
      setSkills([...skills, v]);
    }
    setSkillInput("");
  };
  const removeSkill = (s: string) =>
    setSkills(skills.filter((x) => x !== s));

  const progress = step === 0 ? 0 : Math.min(step, 5) / 5;

  // ---- Validation per step ----
  const canContinue =
    (step === 0 && projectLength) ||
    (step === 1 && title.trim()) ||
    (step === 2 && skills.length > 0) ||
    step === 3 ||
    (step === 4 && budget) ||
    (step === 5 && description.trim());

  const next = () => setStep((s) => Math.min(s + 1, 6));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Human-readable scope summary for the review screen
  const scopeSummary = [
    PROJECT_SIZES.find((s) => s.value === projectSize)?.label,
    DURATIONS.find((d) => d.value === duration)?.label,
    EXPERIENCE_OPTIONS.find((e) => e.value === experience)?.label
      ? `${EXPERIENCE_OPTIONS.find((e) => e.value === experience)?.label} level`
      : null,
    contractToHire === "yes"
      ? "Contract-to-hire"
      : "Not planning to hire full time",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 px-4 lg:px-12 py-12 max-w-6xl mx-auto w-full">
        {/* Step number label */}
        {step >= 1 && (
          <p className="text-sm text-muted-foreground mb-6">
            {step}/5 &nbsp;&nbsp; Job post
          </p>
        )}

        {/* ---------- STEP 0: Get started ---------- */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              How can we help you get started?
            </h1>
            <div className="space-y-4">
              <p className="text-foreground font-medium">
                I want to create a new job post
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ChoiceCard
                  selected={projectLength === "long"}
                  onClick={() => setProjectLength("long")}
                  title="Long term project"
                  desc="More than thirty hours a week and/or will be longer than three months."
                />
                <ChoiceCard
                  selected={projectLength === "short"}
                  onClick={() => setProjectLength("short")}
                  title="Short term project"
                  desc="Less than thirty hours a week and/or will be shorter than three months."
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 1: Title + Category ---------- */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Let&apos;s start with a strong title.
              </h1>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                This helps your job post stand out to the right candidates.
                It&apos;s the first thing they&apos;ll see, so make it count!
              </p>
            </div>
            <div>
              <label className="block text-foreground mb-2">
                Write a title for your job post
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Build a responsive landing page"
                className="w-full bg-background border border-border text-foreground rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <p className="text-foreground font-semibold mt-6 mb-2">
                Example titles
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                {TITLE_EXAMPLES.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <p className="text-foreground font-semibold mt-8 mb-2">
                Job category
              </p>
              <div className="space-y-2">
                {CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-3 cursor-pointer text-foreground"
                  >
                    <input
                      type="radio"
                      name="cat"
                      checked={category === c}
                      onChange={() => setCategory(c)}
                      className="accent-primary w-4 h-4"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 2: Skills ---------- */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <h1 className="text-4xl font-bold text-foreground">
              What are the main skills required for your work?
            </h1>
            <div>
              <label className="block text-foreground mb-2">
                Search or add up to 10 skills
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addSkill(skillInput);
                }}
              >
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type a skill, e.g. Ethical Hacking"
                  className="w-full bg-background border border-border text-foreground rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </form>

              {/* Live suggestions as you type */}
              {skillInput.trim() && (
                <div className="mt-2 rounded-lg border border-border bg-card max-h-56 overflow-y-auto">
                  {ALL_SKILLS.filter(
                    (s) =>
                      s.toLowerCase().includes(skillInput.toLowerCase()) &&
                      !skills.includes(s)
                  )
                    .slice(0, 10)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary transition"
                      >
                        {s}
                      </button>
                    ))}
                  {/* Allow adding the exact typed text if it's not in the list */}
                  {!ALL_SKILLS.some(
                    (s) => s.toLowerCase() === skillInput.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      onClick={() => addSkill(skillInput)}
                      className="block w-full text-left px-4 py-2 text-sm text-primary hover:bg-secondary transition"
                    >
                      + Add &quot;{skillInput.trim()}&quot;
                    </button>
                  )}
                </div>
              )}

              <p className="text-muted-foreground text-sm mt-2">
                For the best results, add 3-5 skills
              </p>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {skills.map((s) => (
                    <button
                      key={s}
                      onClick={() => removeSkill(s)}
                      className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm"
                    >
                      {s} ✕
                    </button>
                  ))}
                </div>
              )}

              <p className="text-foreground font-semibold mt-8 mb-3">
                Popular {category} skills
              </p>
              <div className="flex flex-wrap gap-2">
                {(SKILLS_BY_CATEGORY[category] ?? DEFAULT_SKILLS)
                  .filter((s) => !skills.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="border border-border text-foreground rounded-full px-3 py-1 text-sm hover:border-primary transition"
                    >
                      {s} +
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 3: Scope ---------- */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Next, estimate the scope of your work.
              </h1>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                These aren&apos;t final answers, but this information helps us
                recommend the right talent for what you need.
              </p>
            </div>
            <div className="space-y-10">
              {/* Project size */}
              <div className="space-y-3">
                {PROJECT_SIZES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-start gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="size"
                      checked={projectSize === s.value}
                      onChange={() => setProjectSize(s.value)}
                      className="accent-primary w-4 h-4 mt-1"
                    />
                    <span>
                      <span className="block text-foreground font-medium">
                        {s.label}
                      </span>
                      <span className="block text-muted-foreground text-sm">
                        {s.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Duration */}
              <div>
                <p className="text-foreground font-semibold mb-3">
                  How long will your work take?
                </p>
                <div className="space-y-2">
                  {DURATIONS.map((d) => (
                    <label
                      key={d.value}
                      className="flex items-center gap-3 cursor-pointer text-foreground"
                    >
                      <input
                        type="radio"
                        name="dur"
                        checked={duration === d.value}
                        onChange={() => setDuration(d.value)}
                        className="accent-primary w-4 h-4"
                      />
                      {d.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div>
                <p className="text-foreground font-semibold">
                  What level of experience will it need?
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  This won&apos;t restrict any proposals, but helps match
                  expertise to your budget.
                </p>
                <div className="space-y-3">
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <label
                      key={e.value}
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="exp"
                        checked={experience === e.value}
                        onChange={() => setExperience(e.value)}
                        className="accent-primary w-4 h-4 mt-1"
                      />
                      <span>
                        <span className="block text-foreground font-medium">
                          {e.label}
                        </span>
                        <span className="block text-muted-foreground text-sm">
                          {e.desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contract-to-hire */}
              <div>
                <p className="text-foreground font-semibold">
                  Is this job a contract-to-hire opportunity?
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  This helps set expectations with talent and won&apos;t
                  restrict who can submit proposals.
                </p>
                <div className="space-y-2">
                  {[
                    { value: "yes", label: "Yes, this could become full time" },
                    { value: "no", label: "No, not at this time" },
                  ].map((o) => (
                    <label
                      key={o.value}
                      className="flex items-center gap-3 cursor-pointer text-foreground"
                    >
                      <input
                        type="radio"
                        name="cth"
                        checked={contractToHire === o.value}
                        onChange={() => setContractToHire(o.value)}
                        className="accent-primary w-4 h-4"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Where can talent be located? */}
              <div>
                <p className="text-foreground font-semibold">
                  Where can talent be located?
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  Choose who can apply — anywhere in the world, or only a
                  specific country.
                </p>
                <select
                  value={talentLocation}
                  onChange={(e) => setTalentLocation(e.target.value)}
                  className="w-full max-w-xs bg-background border border-border text-foreground rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="worldwide">Worldwide</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred qualifications (optional) */}
              <div>
                <p className="text-foreground font-semibold">
                  Preferred qualifications{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  These are preferences, not requirements — they won&apos;t stop
                  anyone from applying. Leave blank to skip.
                </p>
                <label className="block text-sm text-foreground mb-1">
                  English level
                </label>
                <select
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value)}
                  className="w-full max-w-xs bg-background border border-border text-foreground rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ENGLISH_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>

                <label className="block text-sm text-foreground mt-4 mb-1">
                  Other preferred qualifications
                </label>
                <textarea
                  value={otherQuals}
                  onChange={(e) => setOtherQuals(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="e.g. Experience with iOS apps, available in US time zones…"
                  className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 4: Budget ---------- */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Tell us about your budget.
              </h1>
              <p className="text-muted-foreground mt-4 leading-relaxed">
                This will help us match you to talent within your range.
              </p>
            </div>
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary bg-primary/10 p-5 flex items-start justify-between">
                <span>
                  <span className="block text-2xl mb-2">🏷️</span>
                  <span className="font-semibold text-foreground">
                    Fixed price
                  </span>
                </span>
                <span className="w-4 h-4 rounded-full border border-primary bg-primary mt-1" />
              </div>

              <p className="text-muted-foreground text-sm">
                Set a total price for the project and pay when the work is
                delivered. You can divide it into milestones with your
                freelancer.
              </p>

              <div>
                <p className="text-foreground font-semibold">
                  What is the best cost estimate for your project?
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  You can negotiate this cost and create milestones when you
                  chat with your freelancer.
                </p>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="500.00"
                    className="w-full bg-background border border-border text-foreground rounded-lg py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setBudget("0");
                  next();
                }}
                className="text-primary font-medium text-sm hover:underline"
              >
                Not ready to set a budget?
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 5: Description ---------- */}
        {step === 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Start the conversation.
              </h1>
              <p className="text-foreground mt-6">Talent are looking for:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>Clear expectations about your task or deliverables</li>
                <li>The skills required for your work</li>
                <li>Good communication</li>
                <li>Details about how you or your team like to work</li>
              </ul>
            </div>
            <div>
              <label className="block text-foreground mb-2">
                Describe what you need
              </label>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 50000))
                }
                rows={10}
                placeholder="Already have a description? Paste it here!"
                className="w-full bg-background border border-border text-foreground rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-right text-xs text-muted-foreground mt-1">
                {(50000 - description.length).toLocaleString()} characters left
              </p>

              <p className="text-foreground font-medium mt-6">Need help?</p>
              <p className="text-primary text-sm mt-1">
                See examples of effective descriptions
              </p>

              <label className="inline-flex items-center gap-2 mt-6 border border-border rounded-full px-5 py-2.5 cursor-pointer hover:bg-secondary transition text-foreground">
                📎 Attach file
                <input type="file" className="hidden" />
              </label>
              <p className="text-muted-foreground text-xs mt-2">
                Max file size: 100MB
              </p>

              {/* Screening questions (optional) */}
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-foreground font-semibold">
                  Screening questions{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </p>
                <p className="text-muted-foreground text-sm mb-3">
                  Ask applicants specific questions — they&apos;ll answer these
                  in their proposal.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addQuestion();
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="e.g. Share a link to similar work you've done"
                    className="flex-1 bg-background border border-border text-foreground rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="submit"
                    className="border border-primary text-primary rounded-lg px-4 py-2.5 font-medium hover:bg-primary/10 shrink-0"
                  >
                    Add
                  </button>
                </form>
                {screeningQuestions.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {screeningQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground"
                      >
                        <span>
                          {i + 1}. {q}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(i)}
                          className="text-orange-500 hover:underline shrink-0"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- STEP 6: Review ("Job details") ---------- */}
        {step === 6 && (
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Job details
            </h1>

            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              <ReviewRow label={null} onEdit={() => setStep(1)}>
                <p className="text-lg font-semibold text-foreground">
                  {title || "—"}
                </p>
              </ReviewRow>
              <ReviewRow label={null} onEdit={() => setStep(5)}>
                <p className="text-muted-foreground whitespace-pre-wrap break-words">
                  {description || "No description yet"}
                </p>
              </ReviewRow>
              <ReviewRow label="Category" onEdit={() => setStep(1)}>
                <p className="text-foreground">{category}</p>
              </ReviewRow>
              <ReviewRow label="Skills" onEdit={() => setStep(2)}>
                <div className="flex flex-wrap gap-2">
                  {skills.length ? (
                    skills.map((s) => (
                      <span
                        key={s}
                        className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </ReviewRow>
              <ReviewRow label="Scope" onEdit={() => setStep(3)}>
                <p className="text-foreground">{scopeSummary}</p>
              </ReviewRow>
              <ReviewRow label="Budget" onEdit={() => setStep(4)}>
                <p className="text-foreground">${budget || "0"} (fixed price)</p>
              </ReviewRow>
              <ReviewRow label="Talent location" onEdit={() => setStep(3)}>
                <p className="text-foreground">
                  {talentLocation === "worldwide" ? "Worldwide" : talentLocation}
                </p>
              </ReviewRow>
              {(englishLevel || otherQuals.trim()) && (
                <ReviewRow label="Preferred qualifications" onEdit={() => setStep(3)}>
                  <div className="text-foreground space-y-1">
                    {englishLevel && (
                      <p>
                        English level:{" "}
                        {ENGLISH_LEVELS.find((l) => l.value === englishLevel)?.label}
                      </p>
                    )}
                    {otherQuals.trim() && (
                      <p className="whitespace-pre-wrap">{otherQuals}</p>
                    )}
                  </div>
                </ReviewRow>
              )}
              {screeningQuestions.length > 0 && (
                <ReviewRow label="Screening questions" onEdit={() => setStep(5)}>
                  <ul className="text-foreground list-decimal pl-5 space-y-1">
                    {screeningQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </ReviewRow>
              )}
            </div>

            {/* Finalize — publish or save as draft */}
            <form className="flex flex-wrap gap-3 mt-6">
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="skills" value={skills.join(", ")} />
              <input type="hidden" name="experience_level" value={experience} />
              <input type="hidden" name="duration" value={duration} />
              <input type="hidden" name="job_type" value={jobType} />
              <input type="hidden" name="budget" value={budget || "0"} />
              <input type="hidden" name="project_size" value={projectSize} />
              <input
                type="hidden"
                name="contract_to_hire"
                value={contractToHire}
              />
              <input type="hidden" name="talent_location" value={talentLocation} />
              <input type="hidden" name="english_level" value={englishLevel} />
              <input
                type="hidden"
                name="preferred_qualifications"
                value={otherQuals}
              />
              <input type="hidden" name="description" value={description} />
              <input
                type="hidden"
                name="screening_questions"
                value={JSON.stringify(screeningQuestions)}
              />

              <button
                formAction={createJob.bind(null, "open")}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:opacity-90 transition"
              >
                Post this job
              </button>
              <button
                formAction={createJob.bind(null, "draft")}
                className="border border-border text-foreground px-8 py-3 rounded-full font-semibold hover:bg-secondary transition"
              >
                Save as draft
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-border">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-4 lg:px-12 py-5 max-w-6xl mx-auto w-full">
        <button
          onClick={back}
          disabled={step === 0}
          className="px-6 py-2.5 rounded-full border border-border text-foreground disabled:opacity-40 hover:bg-secondary transition"
        >
          Back
        </button>

        {step <= 5 && (
          <button
            onClick={next}
            disabled={!canContinue}
            className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium disabled:opacity-40 hover:opacity-90 transition"
          >
            {step === 0
              ? "Continue"
              : step === 5
              ? "Review Job Post"
              : `Next: ${STEP_LABELS[step] /* next label */}`}
          </button>
        )}
      </div>
    </main>
  );
}

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string | null;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        {label && (
          <p className="text-foreground font-semibold mb-1">{label}</p>
        )}
        {children}
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit"
        className="shrink-0 w-9 h-9 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
      >
        ✎
      </button>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary"
      }`}
    >
      <span className="block font-semibold text-foreground">{title}</span>
      <span className="block text-muted-foreground text-sm mt-2">{desc}</span>
    </button>
  );
}
