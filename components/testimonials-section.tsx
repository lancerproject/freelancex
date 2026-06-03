import { Star } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const testimonials = [
  {
    content: "TalentHub transformed how we build our product. We found an incredible React developer within days who felt like part of our team from day one.",
    author: {
      name: "Alex Thompson",
      role: "CTO at Streamline",
      avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face",
    },
    rating: 5,
  },
  {
    content: "The quality of designers on this platform is exceptional. Our brand redesign exceeded expectations and was delivered on time and within budget.",
    author: {
      name: "Maria Santos",
      role: "Founder at Bloom Studio",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face",
    },
    rating: 5,
  },
  {
    content: "As a freelancer, TalentHub has been a game-changer. The platform is intuitive, payments are always on time, and I've connected with amazing clients.",
    author: {
      name: "James Wilson",
      role: "Freelance Developer",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    },
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold lg:text-4xl">Loved by thousands worldwide</h2>
          <p className="mt-4 text-muted-foreground">
            See what our clients and freelancers have to say about their experience.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                ))}
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                &quot;{testimonial.content}&quot;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={testimonial.author.avatar} alt={testimonial.author.name} />
                  <AvatarFallback>{testimonial.author.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{testimonial.author.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.author.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
