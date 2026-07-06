// Mega-menu taxonomy for the public landing header (Find talent / Find work / Why Xwork).

export type NavItem = { title: string; desc: string };
export type NavCategory = { name: string; items: NavItem[] };

// ---------------- FIND TALENT (hire side) ----------------
export const FIND_TALENT: NavCategory[] = [
  {
    name: "AI & Automation",
    items: [
      { title: "AI Video Creators & Editors", desc: "Generate and edit AI-powered video" },
      { title: "AI Integration Developers", desc: "Connect AI to your existing tools" },
      { title: "Chatbot Developers", desc: "Build AI for support and sales" },
      { title: "Machine Learning Engineers", desc: "Models that learn from your data" },
      { title: "AI Developers", desc: "Custom AI-powered apps and features" },
      { title: "Automation Experts", desc: "Streamline your business processes" },
      { title: "N8N Experts", desc: "No-code workflow automation" },
      { title: "Vibe Coders", desc: "Prototype and build rapidly with AI" },
      { title: "Claude Experts", desc: "Build with Anthropic's Claude" },
      { title: "AI Consultants", desc: "Strategic AI guidance for business" },
    ],
  },
  {
    name: "Development & IT",
    items: [
      { title: "Full Stack Developers", desc: "End-to-end web app development" },
      { title: "Front-End Developers", desc: "Build engaging user interfaces" },
      { title: "Back-End Developers", desc: "APIs, servers and databases" },
      { title: "Mobile App Developers", desc: "iOS and Android apps" },
      { title: "WordPress Developers", desc: "Sites and themes on WordPress" },
      { title: "Shopify Developers", desc: "Custom Shopify storefronts" },
      { title: "DevOps Engineers", desc: "CI/CD and cloud infrastructure" },
      { title: "QA Engineers", desc: "Test and ship with confidence" },
    ],
  },
  {
    name: "Design & Creative",
    items: [
      { title: "Logo Designers", desc: "Memorable brand marks" },
      { title: "Brand Designers", desc: "Complete visual identities" },
      { title: "UX/UI Designers", desc: "Product design that converts" },
      { title: "Illustrators", desc: "Custom illustrations and art" },
      { title: "Graphic Designers", desc: "Print and digital graphics" },
      { title: "Presentation Designers", desc: "Decks that impress" },
      { title: "Packaging Designers", desc: "Stand-out product packaging" },
      { title: "Photo Editors", desc: "Retouching and editing" },
    ],
  },
  {
    name: "Marketing",
    items: [
      { title: "SEO Experts", desc: "Rank higher on search" },
      { title: "Social Media Managers", desc: "Grow your channels" },
      { title: "Content Marketers", desc: "Strategy and content that sells" },
      { title: "Email Marketers", desc: "Campaigns that convert" },
      { title: "PPC Specialists", desc: "Paid ads that perform" },
      { title: "Marketing Strategists", desc: "Plans for growth" },
      { title: "Brand Strategists", desc: "Position your brand" },
      { title: "Influencer Marketers", desc: "Reach new audiences" },
    ],
  },
  {
    name: "Data & Analytics",
    items: [
      { title: "Data Analysts", desc: "Turn data into insight" },
      { title: "Data Scientists", desc: "Models and predictions" },
      { title: "Data Engineers", desc: "Pipelines and warehouses" },
      { title: "BI Developers", desc: "Dashboards and reporting" },
      { title: "Data Visualization Experts", desc: "Clear visual stories" },
      { title: "Database Administrators", desc: "Reliable, fast databases" },
      { title: "Data Entry Specialists", desc: "Accurate, fast entry" },
    ],
  },
  {
    name: "Admin & Support",
    items: [
      { title: "Virtual Assistants", desc: "Day-to-day support" },
      { title: "Customer Support Reps", desc: "Help your customers" },
      { title: "Project Managers", desc: "Keep projects on track" },
      { title: "Executive Assistants", desc: "Support for leaders" },
      { title: "Transcriptionists", desc: "Audio to text" },
      { title: "Scheduling Assistants", desc: "Manage your calendar" },
    ],
  },
  {
    name: "Writing & Content",
    items: [
      { title: "Content Writers", desc: "Articles and blog posts" },
      { title: "Copywriters", desc: "Words that sell" },
      { title: "Technical Writers", desc: "Docs and guides" },
      { title: "Editors & Proofreaders", desc: "Polish your text" },
      { title: "Ghostwriters", desc: "Books and long-form" },
      { title: "Translators", desc: "Reach global audiences" },
      { title: "Scriptwriters", desc: "Video and podcast scripts" },
    ],
  },
];

// ---------------- FIND WORK (freelancer side) ----------------
export const FIND_WORK: NavCategory[] = [
  {
    name: "AI & Automation",
    items: [
      { title: "Artificial Intelligence", desc: "Work on cutting-edge AI projects" },
      { title: "AI Generated Video", desc: "Create AI-powered video content" },
      { title: "AI Model Training", desc: "Label, train and fine-tune AI models" },
      { title: "Prompt Engineering", desc: "Craft prompts for better AI outputs" },
      { title: "AI Content Creation", desc: "Write and edit AI-assisted content" },
      { title: "Generative AI", desc: "Build with generative AI tools" },
      { title: "AI Writing", desc: "Write with and about AI" },
      { title: "Automation", desc: "Workflows that cut manual work" },
      { title: "Chatbot", desc: "Deploy conversational bots" },
      { title: "ChatGPT", desc: "Projects using ChatGPT and OpenAI" },
    ],
  },
  {
    name: "Development & IT",
    items: [
      { title: "Web Development", desc: "Build websites and web apps" },
      { title: "Mobile Development", desc: "iOS and Android jobs" },
      { title: "Full Stack Development", desc: "End-to-end projects" },
      { title: "WordPress", desc: "Build on WordPress" },
      { title: "Shopify Development", desc: "eCommerce builds" },
      { title: "DevOps", desc: "Cloud and infrastructure work" },
      { title: "QA & Testing", desc: "Test and ship" },
      { title: "Scripting & Automation", desc: "Automate tasks" },
    ],
  },
  {
    name: "Marketing",
    items: [
      { title: "SEO", desc: "Improve search rankings" },
      { title: "Social Media Marketing", desc: "Manage and grow channels" },
      { title: "Content Marketing", desc: "Strategy and content" },
      { title: "Email Marketing", desc: "Build and send campaigns" },
      { title: "Paid Advertising", desc: "Run paid campaigns" },
      { title: "Marketing Strategy", desc: "Plan growth" },
      { title: "Lead Generation", desc: "Find new customers" },
    ],
  },
  {
    name: "Design & Creative",
    items: [
      { title: "Graphic Design", desc: "Visual design work" },
      { title: "Logo Design", desc: "Create brand marks" },
      { title: "UX/UI Design", desc: "Design products" },
      { title: "Illustration", desc: "Custom illustration" },
      { title: "Brand Identity", desc: "Build brand systems" },
      { title: "Presentation Design", desc: "Build decks" },
      { title: "Web Design", desc: "Design websites" },
    ],
  },
  {
    name: "Video & Audio",
    items: [
      { title: "Video Editing", desc: "Edit and produce video" },
      { title: "Animation", desc: "Motion and animation" },
      { title: "Voice Over", desc: "Record voice work" },
      { title: "Audio Production", desc: "Mix and master audio" },
      { title: "Podcast Production", desc: "Produce podcasts" },
      { title: "Music Production", desc: "Compose and produce" },
      { title: "Subtitles & Captions", desc: "Caption video" },
    ],
  },
  {
    name: "Writing & Content",
    items: [
      { title: "Content Writing", desc: "Articles and posts" },
      { title: "Copywriting", desc: "Sales and ad copy" },
      { title: "Technical Writing", desc: "Docs and guides" },
      { title: "Editing & Proofreading", desc: "Polish content" },
      { title: "Translation", desc: "Translate content" },
      { title: "Creative Writing", desc: "Stories and scripts" },
      { title: "Resume Writing", desc: "Resumes and cover letters" },
    ],
  },
  {
    name: "Admin & Support",
    items: [
      { title: "Virtual Assistance", desc: "Administrative support" },
      { title: "Customer Service", desc: "Support customers" },
      { title: "Data Entry", desc: "Enter and manage data" },
      { title: "Project Management", desc: "Manage projects" },
      { title: "Transcription", desc: "Transcribe audio" },
      { title: "Market Research", desc: "Research and reports" },
    ],
  },
];

// ---------------- WHY XWORK ----------------
export const WHY_XWORK: { resources: NavItem[]; whatsNew: NavItem[] } = {
  resources: [
    { title: "Success stories", desc: "Discover how teams work strategically to grow" },
    { title: "Reviews", desc: "See what it's like to collaborate on Xwork" },
    { title: "How to hire", desc: "Learn the different ways you can get work done" },
    { title: "How to find work", desc: "Learn about how to grow on your terms" },
  ],
  whatsNew: [
    { title: "Xwork Updates", desc: "Our latest products, features, and partners" },
    { title: "Research Institute", desc: "Insights and tools for business leaders" },
    { title: "Blog", desc: "News and stories from the world's work marketplace" },
    { title: "Release notes", desc: "Our latest product news and improvements" },
  ],
};
