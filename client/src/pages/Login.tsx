import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, EyeOff, Chrome, KeyRound, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, SUPABASE_CONFIG_VALID } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AnimatedBackground } from "@/components/AnimatedBackground";

type AuthMode = "password" | "otp";

const passwordSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const otpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyOtpSchema = z.object({
  token: z.string().length(6, "Enter the 6-digit code"),
});

type PasswordForm = z.infer<typeof passwordSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type VerifyOtpForm = z.infer<typeof verifyOtpSchema>;

async function getPostLoginPath(userId: string) {

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  switch (data?.role?.toUpperCase()) {
    case "ADMIN":
      return "/admin";
    case "SUPERVISOR":
      return "/supervisor";
    case "SECURITY":
      return "/security";
    default:
      return "/dashboard";
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { email: "" },
  });

  const verifyForm = useForm<VerifyOtpForm>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { token: "" },
  });

  const onPasswordSubmit = async (data: PasswordForm) => {
    setLoading(true);
    try {
      // Normal auth flow
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;

      const { data: profile } = await supabase.from("profiles").select("status").eq("id", authData.user.id).single();
      
      if (profile?.status === "REJECTED") {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "Your role request was rejected by the administrator.", variant: "destructive" });
        return;
      }
      if (profile?.status === "PENDING") {
        await supabase.auth.signOut();
        toast({ title: "Approval Pending", description: "Your account is still pending administrator approval." });
        return;
      }

      toast({ title: "Welcome back!", description: "Signed in successfully." });
      setLocation(await getPostLoginPath(authData.user.id));
    } catch (error: any) {
      let errorMessage = error.message || "Invalid credentials";

      if (
        error.status === 400 ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("invalid login credentials"))
      ) {
        errorMessage = "Invalid email or password. If you just signed up, confirm your email first or reset your password.";
      }

      toast({ title: "Login failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setOtpEmail(data.email);
      setOtpSent(true);
      toast({ title: "Code sent!", description: "Check your email (and spam folder) for the 6-digit code." });
    } catch (error: any) {
      toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data: VerifyOtpForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: data.token, type: "email" });
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
        if (profile?.status === "REJECTED") {
          await supabase.auth.signOut();
          toast({ title: "Access Denied", description: "Your role request was rejected by the administrator.", variant: "destructive" });
          return;
        }
        if (profile?.status === "PENDING") {
          await supabase.auth.signOut();
          toast({ title: "Approval Pending", description: "Your account is still pending administrator approval." });
          return;
        }
      }

      toast({ title: "Signed in!", description: "Welcome to Hostel Leave." });
      setLocation(user ? await getPostLoginPath(user.id) : "/dashboard");
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onGoogleLogin = async () => {
    if (!SUPABASE_CONFIG_VALID) {
      toast({ title: "Configuration missing", description: "Supabase configuration is missing. Copy .env.example to .env and restart the dev server.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Google login failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl tracking-wider text-foreground">HOSTEL LEAVE</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="glass-panel rounded-2xl p-8 space-y-5">
          {/* Password form */}
          <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField control={passwordForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} type="email" placeholder="your@email.com"
                          className="pl-10 bg-background/50 border-white/10 focus:border-primary/50"
                          data-testid="input-email" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={passwordForm.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••"
                          className="pl-10 pr-10 bg-background/50 border-white/10 focus:border-primary/50"
                          data-testid="input-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          data-testid="button-toggle-password">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
                  {loading ? "Signing in…" : <><ArrowRight className="w-4 h-4 mr-2" />Sign In</>}
                </Button>
              </form>
            </Form>


          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
              Register here
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
