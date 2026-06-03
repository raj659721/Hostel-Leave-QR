import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { LogOut, Bell, Shield, Menu, X, Settings } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { profile, signOut } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const studentLinks = [
    { href: "/dashboard",     label: "Dashboard"     },
    { href: "/apply-leave",   label: "Apply Leave"   },
    { href: "/leave-history", label: "Leave History" },
  ];

  const supervisorLinks = [
    { href: "/supervisor", label: "Approvals" },
  ];

  const securityLinks = [
    { href: "/security", label: "Gate Scanner" },
  ];

  const adminLinks = [
    { href: "/admin",   label: "Admin"      },
    { href: "/supervisor", label: "Approvals" },
    { href: "/security", label: "Gate Scanner" },
  ];

  const links =
    profile?.role === "ADMIN"
      ? adminLinks
      : profile?.role === "SUPERVISOR"
      ? supervisorLinks
      : profile?.role === "SECURITY"
      ? securityLinks
      : studentLinks;

  const roleColor =
    profile?.role === "ADMIN"    ? "text-red-400"    :
    profile?.role === "SUPERVISOR" ? "text-purple-400" :
    profile?.role === "SECURITY" ? "text-orange-400" :
    "text-blue-400";

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/10 px-4 md:px-8 py-3 flex items-center justify-between"
    >
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <span className="font-display text-lg tracking-wider text-foreground hidden sm:block">
          HOSTEL LEAVE
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-1">
        {profile && links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button
              variant="ghost"
              size="sm"
              className={`text-sm ${
                location === link.href
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {profile && (
          <>
            <div className="hidden md:flex items-center gap-2 mr-1">
              <span className="text-sm text-muted-foreground">{profile.full_name}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${roleColor}`}>
                {profile.role}
              </span>
            </div>
            {profile.role === "ADMIN" && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400" data-testid="button-admin">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-destructive"
              data-testid="button-signout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:block ml-1">Sign Out</span>
            </Button>
          </>
        )}
        {!profile && (
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="nav-link-login">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="nav-link-register">Register</Button>
            </Link>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="button-menu"
        >
          {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {menuOpen && profile && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 glass-panel border-b border-white/10 py-4 px-4 flex flex-col gap-2 md:hidden"
        >
          <div className="flex items-center justify-between px-1 pb-2 border-b border-white/10 mb-1">
            <span className="text-sm text-foreground font-medium">{profile.full_name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ${roleColor}`}>
              {profile.role}
            </span>
          </div>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  location === link.href ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Button>
            </Link>
          ))}
          <Button variant="ghost" onClick={signOut} className="w-full justify-start text-destructive/70 hover:text-destructive mt-1">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </motion.div>
      )}
    </motion.nav>
  );
}
