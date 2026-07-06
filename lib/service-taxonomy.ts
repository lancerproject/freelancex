// Full service taxonomy: Category → Subcategory → Skill/Service + search keywords.
// Powers the skills/services autocomplete (keyword matching) and category lists.

export type ServiceRow = {
  category: string;
  subcategory: string;
  skill: string;
  keywords: string;
};

export const SERVICE_TAXONOMY: ServiceRow[] = [
  // Writing & Translation
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Blog & article writing", keywords: "blog writer, article writer, seo content, content writing, blog posts" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Copywriting", keywords: "copywriter, sales copy, ad copy, copywriting, marketing copy" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Website / landing page copy", keywords: "website copy, landing page copy, web content, homepage copy" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Technical writing", keywords: "technical writer, api documentation, user manual, how-to guide" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Ghostwriting", keywords: "ghostwriter, book ghostwriting, linkedin ghostwriter, newsletter writer" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Product descriptions", keywords: "product description, amazon listing, ecommerce copy, shopify product writer" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Resume & cover letter writing", keywords: "resume writer, cv writing, cover letter, linkedin profile, resume design" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Scriptwriting", keywords: "scriptwriter, youtube script, video script, podcast script" },
  { category: "Writing & Translation", subcategory: "Content Writing", skill: "Grant & proposal writing", keywords: "grant writer, proposal writing, rfp response, business proposal" },
  { category: "Writing & Translation", subcategory: "Editing & Language", skill: "Proofreading & editing", keywords: "proofreading, editing, copy editor, line editing, proofreader" },
  { category: "Writing & Translation", subcategory: "Editing & Language", skill: "Translation", keywords: "translator, translation, english to spanish, document translation" },
  { category: "Writing & Translation", subcategory: "Editing & Language", skill: "Localization", keywords: "localization, app localization, website localization, l10n" },
  { category: "Writing & Translation", subcategory: "Editing & Language", skill: "Transcription", keywords: "transcription, audio transcription, transcribe, transcriptionist" },
  { category: "Writing & Translation", subcategory: "Editing & Language", skill: "Subtitling & captioning", keywords: "subtitles, captions, srt, closed captions, video subtitles" },
  // Graphic Design & Visual
  { category: "Graphic Design & Visual", subcategory: "Branding", skill: "Logo design", keywords: "logo design, logo designer, custom logo, brand logo, minimalist logo" },
  { category: "Graphic Design & Visual", subcategory: "Branding", skill: "Brand identity / style guides", keywords: "brand identity, brand guidelines, style guide, brand design, branding" },
  { category: "Graphic Design & Visual", subcategory: "Branding", skill: "Business cards & stationery", keywords: "business card design, stationery, letterhead, business card" },
  { category: "Graphic Design & Visual", subcategory: "Marketing Design", skill: "Social media graphics", keywords: "social media design, instagram post design, social media graphics, banner design" },
  { category: "Graphic Design & Visual", subcategory: "Marketing Design", skill: "Ad creatives", keywords: "ad design, facebook ad creative, banner ad, ad creatives, display ads" },
  { category: "Graphic Design & Visual", subcategory: "Marketing Design", skill: "Flyers, brochures & posters", keywords: "flyer design, brochure design, poster design, leaflet" },
  { category: "Graphic Design & Visual", subcategory: "Marketing Design", skill: "Presentation / pitch deck design", keywords: "pitch deck design, powerpoint design, presentation design, slide deck" },
  { category: "Graphic Design & Visual", subcategory: "Marketing Design", skill: "Infographics", keywords: "infographic design, infographics, data visualization, visual" },
  { category: "Graphic Design & Visual", subcategory: "Digital & Web Design", skill: "UI/UX design", keywords: "ui ux design, figma designer, app design, ux designer, ui designer" },
  { category: "Graphic Design & Visual", subcategory: "Digital & Web Design", skill: "Web & landing page design", keywords: "web design, landing page design, website mockup, wireframe" },
  { category: "Graphic Design & Visual", subcategory: "Digital & Web Design", skill: "Illustration", keywords: "illustrator, custom illustration, vector art, digital illustration" },
  { category: "Graphic Design & Visual", subcategory: "Digital & Web Design", skill: "Icon & graphic asset design", keywords: "icon design, icon set, ui kit, app icons, graphic assets" },
  { category: "Graphic Design & Visual", subcategory: "Product & Print", skill: "Packaging design", keywords: "packaging design, label design, box design, product packaging" },
  { category: "Graphic Design & Visual", subcategory: "Product & Print", skill: "T-shirt / merch design", keywords: "t-shirt design, merch design, print on demand, tshirt designer" },
  { category: "Graphic Design & Visual", subcategory: "Product & Print", skill: "Book covers & layout", keywords: "book cover design, ebook cover, kdp formatting, book layout" },
  { category: "Graphic Design & Visual", subcategory: "Product & Print", skill: "3D modeling & rendering", keywords: "3d modeling, 3d rendering, product render, 3d artist, blender" },
  // Programming & Tech
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Front-end development", keywords: "front end developer, react developer, html css, frontend, web developer" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Back-end development", keywords: "backend developer, api development, node js, python developer, backend" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Full-stack development", keywords: "full stack developer, web app developer, mern stack, fullstack" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "WordPress development", keywords: "wordpress developer, wordpress website, elementor, woocommerce, wp" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Shopify / e-commerce dev", keywords: "shopify developer, ecommerce website, shopify store, online store" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Webflow / no-code builds", keywords: "webflow developer, no code website, bubble io, webflow" },
  { category: "Programming & Tech", subcategory: "Web Development", skill: "Bug fixing & site maintenance", keywords: "bug fix, website maintenance, fix website, speed optimization, wordpress fix" },
  { category: "Programming & Tech", subcategory: "Mobile & Software", skill: "iOS / Android app development", keywords: "app developer, ios developer, android developer, flutter, react native" },
  { category: "Programming & Tech", subcategory: "Mobile & Software", skill: "Desktop software development", keywords: "desktop app, software developer, windows app, python app" },
  { category: "Programming & Tech", subcategory: "Mobile & Software", skill: "Game development", keywords: "game developer, unity developer, unreal, game design, indie game" },
  { category: "Programming & Tech", subcategory: "Mobile & Software", skill: "Chatbot / automation development", keywords: "automation, zapier, make.com, chatbot, workflow automation" },
  { category: "Programming & Tech", subcategory: "Mobile & Software", skill: "API integration", keywords: "api integration, integrate api, third party api, rest api" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "Data analysis", keywords: "data analyst, data analysis, dashboard, power bi, tableau, excel analysis" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "Data scraping", keywords: "web scraping, data scraping, scraper, data extraction, python scraping" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "Machine learning / AI dev", keywords: "machine learning, ml engineer, ai developer, deep learning, data science" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "Prompt engineering", keywords: "prompt engineer, chatgpt prompts, prompt engineering, gpt prompts" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "AI chatbot setup", keywords: "ai chatbot, custom chatbot, gpt chatbot, ai assistant, chatbot setup" },
  { category: "Programming & Tech", subcategory: "Data & AI", skill: "Database design & admin", keywords: "database design, sql developer, dba, database admin, postgresql" },
  { category: "Programming & Tech", subcategory: "DevOps & Cloud", skill: "Cloud setup (AWS/Azure/GCP)", keywords: "aws, cloud engineer, azure, devops, gcp, cloud setup" },
  { category: "Programming & Tech", subcategory: "DevOps & Cloud", skill: "DevOps / CI-CD", keywords: "devops engineer, ci cd, docker, kubernetes, terraform" },
  { category: "Programming & Tech", subcategory: "DevOps & Cloud", skill: "Cybersecurity / pen testing", keywords: "cybersecurity, penetration testing, security audit, ethical hacking" },
  { category: "Programming & Tech", subcategory: "DevOps & Cloud", skill: "QA & software testing", keywords: "qa tester, software testing, test automation, selenium, manual testing" },
  // Digital Marketing
  { category: "Digital Marketing", subcategory: "Search & Ads", skill: "SEO", keywords: "seo expert, seo, search engine optimization, backlinks, on page seo" },
  { category: "Digital Marketing", subcategory: "Search & Ads", skill: "Google / PPC ads", keywords: "google ads, ppc, adwords, ppc expert, paid search" },
  { category: "Digital Marketing", subcategory: "Search & Ads", skill: "Social media ads", keywords: "facebook ads, meta ads, tiktok ads, social media advertising" },
  { category: "Digital Marketing", subcategory: "Search & Ads", skill: "Keyword & market research", keywords: "keyword research, seo research, competitor analysis, keyword analysis" },
  { category: "Digital Marketing", subcategory: "Social & Content", skill: "Social media management", keywords: "social media manager, social media management, instagram manager, smm" },
  { category: "Digital Marketing", subcategory: "Social & Content", skill: "Content strategy", keywords: "content strategy, content calendar, content marketing, editorial" },
  { category: "Digital Marketing", subcategory: "Social & Content", skill: "Email marketing", keywords: "email marketing, klaviyo, mailchimp, email automation, newsletter" },
  { category: "Digital Marketing", subcategory: "Social & Content", skill: "Influencer marketing", keywords: "influencer marketing, influencer outreach, ugc campaign" },
  { category: "Digital Marketing", subcategory: "Social & Content", skill: "Community management", keywords: "community manager, discord moderator, community management, moderation" },
  { category: "Digital Marketing", subcategory: "Growth & Analytics", skill: "Marketing analytics", keywords: "google analytics, ga4, marketing analytics, reporting, data tracking" },
  { category: "Digital Marketing", subcategory: "Growth & Analytics", skill: "Conversion rate optimization", keywords: "cro, conversion optimization, ab testing, funnel optimization" },
  { category: "Digital Marketing", subcategory: "Growth & Analytics", skill: "Affiliate marketing setup", keywords: "affiliate marketing, affiliate program, affiliate setup" },
  { category: "Digital Marketing", subcategory: "Growth & Analytics", skill: "Lead generation", keywords: "lead generation, lead gen, b2b leads, prospecting, email list" },
  // Video & Animation
  { category: "Video & Animation", subcategory: "Editing & Production", skill: "Video editing", keywords: "video editor, video editing, youtube editor, premiere pro, capcut" },
  { category: "Video & Animation", subcategory: "Editing & Production", skill: "Short-form / reels editing", keywords: "reels editor, tiktok editing, shorts editor, short form video" },
  { category: "Video & Animation", subcategory: "Editing & Production", skill: "Color grading", keywords: "color grading, davinci resolve, color correction, cinematic" },
  { category: "Video & Animation", subcategory: "Editing & Production", skill: "Video ad / VSL creation", keywords: "video ad, vsl, sales video, ad video, facebook video ad" },
  { category: "Video & Animation", subcategory: "Animation & Motion", skill: "Motion graphics", keywords: "motion graphics, after effects, motion designer, animated graphics" },
  { category: "Video & Animation", subcategory: "Animation & Motion", skill: "2D / explainer animation", keywords: "explainer video, 2d animation, whiteboard animation, animated video" },
  { category: "Video & Animation", subcategory: "Animation & Motion", skill: "3D animation", keywords: "3d animation, 3d animator, character animation, product animation" },
  { category: "Video & Animation", subcategory: "Animation & Motion", skill: "Logo animation", keywords: "logo animation, animated logo, logo intro, logo reveal" },
  { category: "Video & Animation", subcategory: "Animation & Motion", skill: "Intro / outro creation", keywords: "youtube intro, intro video, outro, channel intro" },
  { category: "Video & Animation", subcategory: "Specialty Video", skill: "Spokesperson / UGC video", keywords: "ugc creator, ugc video, spokesperson video, user generated content" },
  { category: "Video & Animation", subcategory: "Specialty Video", skill: "Subtitles & captions", keywords: "subtitles, video captions, srt file, add subtitles" },
  { category: "Video & Animation", subcategory: "Specialty Video", skill: "Slideshow / promo video", keywords: "slideshow video, promo video, photo slideshow" },
  // Music & Audio
  { category: "Music & Audio", subcategory: "Production", skill: "Music production / beats", keywords: "music producer, custom beat, beat maker, music production, instrumental" },
  { category: "Music & Audio", subcategory: "Production", skill: "Mixing & mastering", keywords: "mixing and mastering, audio mixing, mastering engineer, mix" },
  { category: "Music & Audio", subcategory: "Production", skill: "Songwriting & composition", keywords: "songwriter, jingle, custom song, composer, songwriting" },
  { category: "Music & Audio", subcategory: "Production", skill: "Session musician", keywords: "session musician, guitar recording, session guitarist, instrument" },
  { category: "Music & Audio", subcategory: "Voice & Spoken", skill: "Voiceover", keywords: "voice over, voiceover artist, voice actor, voiceover, narration" },
  { category: "Music & Audio", subcategory: "Voice & Spoken", skill: "Audiobook narration", keywords: "audiobook narrator, audiobook narration, book narrator, acx" },
  { category: "Music & Audio", subcategory: "Voice & Spoken", skill: "Podcast editing", keywords: "podcast editor, podcast editing, audio editing, podcast production" },
  { category: "Music & Audio", subcategory: "Voice & Spoken", skill: "Sound design / SFX", keywords: "sound design, sfx, sound effects, foley, audio design" },
  // Business & Consulting
  { category: "Business & Consulting", subcategory: "Strategy & Operations", skill: "Business consulting", keywords: "business consultant, business strategy, growth consultant, advisor" },
  { category: "Business & Consulting", subcategory: "Strategy & Operations", skill: "Business plan writing", keywords: "business plan, business plan writer, financial projections, startup plan" },
  { category: "Business & Consulting", subcategory: "Strategy & Operations", skill: "Market research", keywords: "market research, industry research, competitor analysis, market analysis" },
  { category: "Business & Consulting", subcategory: "Strategy & Operations", skill: "Project management", keywords: "project manager, remote pm, scrum master, project management, agile" },
  { category: "Business & Consulting", subcategory: "Strategy & Operations", skill: "Operations / process consulting", keywords: "operations consultant, sop writing, process improvement, workflow" },
  { category: "Business & Consulting", subcategory: "Finance & Legal", skill: "Bookkeeping", keywords: "bookkeeper, bookkeeping, quickbooks, xero, accounting" },
  { category: "Business & Consulting", subcategory: "Finance & Legal", skill: "Accounting & tax prep", keywords: "accountant, tax preparation, tax return, cpa, accounting services" },
  { category: "Business & Consulting", subcategory: "Finance & Legal", skill: "Financial modeling", keywords: "financial modeling, financial model, forecast, excel model, valuation" },
  { category: "Business & Consulting", subcategory: "Finance & Legal", skill: "Legal document drafting", keywords: "contract drafting, legal documents, nda, terms of service, agreement" },
  { category: "Business & Consulting", subcategory: "Finance & Legal", skill: "Pitch deck & fundraising help", keywords: "pitch deck, investor deck, fundraising, startup pitch" },
  { category: "Business & Consulting", subcategory: "HR & Career", skill: "Recruiting / sourcing", keywords: "recruiter, candidate sourcing, talent sourcing, headhunter, recruiting" },
  { category: "Business & Consulting", subcategory: "HR & Career", skill: "Career coaching", keywords: "career coach, interview coaching, career advice, job search coach" },
  { category: "Business & Consulting", subcategory: "HR & Career", skill: "HR consulting", keywords: "hr consultant, employee handbook, hr policies, human resources" },
  // Admin & Support
  { category: "Admin & Support", subcategory: "Virtual Assistance", skill: "Virtual assistant", keywords: "virtual assistant, va, admin assistant, executive assistant, remote assistant" },
  { category: "Admin & Support", subcategory: "Virtual Assistance", skill: "Data entry", keywords: "data entry, data entry clerk, excel data entry, typing, copy paste" },
  { category: "Admin & Support", subcategory: "Virtual Assistance", skill: "Internet research", keywords: "internet research, web research, online research, research assistant" },
  { category: "Admin & Support", subcategory: "Virtual Assistance", skill: "Calendar & inbox management", keywords: "calendar management, inbox management, scheduling, email management" },
  { category: "Admin & Support", subcategory: "Customer & Sales", skill: "Customer support", keywords: "customer support, customer service, help desk, support agent" },
  { category: "Admin & Support", subcategory: "Customer & Sales", skill: "Sales / appointment setting", keywords: "appointment setter, cold calling, sales rep, telemarketing, sdr" },
  { category: "Admin & Support", subcategory: "Customer & Sales", skill: "CRM management", keywords: "crm manager, hubspot, salesforce admin, crm setup, gohighlevel" },
  { category: "Admin & Support", subcategory: "Customer & Sales", skill: "Live chat agent", keywords: "live chat agent, chat support, website chat, live chat" },
  // AI Services
  { category: "AI Services", subcategory: "AI Content & Media", skill: "AI image / art generation", keywords: "ai art, midjourney, ai image, ai generated art, ai artwork" },
  { category: "AI Services", subcategory: "AI Content & Media", skill: "AI video generation", keywords: "ai video, ai avatar, heygen, synthesia, ai generated video" },
  { category: "AI Services", subcategory: "AI Content & Media", skill: "AI voice / cloning", keywords: "ai voice, voice cloning, elevenlabs, ai voiceover, synthetic voice" },
  { category: "AI Services", subcategory: "AI Content & Media", skill: "AI content editing", keywords: "ai content editing, humanize ai text, ai writing editing, ai detector bypass" },
  { category: "AI Services", subcategory: "AI Development", skill: "Custom GPT / agent building", keywords: "custom gpt, ai agent, build gpt, ai agent developer, langchain" },
  { category: "AI Services", subcategory: "AI Development", skill: "AI workflow automation", keywords: "ai automation, llm automation, ai workflow, n8n, openai api" },
  { category: "AI Services", subcategory: "AI Development", skill: "RAG / chatbot on docs", keywords: "rag chatbot, chat with pdf, knowledge base bot, custom ai chatbot" },
  { category: "AI Services", subcategory: "AI Development", skill: "AI integration consulting", keywords: "ai consultant, ai integration, ai strategy, openai integration" },
  // Lifestyle & Misc
  { category: "Lifestyle & Misc", subcategory: "Coaching & Wellness", skill: "Online tutoring", keywords: "online tutor, tutoring, math tutor, test prep, homework help" },
  { category: "Lifestyle & Misc", subcategory: "Coaching & Wellness", skill: "Language teaching", keywords: "english teacher, language tutor, esl, spanish tutor, conversation" },
  { category: "Lifestyle & Misc", subcategory: "Coaching & Wellness", skill: "Fitness / nutrition coaching", keywords: "fitness coach, personal trainer, meal plan, nutrition coach, workout plan" },
  { category: "Lifestyle & Misc", subcategory: "Coaching & Wellness", skill: "Life / career coaching", keywords: "life coach, career coach, coaching, mindset coach" },
  { category: "Lifestyle & Misc", subcategory: "Creative Extras", skill: "Photo editing / retouching", keywords: "photo editing, photoshop, background removal, photo retouching, retoucher" },
  { category: "Lifestyle & Misc", subcategory: "Creative Extras", skill: "Astrology / tarot readings", keywords: "tarot reading, astrology, birth chart, psychic reading, tarot" },
  { category: "Lifestyle & Misc", subcategory: "Creative Extras", skill: "Game coaching / boosting", keywords: "game coach, valorant coaching, league coaching, gaming coach" },
  { category: "Lifestyle & Misc", subcategory: "Creative Extras", skill: "3D / CAD design", keywords: "cad design, autocad, solidworks, 3d cad, cad drafting" },
  { category: "Lifestyle & Misc", subcategory: "Creative Extras", skill: "Architecture & interior design", keywords: "interior design, floor plan, architect, 3d interior, home design" },
];

// Distinct top-level categories, in order.
export const SERVICE_CATEGORIES: string[] = Array.from(
  new Set(SERVICE_TAXONOMY.map((r) => r.category))
);

// Subcategories grouped by category.
export const SUBCATEGORIES_BY_CATEGORY: Record<string, string[]> = SERVICE_CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat] = Array.from(
      new Set(
        SERVICE_TAXONOMY.filter((r) => r.category === cat).map((r) => r.subcategory)
      )
    );
    return acc;
  },
  {} as Record<string, string[]>
);

// All service/skill names (clean, display-ready).
export const SERVICE_NAMES: string[] = Array.from(
  new Set(SERVICE_TAXONOMY.map((r) => r.skill))
);

// Map of service name → extra search keywords (for autocomplete matching).
export const SERVICE_KEYWORDS: Record<string, string> = SERVICE_TAXONOMY.reduce(
  (acc, r) => {
    acc[r.skill] = `${acc[r.skill] ? acc[r.skill] + ", " : ""}${r.keywords}`;
    return acc;
  },
  {} as Record<string, string>
);
