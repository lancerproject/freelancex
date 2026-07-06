// Skill suggestions for the talent-search sidebar. Options follow what the
// user SEARCHED (never one freelancer's profile): each group is matched
// against the search words and the best-matching groups supply the skills.

type SkillGroup = { name: string; keywords: string[]; skills: string[] };

export const SKILL_GROUPS: SkillGroup[] = [
  {
    name: "Web Development",
    keywords: ["web", "website", "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "javascript", "php", "developer"],
    skills: ["Web Development", "React", "Next.js", "Node.js", "JavaScript", "TypeScript", "HTML", "CSS", "PHP", "Laravel", "WordPress", "Shopify"],
  },
  {
    name: "Mobile Development",
    keywords: ["mobile", "app", "android", "ios", "flutter", "iphone"],
    skills: ["Mobile App Development", "Flutter", "React Native", "Android", "iOS", "Swift", "Kotlin", "Firebase"],
  },
  {
    name: "Game Development",
    keywords: ["game", "games", "gaming", "unity", "unreal", "roblox"],
    skills: ["Game Development", "Unity", "Unreal Engine", "C#", "C++", "Game Design", "3D Modeling", "Blender", "Level Design", "Pixel Art"],
  },
  {
    name: "Design & Creative",
    keywords: ["design", "designer", "logo", "graphic", "ui", "ux", "brand", "branding", "illustration", "figma", "photoshop"],
    skills: ["Logo Design", "Graphic Design", "UI/UX Design", "Figma", "Adobe Photoshop", "Adobe Illustrator", "Branding", "Illustration", "Web Design", "Packaging Design"],
  },
  {
    name: "Video & Animation",
    keywords: ["video", "animation", "editing", "editor", "motion", "youtube", "reels"],
    skills: ["Video Editing", "Adobe Premiere Pro", "After Effects", "Motion Graphics", "2D Animation", "3D Animation", "Color Grading", "YouTube Video Editing"],
  },
  {
    name: "Writing & Translation",
    keywords: ["writing", "writer", "content", "copywriting", "copywriter", "translation", "translator", "blog", "article"],
    skills: ["Content Writing", "Copywriting", "Blog Writing", "Article Writing", "Technical Writing", "Proofreading", "Translation", "SEO Writing", "Ghostwriting"],
  },
  {
    name: "Marketing & Sales",
    keywords: ["marketing", "marketer", "seo", "social", "ads", "advertising", "sales", "ppc", "email", "instagram", "facebook", "tiktok"],
    skills: ["SEO", "Social Media Marketing", "Google Ads", "Facebook Ads", "Email Marketing", "Content Marketing", "Lead Generation", "TikTok Marketing", "Influencer Marketing"],
  },
  {
    name: "Data & AI",
    keywords: ["data", "ai", "artificial", "machine", "ml", "analytics", "python", "chatbot", "automation", "scraping"],
    skills: ["Python", "Machine Learning", "Data Analysis", "Data Science", "SQL", "Power BI", "Microsoft Excel", "Web Scraping", "Prompt Engineering", "Chatbot Development"],
  },
  {
    name: "Cybersecurity & IT",
    keywords: ["security", "cyber", "cybersecurity", "hacking", "hacker", "penetration", "pentest", "network", "crypto"],
    skills: ["Cybersecurity", "Ethical Hacking", "Penetration Testing", "Network Security", "Malware Analysis", "Security Auditing", "Crypto Recovery", "Digital Forensics"],
  },
  {
    name: "Admin & Customer Support",
    keywords: ["admin", "support", "virtual", "assistant", "entry", "customer", "research"],
    skills: ["Virtual Assistant", "Data Entry", "Customer Support", "Live Chat Support", "Web Research", "CRM Management", "Email Handling"],
  },
  {
    name: "Music & Audio",
    keywords: ["music", "audio", "voice", "voiceover", "podcast", "song", "sound"],
    skills: ["Voice Over", "Audio Editing", "Music Production", "Podcast Editing", "Mixing & Mastering", "Sound Design"],
  },
  {
    name: "Finance & Accounting",
    keywords: ["finance", "financial", "accounting", "accountant", "bookkeeping", "tax", "payroll"],
    skills: ["Bookkeeping", "QuickBooks", "Financial Analysis", "Tax Preparation", "Payroll", "Financial Modeling"],
  },
];

// Shown when nothing has been searched yet — a general spread, not any
// single category and never a freelancer's own skill list.
const POPULAR: string[] = [
  "Web Development",
  "WordPress",
  "Logo Design",
  "Graphic Design",
  "UI/UX Design",
  "Video Editing",
  "SEO",
  "Social Media Marketing",
  "Content Writing",
  "Data Entry",
  "Python",
  "Virtual Assistant",
  "Mobile App Development",
  "Cybersecurity",
  "Voice Over",
];

// Pick the skill list that matches the search words best. Groups are scored
// by how many words they match; only the top-scoring groups contribute, so
// "game development" suggests game skills — not every "development" group.
export function suggestSkills(words: string[]): string[] {
  const clean = words.map((w) => w.toLowerCase()).filter((w) => w.length > 1);
  if (clean.length === 0) return [...POPULAR];

  let best = 0;
  const scored = SKILL_GROUPS.map((g) => {
    const core = `${g.name} ${g.keywords.join(" ")}`.toLowerCase();
    const skillsBlob = g.skills.join(" ").toLowerCase();
    let score = 0;
    for (const w of clean) {
      if (core.includes(w)) score += 2; // group name/keyword — strong signal
      else if (skillsBlob.includes(w)) score += 1; // a skill name mentions it
    }
    best = Math.max(best, score);
    return { g, score };
  });
  if (best === 0) return [...POPULAR];

  const out: string[] = [];
  for (const { g, score } of scored) {
    if (score !== best) continue;
    for (const s of g.skills) {
      if (!out.some((o) => o.toLowerCase() === s.toLowerCase())) out.push(s);
    }
  }
  return out.slice(0, 20);
}
