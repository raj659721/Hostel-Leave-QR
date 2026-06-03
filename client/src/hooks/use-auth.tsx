import { useContext } from "react";
import { AuthContext } from "@/context/auth-types";

export function useAuth() {
  return useContext(AuthContext);
}

export type { Profile, Role, AuthContextType } from "@/context/auth-types";
