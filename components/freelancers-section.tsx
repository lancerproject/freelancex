import { Star, MapPin, BadgeCheck, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const freelancers = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "Senior Full-Stack Developer",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    location: "San Francisco, USA",
    rating: 4.9,
    reviews: 127,
    hourlyRate: 95,
    skills: ["React", "Node.js", "TypeScript", "AWS"],
    verified: true,
    jobSuccess: 98,
  },
  {
    id: 2,
    name: "Marcus Johnson",
    title: "UI/UX Designer & Brand Strategist",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    location: "London, UK",
    rating: 5.0,
    reviews: 89,
    hourlyRate: 85,
    skills: ["Figma", "UI Design", "Branding", "Prototyping"],
    verified: true,
    jobSuccess: 100,
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    title: "Mobile App Developer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    location: "Barcelona, Spain",
    rating: 4.8,
    reviews: 64,
    hourlyRate: 75,
    skills: ["React Native", "Flutter", "iOS", "Android"],
    verified: true,
    jobSuccess: 96,
  },
  {
    id: 4,
    name: "David Kim",
    title: "DevOps & Cloud Architect",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    location: "Seoul, South Korea",
    rating: 4.9,
    reviews: 156,
    hourlyRate: 110,
    skills: ["AWS", "Kubernetes", "Docker", "Terraform"],
    verified: true,
    jobSuccess: 99,
  },
  {
    id: 5,
    name: "Amara Okonkwo",
    title: "Content Writer & SEO Specialist",
    avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face",
    location: "Lagos, Nigeria",
    rating: 4.7,
    reviews: 93,
    hourlyRate: 45,
    skills: ["Content Strategy", "SEO", "Copywriting", "Blog Writing"],
    verified: true,
    jobSuccess: 95,
  },
  {
    id: 6,
    name: "Thomas Mueller",
    title: "AI & Machine Learning Engineer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    location: "Berlin, Germany",
    rating: 5.0,
    reviews: 42,
    hourlyRate: 150,
    skills: ["Python", "TensorFlow", "PyTorch", "NLP"],
    verified: true,
    jobSuccess: 100,
  },
]

export function FreelancersSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold lg:text-4xl">Top Rated Freelancers</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Work with skilled professionals who have proven track records and verified expertise.
            </p>
          </div>
          <Link 
            href="/freelancers"
            className="inline-flex items-center text-sm font-medium text-primary hover:underline"
          >
            Browse all freelancers
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {freelancers.map((freelancer) => (
            <Link
              key={freelancer.id}
              href={`/freelancer/${freelancer.id}`}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
                    <AvatarFallback>{freelancer.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {freelancer.name}
                      </h3>
                      {freelancer.verified && (
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {freelancer.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-medium">{freelancer.rating}</span>
                  <span className="text-muted-foreground">({freelancer.reviews})</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{freelancer.location}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {freelancer.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {freelancer.skills.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{freelancer.skills.length - 3}
                  </Badge>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm">
                  <span className="text-muted-foreground">Job Success:</span>{" "}
                  <span className="font-medium text-green-500">{freelancer.jobSuccess}%</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold">${freelancer.hourlyRate}</span>
                  <span className="text-sm text-muted-foreground">/hr</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/freelancers">
            <Button size="lg" variant="outline">
              View All Freelancers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
