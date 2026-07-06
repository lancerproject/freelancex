// Skills grouped by job category. Shown in the post-a-job "skills" step based
// on the category the client picked, like Upwork.

export const SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Web Development": [
    "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular", "Svelte",
    "Node.js", "Express.js", "PHP", "Laravel", "WordPress", "Shopify", "HTML5",
    "CSS3", "Tailwind CSS", "Bootstrap", "Python", "Django", "Flask", "Ruby on Rails",
    "GraphQL", "REST API", "MongoDB", "PostgreSQL", "MySQL", "Firebase", "Supabase",
    "Webflow", "WooCommerce", "Full-Stack Development", "Frontend Development", "Backend Development",
  ],
  "Mobile Development": [
    "Swift", "SwiftUI", "Kotlin", "Java", "Flutter", "Dart", "React Native",
    "Objective-C", "Android Development", "iOS Development", "Ionic", "Xamarin",
    "Firebase", "Mobile UI Design", "App Store Optimization",
  ],
  "Design & Creative": [
    "Figma", "Adobe Photoshop", "Adobe Illustrator", "Adobe XD", "Sketch",
    "UI Design", "UX Design", "Logo Design", "Branding", "Graphic Design",
    "Web Design", "Canva", "Print Design", "Illustration", "Icon Design",
    "Typography", "Packaging Design", "Wireframing", "Prototyping",
  ],
  "Writing & Translation": [
    "Content Writing", "Copywriting", "Technical Writing", "Blog Writing",
    "SEO Writing", "Ghostwriting", "Creative Writing", "Proofreading", "Editing",
    "Translation", "Transcription", "Resume Writing", "Grant Writing", "Scriptwriting",
  ],
  "Marketing & Sales": [
    "SEO", "Social Media Marketing", "Google Ads", "Facebook Ads", "Instagram Marketing",
    "Email Marketing", "Content Marketing", "Lead Generation", "PPC", "Marketing Strategy",
    "Affiliate Marketing", "CRM", "Sales", "Influencer Marketing", "Marketing Automation",
    "Google Analytics", "Conversion Optimization",
  ],
  "Data & Analytics": [
    "Data Analysis", "Microsoft Excel", "SQL", "Python", "R", "Power BI", "Tableau",
    "Machine Learning", "Deep Learning", "Data Visualization", "Pandas", "NumPy",
    "Data Science", "Statistics", "Big Data", "Data Engineering", "ETL", "AI",
  ],
  "Admin & Customer Support": [
    "Data Entry", "Virtual Assistant", "Customer Service", "Email Handling",
    "Calendar Management", "Microsoft Office", "Google Workspace", "Transcription",
    "Live Chat Support", "Order Processing", "CRM", "Scheduling", "Telemarketing",
  ],
  "Video & Animation": [
    "Video Editing", "Adobe Premiere Pro", "After Effects", "Motion Graphics",
    "2D Animation", "3D Animation", "Final Cut Pro", "DaVinci Resolve",
    "Whiteboard Animation", "Explainer Videos", "Cinema 4D", "Blender", "Color Grading",
  ],
  "Music & Audio": [
    "Audio Editing", "Mixing", "Mastering", "Voice Over", "Podcast Editing",
    "Sound Design", "Music Production", "Audacity", "Logic Pro", "FL Studio",
    "Pro Tools", "Jingle Production",
  ],
  "Finance & Accounting": [
    "Bookkeeping", "Accounting", "QuickBooks", "Xero", "Financial Analysis",
    "Tax Preparation", "Payroll", "Microsoft Excel", "Financial Modeling",
    "Budgeting", "Forecasting", "Auditing", "Accounts Payable", "Accounts Receivable",
  ],
  "Engineering & Architecture": [
    "AutoCAD", "SolidWorks", "Civil Engineering", "Mechanical Engineering",
    "Electrical Engineering", "3D Modeling", "Revit", "MATLAB", "Product Design",
    "CAD", "Structural Engineering", "PCB Design", "Fusion 360", "SketchUp",
  ],
  "Cybersecurity & IT": [
    "Information Security", "Cybersecurity", "Ethical Hacking", "Penetration Testing",
    "Network Security", "Crypto Recovery", "Malware Analysis", "Incident Response",
    "Vulnerability Assessment", "Digital Forensics", "Security Auditing",
    "Firewall Configuration", "SIEM", "SOC Analyst", "ISO 27001", "GDPR Compliance",
    "Cloud Security", "AWS", "Microsoft Azure", "Google Cloud", "DevOps", "Docker",
    "Kubernetes", "Linux Administration", "Windows Server", "System Administration",
    "Network Administration", "Bug Bounty", "Reverse Engineering", "Cryptography",
    "Threat Intelligence", "Endpoint Security", "VPN Configuration", "IAM",
  ],
  "Other": [
    "Project Management", "Research", "Consulting", "Customer Support",
    "Microsoft Office", "Translation", "Virtual Assistant", "Data Entry",
  ],
};

// A general fallback set used when no category is selected.
export const DEFAULT_SKILLS = [
  "JavaScript", "Python", "Graphic Design", "Content Writing", "SEO",
  "Data Entry", "Customer Service", "WordPress", "Cybersecurity", "Excel",
];

// A large extra pool of skills across every field, for the search/autocomplete.
const EXTRA_SKILLS: string[] = [
  // Programming languages
  "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Objective-C", "Scala", "Perl", "Haskell",
  "Elixir", "Erlang", "Clojure", "Dart", "Lua", "R", "MATLAB", "Julia", "Groovy",
  "Visual Basic", "F#", "Assembly", "COBOL", "Fortran", "Bash", "PowerShell", "Shell Scripting",
  // Frontend
  "React", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Svelte", "SvelteKit",
  "SolidJS", "Astro", "Remix", "Redux", "Zustand", "jQuery", "HTML", "HTML5",
  "CSS", "CSS3", "Sass", "Less", "Tailwind CSS", "Bootstrap", "Material UI",
  "Chakra UI", "Styled Components", "Framer Motion", "Three.js", "WebGL",
  "Web Components", "Storybook", "Accessibility (WCAG)", "Progressive Web Apps",
  // Backend
  "Node.js", "Express.js", "NestJS", "Django", "Flask", "FastAPI", "Laravel",
  "Symfony", "CodeIgniter", "Ruby on Rails", "Spring Boot", "ASP.NET", ".NET Core",
  "Gin", "Fiber", "Phoenix", "GraphQL", "REST API", "gRPC", "WebSockets",
  "Microservices", "Serverless", "tRPC", "Socket.IO",
  // Databases
  "PostgreSQL", "MySQL", "MariaDB", "SQLite", "MongoDB", "Redis", "Cassandra",
  "DynamoDB", "Firebase", "Supabase", "Elasticsearch", "Neo4j", "CouchDB",
  "Oracle Database", "Microsoft SQL Server", "Prisma", "Sequelize", "TypeORM",
  "Database Design", "Database Administration",
  // DevOps / Cloud
  "AWS", "Amazon EC2", "Amazon S3", "AWS Lambda", "Google Cloud", "Microsoft Azure",
  "DigitalOcean", "Heroku", "Vercel", "Netlify", "Cloudflare", "Docker",
  "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI",
  "CircleCI", "CI/CD", "Nginx", "Apache", "Linux", "Ubuntu", "Bash Scripting",
  "Prometheus", "Grafana", "Datadog", "Git", "GitHub", "GitLab", "Bitbucket",
  // Mobile
  "React Native", "Flutter", "iOS Development", "Android Development", "SwiftUI",
  "Jetpack Compose", "Ionic", "Xamarin", "Cordova", "Unity", "Unreal Engine",
  "Game Development", "AR/VR", "ARKit", "ARCore",
  // Design
  "UI Design", "UX Design", "UI/UX Design", "Figma", "Adobe XD", "Sketch",
  "Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Adobe Lightroom",
  "Canva", "Affinity Designer", "Procreate", "Graphic Design", "Logo Design",
  "Brand Identity", "Web Design", "Wireframing", "Prototyping", "Design Systems",
  "Typography", "Illustration", "Icon Design", "Packaging Design", "Print Design",
  "Presentation Design", "Infographic Design", "T-Shirt Design", "NFT Art",
  // Video / Motion / 3D
  "Video Editing", "Adobe Premiere Pro", "Adobe After Effects", "Final Cut Pro",
  "DaVinci Resolve", "Motion Graphics", "2D Animation", "3D Animation",
  "3D Modeling", "Blender", "Cinema 4D", "Maya", "3ds Max", "ZBrush",
  "Color Grading", "Visual Effects", "Whiteboard Animation", "Explainer Videos",
  "YouTube Video Editing", "Video Production", "Cinematography",
  // Audio
  "Audio Editing", "Audio Mixing", "Audio Mastering", "Voice Over", "Voice Acting",
  "Podcast Editing", "Sound Design", "Music Production", "Music Composition",
  "Audacity", "Logic Pro", "FL Studio", "Ableton Live", "Pro Tools",
  // Writing
  "Content Writing", "Copywriting", "Technical Writing", "Blog Writing",
  "SEO Writing", "Ghostwriting", "Creative Writing", "Article Writing",
  "Proofreading", "Editing", "Copy Editing", "Resume Writing", "Cover Letter Writing",
  "Grant Writing", "Scriptwriting", "Screenwriting", "Storytelling",
  "Product Descriptions", "Press Releases", "White Papers", "Case Studies",
  "Email Copywriting", "UX Writing", "Translation", "Transcription", "Subtitling",
  "Localization", "Proofreading & Editing",
  // Marketing
  "SEO", "Off-Page SEO", "On-Page SEO", "Technical SEO", "Local SEO",
  "Keyword Research", "Link Building", "Content Marketing", "Social Media Marketing",
  "Social Media Management", "Google Ads", "Facebook Ads", "Instagram Marketing",
  "TikTok Marketing", "LinkedIn Marketing", "YouTube Marketing", "Pinterest Marketing",
  "Email Marketing", "Marketing Automation", "Mailchimp", "Klaviyo", "HubSpot",
  "PPC", "Google Analytics", "Google Tag Manager", "Conversion Rate Optimization",
  "Affiliate Marketing", "Influencer Marketing", "Growth Hacking", "Brand Strategy",
  "Marketing Strategy", "Market Research", "Lead Generation", "CRM", "Salesforce",
  "Sales", "Cold Calling", "Cold Emailing", "Dropshipping", "Amazon FBA",
  "Amazon PPC", "Shopify", "WooCommerce", "E-commerce", "Klaviyo Email Flows",
  // Data / AI
  "Data Analysis", "Data Science", "Data Visualization", "Machine Learning",
  "Deep Learning", "Artificial Intelligence", "Natural Language Processing",
  "Computer Vision", "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas",
  "NumPy", "Matplotlib", "Power BI", "Tableau", "Looker", "Excel", "Google Sheets",
  "SQL", "Big Data", "Apache Spark", "Hadoop", "ETL", "Data Engineering",
  "Statistical Analysis", "A/B Testing", "Prompt Engineering", "OpenAI API",
  "LangChain", "Generative AI", "ChatGPT", "Data Mining", "Web Scraping",
  // Cybersecurity
  "Cybersecurity", "Information Security", "Ethical Hacking", "Penetration Testing",
  "Network Security", "Application Security", "Cloud Security", "Digital Forensics",
  "Incident Response", "Malware Analysis", "Reverse Engineering", "Vulnerability Assessment",
  "Bug Bounty", "OSINT", "Threat Intelligence", "Security Auditing", "SIEM",
  "Kali Linux", "Metasploit", "Burp Suite", "Wireshark", "Nmap", "Cryptography",
  "Blockchain Security", "Firewall Configuration", "ISO 27001", "GDPR Compliance",
  "SOC Analysis", "Endpoint Security", "Data Recovery", "Malware Removal",
  // Blockchain
  "Blockchain", "Solidity", "Smart Contracts", "Web3", "Ethereum", "Solana",
  "Rust (Solana)", "DeFi", "NFT", "Crypto Trading", "Tokenomics", "Hardhat",
  "Truffle", "Ethers.js", "Web3.js", "Crypto Wallet", "Crypto Asset",
  // Business / Admin / Finance
  "Project Management", "Agile", "Scrum", "Kanban", "Jira", "Trello", "Asana",
  "Monday.com", "Notion", "Product Management", "Business Analysis", "Operations Management",
  "Virtual Assistant", "Administrative Support", "Data Entry", "Customer Service",
  "Customer Support", "Technical Support", "Email Handling", "Live Chat Support",
  "Calendar Management", "Bookkeeping", "Accounting", "QuickBooks", "Xero",
  "Financial Analysis", "Financial Modeling", "Tax Preparation", "Payroll",
  "Budgeting", "Forecasting", "Auditing", "Microsoft Office", "Microsoft Excel",
  "Google Workspace", "Microsoft PowerPoint", "Microsoft Word",
  // Engineering / CAD
  "AutoCAD", "SolidWorks", "Revit", "Fusion 360", "SketchUp", "CATIA",
  "Civil Engineering", "Mechanical Engineering", "Electrical Engineering",
  "Structural Engineering", "Product Design", "Industrial Design", "PCB Design",
  "Embedded Systems", "Arduino", "Raspberry Pi", "IoT", "Robotics", "CAD",
  "3D Printing", "MATLAB Simulink",
  // Other professional
  "Legal Writing", "Contract Drafting", "Paralegal", "HR Management", "Recruiting",
  "Teaching", "Tutoring", "Curriculum Development", "Instructional Design",
  "Healthcare", "Medical Writing", "Medical Transcription", "Nutrition",
  "Architecture", "Interior Design", "Real Estate", "Photography", "Photo Editing",
  "Photo Retouching", "Event Planning", "Travel Planning", "Game Design",
  "Level Design", "QA Testing", "Manual Testing", "Automation Testing", "Selenium",
  "Cypress", "Playwright", "Appium", "Test Automation", "Software Testing",
  // Social media platforms
  "Facebook", "Facebook Marketing", "Facebook Ads", "Instagram", "Instagram Marketing",
  "TikTok", "TikTok Marketing", "Twitter", "X (Twitter)", "LinkedIn", "LinkedIn Marketing",
  "YouTube", "YouTube Marketing", "Snapchat", "Pinterest", "WhatsApp", "WhatsApp Business",
  "Telegram", "Reddit", "Discord", "Threads", "Social Media Management",
  "Social Media Marketing", "Social Media Account Management",
  // Mobile / platforms
  "Android", "Android Development", "iOS", "iOS Development", "iPhone", "iPad",
  "Mobile App Development", "Flutter", "React Native", "Swift", "Kotlin",
  // Support & security / recovery
  "Phone Support", "Phone Support Agent", "Customer Phone Support", "Technical Phone Support",
  "Live Chat Support", "Email Support", "Help Desk", "Tech Support",
  "Hacked Account Recovery", "Account Recovery", "Social Media Account Recovery",
  "Facebook Account Recovery", "Instagram Account Recovery", "Gmail Account Recovery",
  "Crypto Recovery", "Lost Asset Recovery", "Ethical Hacking", "Penetration Testing",
  "Cybersecurity", "Digital Forensics", "Blockchain Investigation", "OSINT",
];

import { SERVICE_NAMES, SERVICE_KEYWORDS } from "./service-taxonomy";

// Flat, de-duplicated list of every skill — used for the search/autocomplete.
export const ALL_SKILLS: string[] = Array.from(
  new Set([
    ...Object.values(SKILLS_BY_CATEGORY).flat(),
    ...EXTRA_SKILLS,
    ...SERVICE_NAMES,
  ])
).sort((a, b) => a.localeCompare(b));

// Map of skill/service name → extra search keywords, so typing a keyword
// (e.g. "copywriter") surfaces the matching service ("Copywriting").
const EXTRA_KEYWORDS: Record<string, string> = {
  Facebook: "fb meta social media facebook",
  "Facebook Ads": "fb ads meta ads facebook advertising paid social",
  Instagram: "ig insta social media instagram reels",
  TikTok: "tik tok short video social media",
  "X (Twitter)": "twitter x tweet social media",
  LinkedIn: "linked in social media b2b networking",
  YouTube: "yt youtube video channel",
  WhatsApp: "whatsapp wa chat messaging",
  "Social Media Management": "smm social media manager community management",
  "Phone Support": "phone support call center calling helpline inbound outbound voice support",
  "Tech Support": "technical support it support troubleshooting help desk",
  Android: "android google play mobile app apk",
  iOS: "ios apple iphone ipad app store",
  iPhone: "iphone apple ios mobile",
  "Hacked Account Recovery": "hacked account recovery recover hacked account restore disabled account social media recovery",
  "Account Recovery": "account recovery recover account lost access disabled banned suspended",
  "Crypto Recovery": "crypto recovery recover stolen crypto scam recovery bitcoin recovery wallet recovery",
  "Ethical Hacking": "ethical hacking hacker pentest penetration testing security",
  Cybersecurity: "cyber security infosec information security hacking protection",
};

export const SKILL_KEYWORDS: Record<string, string> = {
  ...SERVICE_KEYWORDS,
  ...EXTRA_KEYWORDS,
};
