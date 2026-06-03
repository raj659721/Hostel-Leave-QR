import { createContext } from "react";
import { User } from "@supabase/supabase-js";

export type Role = "STUDENT" | "SUPERVISOR" | "SECURITY" | "ADMIN" | "PARENT";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status: "PENDING" | "APPROVED" | "REJECTED";
  phone?: string;
  department_id?: string;
  department?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  avatar_url?: string;
};

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isProfileComplete: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isProfileComplete: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});
