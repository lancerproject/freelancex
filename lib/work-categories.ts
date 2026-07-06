// Top-level professional categories + their specialties, used by the
// "what kind of work are you here to do?" profile step. Pick 1 category, then
// 1–3 specialties. Ordered to match the categories list shown on the left.
export const WORK_CATEGORIES: Record<string, string[]> = {
  "Accounting & Consulting": [
    "Personal & Professional Coaching",
    "Accounting & Bookkeeping",
    "Financial Planning",
    "Recruiting & Human Resources",
    "Management Consulting & Analysis",
    "Other - Accounting & Consulting",
  ],
  "Admin Support": [
    "Data Entry & Transcription Services",
    "Virtual Assistance",
    "Project Management",
    "Market Research & Product Reviews",
  ],
  "Customer Service": [
    "Community Management & Tagging",
    "Customer Service & Tech Support",
  ],
  "Data Science & Analytics": [
    "Data Analysis & Testing",
    "Data Extraction / ETL",
    "Data Mining & Management",
    "AI & Machine Learning",
  ],
  "Design & Creative": [
    "Art & Illustration",
    "Audio & Music Production",
    "Branding & Logo Design",
    "Graphic, Editorial & Presentation Design",
    "Motion Graphics",
    "NFT, Metaverse & 3D Design",
    "Photography",
    "Product & Industrial Design",
    "UX/UI Design",
    "Video & Animation",
  ],
  "Engineering & Architecture": [
    "3D Modeling & CAD",
    "Architecture & Interior Design",
    "Civil & Structural Engineering",
    "Electrical & Electronic Engineering",
    "Mechanical Engineering",
    "Energy & Sustainability",
    "Physical Sciences",
    "Contract Manufacturing",
  ],
  "IT & Networking": [
    "Database Management & Administration",
    "ERP / CRM Software",
    "Information Security & Compliance",
    "Network & System Administration",
    "DevOps & Solution Architecture",
  ],
  Legal: [
    "Corporate & Contract Law",
    "Finance & Tax Law",
    "Immigration & International Law",
    "Intellectual Property Law",
    "Public Law",
    "Other - Legal",
  ],
  "Sales & Marketing": [
    "Digital Marketing",
    "Lead Generation & Telemarketing",
    "Marketing, PR & Brand Strategy",
  ],
  Translation: [
    "Language Tutoring & Interpretation",
    "Translation & Localization Services",
  ],
  "Web, Mobile & Software Dev": [
    "Blockchain, NFT & Cryptocurrency",
    "AI Apps & Integration",
    "Desktop Application Development",
    "Ecommerce Development",
    "Game Design & Development",
    "Mobile Development",
    "Product Management",
    "QA & Testing",
    "Scripts & Utilities",
    "Web & Mobile Design",
    "Web Development",
    "Other - Software Development",
  ],
  Writing: [
    "Sales & Marketing Copywriting",
    "Content Writing",
    "Editing & Proofreading",
    "Professional & Business Writing",
    "Career Coaching",
  ],
};

export const WORK_CATEGORY_NAMES: string[] = Object.keys(WORK_CATEGORIES);

// Skills we suggest on the "add your skills" step, based on the category the
// freelancer picked. These pre-populate the "Suggested skills" chips.
export const SUGGESTED_SKILLS_BY_CATEGORY: Record<string, string[]> = {
  "Accounting & Consulting": [
    "Bookkeeping", "Accounting", "Financial Analysis", "Financial Modeling",
    "Tax Preparation", "Payroll", "QuickBooks", "Business Consulting",
    "Management Consulting", "Human Resources", "Recruiting", "Budgeting",
  ],
  "Admin Support": [
    "Data Entry", "Virtual Assistant", "Administrative Support",
    "Email Management", "Calendar Management", "Project Management",
    "Microsoft Excel", "Google Workspace", "Transcription", "Market Research",
    "Scheduling", "File Management",
  ],
  "Customer Service": [
    "Customer Service", "Customer Support", "Technical Support",
    "Live Chat Support", "Email Support", "Help Desk", "Zendesk",
    "Community Management", "Phone Support", "Complaint Handling", "CRM",
    "Order Processing",
  ],
  "Data Science & Analytics": [
    "Data Analysis", "Data Visualization", "Python", "SQL", "Machine Learning",
    "Statistics", "Microsoft Excel", "Power BI", "Tableau", "Data Mining",
    "ETL", "Data Cleaning",
  ],
  "Design & Creative": [
    "Graphic Design", "Logo Design", "Branding", "Adobe Photoshop",
    "Adobe Illustrator", "UI/UX Design", "Figma", "Illustration",
    "Motion Graphics", "Video Editing", "Brand Identity", "Social Media Design",
  ],
  "Engineering & Architecture": [
    "AutoCAD", "3D Modeling", "SolidWorks", "Civil Engineering",
    "Mechanical Engineering", "Electrical Engineering", "Architecture",
    "Interior Design", "CAD", "Structural Analysis", "Revit", "Product Design",
  ],
  "IT & Networking": [
    "Network Administration", "System Administration", "Cybersecurity", "Linux",
    "Cloud Computing", "AWS", "DevOps", "Database Administration",
    "Windows Server", "IT Support", "Network Security", "Troubleshooting",
  ],
  Legal: [
    "Contract Law", "Legal Writing", "Legal Research", "Contract Drafting",
    "Corporate Law", "Compliance", "Intellectual Property", "Immigration Law",
    "Legal Consulting", "Document Review", "Trademark", "Privacy Law",
  ],
  "Sales & Marketing": [
    "Lead Generation", "Sales Lead Lists", "Social Media Lead Generation",
    "Telemarketing", "Brand Consulting", "Brand Development", "Brand Identity",
    "Branding", "Digital Marketing", "Digital Marketing Strategy", "Marketing",
    "SEO",
  ],
  Translation: [
    "Translation", "Localization", "Proofreading", "Transcription",
    "Subtitling", "Interpretation", "Language Tutoring", "Editing",
    "Content Translation", "Bilingual Communication",
  ],
  "Web, Mobile & Software Dev": [
    "JavaScript", "React", "Node.js", "Python", "Web Development",
    "Mobile App Development", "Flutter", "HTML", "CSS", "API Development",
    "TypeScript", "WordPress",
  ],
  Writing: [
    "Content Writing", "Copywriting", "Blog Writing", "SEO Writing",
    "Article Writing", "Ghostwriting", "Editing", "Proofreading",
    "Technical Writing", "Creative Writing", "Email Copy", "Scriptwriting",
  ],
};
