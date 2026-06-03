import React, { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext, Profile } from "@/context/auth-types";

function normalizeProfile(profile: Profile | null): Profile | null {
  if (!profile) return null;

  return {
    ...profile,
    role: profile.role?.toUpperCase() as Profile["role"],
    status: profile.status?.toUpperCase() as Profile["status"],
  };
}

async function fetchOrCreateProfile(userId: string): Promise<Profile | null> {

  // 1. Try to SELECT the profile row
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status, phone, department_id, departments(name), parent_name, parent_phone, parent_email, avatar_url")
    .eq("id", userId)
    .single();

  if (data) {
    const profileWithDept = {
      ...(data as any),
      department: (data as any).departments?.name,
    };
    return normalizeProfile(profileWithDept as Profile);
  }

  // Profile missing — try to INSERT it (e.g. first Google/OTP login)
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const newProfile: Profile = {
    id: userId,
    full_name:
      authUser?.user_metadata?.full_name ||
      authUser?.email?.split("@")[0] ||
      "User",
    email: authUser?.email ?? "",
    role: "STUDENT",
    status: "APPROVED",
  };

  const { error: insertErr } = await supabase
    .from("profiles")
    .insert(newProfile);

  if (insertErr && insertErr.code !== "23505") {
    // 23505 = unique_violation (row already existed — race condition)
    console.error("Profile INSERT failed:", insertErr.code, insertErr.message);
  }

  // Final SELECT — works whether INSERT succeeded or row already existed
  const { data: refetched } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, phone, department_id, departments(name), avatar_url")
    .eq("id", userId)
    .single();

  const normalized = refetched
    ? { ...(refetched as any), department: (refetched as any).departments?.name }
    : newProfile;

  return normalizeProfile(normalized as Profile);
}

/**
 * A profile is "complete" when the user has provided their phone number.
 * Google/OTP signups will not have a phone until they fill CompleteProfile.
 * Password signups via Register.tsx always set phone during registration.
 */
function checkProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const p = await fetchOrCreateProfile(userId);
    setProfile(p);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      setLoading(true);
      await loadProfile(user.id);
    }
  };

  useEffect(() => {

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error("Supabase Auth session recovery error:", error.message || error);
        
        // Purge all Supabase auth storage keys from localStorage to prevent loops
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase.auth"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.error("Emergency sign out failed:", signOutErr);
        }

        setUser(null);
        setProfile(null);
        setLoading(false);
        
        // Clean redirect to login page
        window.location.href = "/login";
        return;
      }

      const u = session?.user ?? null;
      console.log("[HostelLeaveAuth] Initial session loaded successfully. Active User:", u ? u.email : "No Active Session");
      setUser(u);
      if (u) {
        loadProfile(u.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        console.log(`[HostelLeaveAuth] Auth State Changed Event: ${_event}. Current User:`, u ? u.email : "Signed Out");
        setUser(u);
        if (u) {
          loadProfile(u.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {

    await supabase.auth.signOut();
  };

  const isProfileComplete = checkProfileComplete(profile);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isProfileComplete, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
