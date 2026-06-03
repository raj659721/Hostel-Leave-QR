import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";

type Role = "STUDENT" | "SUPERVISOR" | "SECURITY" | "ADMIN" | "PARENT";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

/** Dashboard path for each role */
function roleDashboard(role: string): string {
  switch (role) {
    case "ADMIN":      return "/admin";
    case "SUPERVISOR": return "/supervisor";
    case "SECURITY":   return "/security";
    default:           return "/dashboard";
  }
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading, isProfileComplete, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    // Not authenticated → login
    if (!user) {
      setLocation("/login");
      return;
    }

    // Profile incomplete (e.g. Google/OTP signup, no phone yet) → complete profile
    // DISABLED: Bypassed redirect to /complete-profile as requested. Users go straight to dashboard.
    /*
    if (profile && !isProfileComplete && location !== "/complete-profile") {
      setLocation("/complete-profile");
      return;
    }
    */

    // Rejected account approval
    if (profile && profile.status === "REJECTED") {
      signOut();
      toast({ title: "Access Denied", description: "Your role request was rejected by the administrator.", variant: "destructive" });
      setLocation("/login");
      return;
    }

    // Pending account approval
    if (profile && profile.status === "PENDING") {
      signOut();
      toast({ title: "Approval Pending", description: "Your account is still pending administrator approval." });
      setLocation("/login");
      return;
    }

    // Wrong role for this page → redirect to their own dashboard
    if (allowedRoles && profile && !allowedRoles.includes(profile.role as Role)) {
      setLocation(roleDashboard(profile.role));
    }
  }, [loading, user, profile, isProfileComplete, location, allowedRoles, setLocation, signOut, toast]);

  if (loading) return <LoadingScreen />;
  if (!user)   return null;

  // Show a role-mismatch message for roles that can't access the page
  // (the useEffect above will redirect, but this handles the brief flash)
  if (allowedRoles && profile && !allowedRoles.includes(profile.role as Role)) {
    return null;
  }

  return <>{children}</>;
}
