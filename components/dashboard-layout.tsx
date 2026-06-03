"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  MessageSquare, 
  CreditCard, 
  Settings,
  FileText,
  Star,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const clientNavigation = [
  { name: "Dashboard", href: "/dashboard/client", icon: LayoutDashboard },
  { name: "My Projects", href: "/dashboard/client/projects", icon: Briefcase },
  { name: "Find Talent", href: "/dashboard/client/talent", icon: Users },
  { name: "Messages", href: "/dashboard/client/messages", icon: MessageSquare },
  { name: "Contracts", href: "/dashboard/client/contracts", icon: FileText },
  { name: "Payments", href: "/dashboard/client/payments", icon: CreditCard },
  { name: "Reviews", href: "/dashboard/client/reviews", icon: Star },
  { name: "Settings", href: "/dashboard/client/settings", icon: Settings },
]

const freelancerNavigation = [
  { name: "Dashboard", href: "/dashboard/freelancer", icon: LayoutDashboard },
  { name: "Find Work", href: "/dashboard/freelancer/jobs", icon: Briefcase },
  { name: "My Proposals", href: "/dashboard/freelancer/proposals", icon: FileText },
  { name: "Messages", href: "/dashboard/freelancer/messages", icon: MessageSquare },
  { name: "Contracts", href: "/dashboard/freelancer/contracts", icon: FileText },
  { name: "Earnings", href: "/dashboard/freelancer/earnings", icon: CreditCard },
  { name: "My Profile", href: "/dashboard/freelancer/profile", icon: Users },
  { name: "Settings", href: "/dashboard/freelancer/settings", icon: Settings },
]

interface DashboardLayoutProps {
  children: React.ReactNode
  userType: "client" | "freelancer"
}

export function DashboardLayout({ children, userType }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const navigation = userType === "client" ? clientNavigation : freelancerNavigation
  const userName = userType === "client" ? "John Smith" : "Sarah Chen"
  const userRole = userType === "client" ? "Business Owner" : "Full-Stack Developer"

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">T</span>
              </div>
              <span className="text-lg font-bold">TalentHub</span>
            </Link>
            <button 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User profile */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                <AvatarFallback>{userName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userRole}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold hidden sm:block">
              {userType === "client" ? "Client Dashboard" : "Freelancer Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                3
              </span>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
