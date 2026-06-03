import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, FileText, Clock, QrCode, Shield,
  Users, LogOut, Scan, Settings, CheckSquare, Bell,
  Menu, X, ChevronRight, Search, Megaphone,
  BookOpen, Home, UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";

const timeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins || 1}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function useNavGroups(): NavGroup[] {
  const { profile } = useAuth();
  const role = profile?.role;

  if (role === "ADMIN") {
    return [
      {
        label: "Overview",
        items: [
          { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        ],
      },
      {
        label: "Management",
        items: [
          { href: "/supervisor", label: "Leave Approvals", icon: CheckSquare },
          { href: "/security", label: "Gate Security", icon: Scan },
        ],
      },
      {
        label: "System",
        items: [
          { href: "/admin", label: "User Management", icon: Users },
          { href: "/admin", label: "Announcements", icon: Megaphone },
        ],
      },
    ];
  }
  if (role === "SUPERVISOR") {
    return [
      {
        label: "Leave Management",
        items: [
          { href: "/supervisor", label: "Pending Approvals", icon: CheckSquare },
        ],
      },
    ];
  }
  if (role === "SECURITY") {
    return [
      {
        label: "Gate Operations",
        items: [
          { href: "/security", label: "QR Gate Scan", icon: Scan },
        ],
      },
    ];
  }
  return [
    {
      label: "My Account",
      items: [
        { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
        { href: "/apply-leave", label: "Apply Leave", icon: FileText },
        { href: "/leave-history", label: "Leave History", icon: Clock },
      ],
    },
  ];
}

function roleBadge(role?: string) {
  switch (role) {
    case "ADMIN": return "bg-red-100 text-red-700";
    case "SUPERVISOR": return "bg-purple-100 text-purple-700";
    case "SECURITY": return "bg-orange-100 text-orange-700";
    default: return "bg-blue-100 text-blue-700";
  }
}

function flatNavItems(groups: NavGroup[]): NavItem[] {
  const seen = new Set<string>();
  return groups.flatMap((g) => g.items).filter((item) => {
    if (seen.has(item.href + item.label)) return false;
    seen.add(item.href + item.label);
    return true;
  });
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { profile, signOut, refreshProfile } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navGroups = useNavGroups();
  const allItems = flatNavItems(navGroups);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.id) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setNotifications(data);
    };
    fetchNotifications();
  }, [profile?.id]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  const getDashboardHref = () => {
    if (!profile) return "/";
    switch (profile.role) {
      case "ADMIN": return "/admin";
      case "SUPERVISOR": return "/supervisor";
      case "SECURITY": return "/security";
      default: return "/dashboard";
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#243B53]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href={getDashboardHref()} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#2BB673] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">HOSTEL LEAVE</div>
            <div className="text-white/50 text-[10px] mt-0.5 font-medium tracking-wider">MANAGEMENT SYSTEM</div>
          </div>
        </Link>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35 px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = location === item.href &&
                  !(item.label === "User Management" || item.label === "Announcements");
                const isSecondaryAdmin = item.label === "User Management" || item.label === "Announcements";
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={(e) => {
                      if (item.label === "Announcements" || item.label === "User Management") {
                        if (location !== "/admin") {
                          sessionStorage.setItem("admin-action", item.label);
                        } else {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent(item.label === "Announcements" ? "open-announcements" : "scroll-to-users"));
                        }
                      }
                      setMobileOpen(false);
                    }}
                  >
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group cursor-pointer ${active && !isSecondaryAdmin
                        ? "bg-white/15 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/8"
                      }`}>
                      <item.icon className={`w-4 h-4 shrink-0 ${active && !isSecondaryAdmin ? "text-[#2BB673]" : "text-white/50 group-hover:text-white/80"
                        }`} />
                      <span className="truncate">{item.label}</span>
                      {active && !isSecondaryAdmin && (
                        <ChevronRight className="w-3 h-3 ml-auto text-[#2BB673]" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-white/8 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#2BB673] flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden border border-white/20">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.[0]?.toUpperCase() || "?"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-semibold truncate leading-none">
              {profile?.full_name || "Loading…"}
            </div>
            {profile?.department && (
              <div className="text-[10px] text-white/70 truncate mt-0.5">
                {profile.department}
              </div>
            )}
            <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleBadge(profile?.role)}`}>
              {profile?.role || "USER"}
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex">

      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-60 z-40 shadow-lg">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 md:hidden shadow-xl"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-md bg-white/10 text-white/70 hover:text-white z-10"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen min-w-0 w-full overflow-hidden">

        {/* Top header bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-14 flex items-center px-2 sm:px-4 md:px-6 gap-2 w-full max-w-full overflow-hidden">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 -ml-1 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-500">
            <Home className="w-3.5 h-3.5" />
            <ChevronRight className="w-3 h-3" />
            <span className="font-medium text-gray-800">{title || "Dashboard"}</span>
          </div>

          {/* Mobile title */}
          <div className="md:hidden flex items-center gap-1.5 flex-1 min-w-0">
            <Shield className="w-3.5 h-3.5 text-[#243B53] shrink-0" />
            <span className="font-bold text-xs text-[#243B53] whitespace-nowrap tracking-tight shrink-0">HOSTEL LEAVE</span>
          </div>

          <div className="flex-1" />

          {/* Date */}
          <div className="hidden md:flex items-center text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
            {formattedDate}
          </div>

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100 relative focus:outline-none">
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.status === 'pending') && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 border-gray-200 shadow-xl rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Notifications</span>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500 flex flex-col items-center">
                    <Bell className="w-8 h-8 text-gray-200 mb-2" />
                    No new notifications
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.type === 'ALERT' ? 'bg-red-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="text-xs font-semibold text-gray-800 mb-0.5">{notif.title}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{notif.body}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile chip */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex items-center gap-2.5 pl-2 border-l border-gray-200 hover:opacity-80 transition-opacity focus:outline-none text-left">
                <div className="w-7 h-7 rounded-full bg-[#243B53] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile?.full_name?.[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-700 max-w-[120px] truncate leading-tight">
                    {profile?.full_name || "—"}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {profile?.role || "USER"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 border-gray-200 shadow-xl rounded-xl p-1">
              <DropdownMenuLabel className="px-3 py-4">
                <div className="flex flex-col items-center space-y-3">
                  <ProfilePictureUpload
                    userId={profile?.id!}
                    name={profile?.full_name || "?"}
                    currentUrl={profile?.avatar_url}
                    onUploadSuccess={() => refreshProfile()}
                  />
                  <div className="flex flex-col space-y-1 text-center">
                    <p className="text-sm font-semibold text-gray-800 leading-none">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500 leading-none truncate">{profile?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="p-1">
                <DropdownMenuItem asChild className="cursor-pointer text-gray-600 rounded-md focus:bg-gray-50 focus:text-gray-900 px-3 py-2">
                  <Link href="/dashboard" className="flex items-center gap-2 text-sm w-full">
                    <UserCog className="w-4 h-4" /> My Account
                  </Link>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="p-1">
                <DropdownMenuItem
                  onClick={signOut}
                  className="cursor-pointer text-red-600 rounded-md focus:bg-red-50 focus:text-red-700 px-3 py-2 flex items-center gap-2 text-sm"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6 max-w-screen-xl w-full mx-auto">
          {(title || subtitle) && (
            <div className="mb-6 w-full max-w-full">
              {title && <h1 className="text-xl font-bold text-[#243B53] break-words">{title}</h1>}
              {subtitle && <p className="text-sm text-gray-500 mt-0.5 break-words whitespace-normal">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-30 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1.5">
        {allItems.slice(0, 3).map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href + item.label} href={item.href}>
              <div className={`flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg transition-colors ${active ? "text-[#243B53]" : "text-gray-400"
                }`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
              </div>
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}
