import { 
  Code, 
  Palette, 
  Smartphone, 
  PenTool, 
  TrendingUp, 
  Video, 
  FileText, 
  Headphones,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

const categories = [
  {
    name: "Development & IT",
    description: "Software engineers, web developers, DevOps",
    icon: Code,
    freelancers: "1.2M+",
    color: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  },
  {
    name: "Design & Creative",
    description: "UI/UX designers, graphic artists, illustrators",
    icon: Palette,
    freelancers: "800K+",
    color: "bg-pink-500/10 text-pink-500 dark:bg-pink-500/20",
  },
  {
    name: "Mobile Development",
    description: "iOS, Android, React Native, Flutter",
    icon: Smartphone,
    freelancers: "450K+",
    color: "bg-primary/10 text-primary dark:bg-primary/20",
  },
  {
    name: "Writing & Content",
    description: "Copywriters, content strategists, editors",
    icon: PenTool,
    freelancers: "600K+",
    color: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20",
  },
  {
    name: "Sales & Marketing",
    description: "SEO experts, social media, lead generation",
    icon: TrendingUp,
    freelancers: "500K+",
    color: "bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20",
  },
  {
    name: "Video & Animation",
    description: "Video editors, motion graphics, 3D artists",
    icon: Video,
    freelancers: "300K+",
    color: "bg-red-500/10 text-red-500 dark:bg-red-500/20",
  },
  {
    name: "Admin & Support",
    description: "Virtual assistants, data entry, research",
    icon: FileText,
    freelancers: "400K+",
    color: "bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20",
  },
  {
    name: "Customer Service",
    description: "Support agents, chat specialists, moderators",
    icon: Headphones,
    freelancers: "250K+",
    color: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
  },
]

export function CategoriesSection() {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold lg:text-4xl">Browse by Category</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Find skilled professionals across all major categories. From tech to creative, we have talent for every need.
            </p>
          </div>
          <Link 
            href="/categories"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            View all categories
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/category/${category.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`inline-flex rounded-lg p-3 ${category.color}`}>
                <category.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {category.description}
              </p>
              <p className="mt-3 text-xs font-medium text-muted-foreground">
                {category.freelancers} freelancers
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
