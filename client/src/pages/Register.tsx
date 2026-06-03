import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Shield, Mail, Lock, User, Phone, BookOpen, Home, Users, GraduationCap, UserPlus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, SUPABASE_CONFIG_VALID } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["STUDENT", "SUPERVISOR", "SECURITY"]).default("STUDENT"),
  roll_no: z.string().optional(),
  room_no: z.string().optional(),
  hostel_name: z.string().optional(),
  department: z.string().optional(),
  year: z.string().optional(),
  parent_name: z.string().optional(),
  parent_phone: z.string().optional(),
  parent_email: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "SECURITY") {
    if (!data.roll_no || data.roll_no.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roll_no"], message: "Guard Unique ID is required" });
    }
  } else if (data.role === "SUPERVISOR") {
    if (!data.department || data.department.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["department"], message: "Department is required" });
    }
  } else if (data.role === "STUDENT") {
    if (!data.department || data.department.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["department"], message: "Department is required" });
    }
    if (!data.roll_no) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["roll_no"], message: "Roll number is required" });
    if (!data.room_no) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["room_no"], message: "Room number is required" });
    if (!data.hostel_name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hostel_name"], message: "Hostel name is required" });
    if (!data.year) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["year"], message: "Year is required" });
    if (!data.parent_name || data.parent_name.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parent_name"], message: "Parent name is required" });
    if (!data.parent_phone || data.parent_phone.length < 10) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parent_phone"], message: "Valid parent phone required" });
    if (!data.parent_email || !z.string().email().safeParse(data.parent_email).success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parent_email"], message: "Valid parent email required" });
  }
});

type RegisterForm = z.infer<typeof registerSchema>;

interface Department {
  id: string;
  name: string;
  description?: string | null;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const submittingRef = useRef(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "", email: "", phone: "", password: "",
      role: "STUDENT",
      roll_no: "", room_no: "", hostel_name: "",
      department: "", year: "",
      parent_name: "", parent_phone: "", parent_email: "",
    },
  });

  const role = form.watch("role");
  const isStudent = role === "STUDENT";

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description")
        .order("name", { ascending: true });

      if (error) {
        toast({
          title: "Unable to load departments",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setDepartments(data || []);
      }

      setDepartmentsLoading(false);
    };

    if (SUPABASE_CONFIG_VALID) {
      fetchDepartments();
    } else {
      setDepartmentsLoading(false);
    }
  }, [toast]);

  const onSubmit = async (data: RegisterForm) => {
    if (submittingRef.current) return;
    if (cooldownSeconds > 0) {
      toast({
        title: "Please wait",
        description: `Signup is temporarily limited. Try again in ${cooldownSeconds} seconds.`,
        variant: "destructive",
      });
      return;
    }
    if (!SUPABASE_CONFIG_VALID) {
      toast({
        title: "Configuration missing",
        description:
          "Supabase configuration is missing. Copy .env.example to .env and restart the dev server.",
        variant: "destructive",
      });
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      let departmentId: string | undefined;
      if (data.role !== "SECURITY") {
        const { data: existingDepartment, error: departmentFetchError } = await supabase
          .from("departments")
          .select("id")
          .eq("name", data.department)
          .maybeSingle();

        if (departmentFetchError) throw departmentFetchError;

        departmentId = existingDepartment?.id;
        if (!departmentId) throw new Error("Selected department is not available. Please contact the administrator.");
      }

      let userId: string;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });
      if (authError) throw authError;
      userId = authData.user?.id;
      if (!userId) throw new Error("User creation failed");

      const profilePayload = {
        id: userId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: data.role === "STUDENT" ? "APPROVED" : "PENDING",
        department_id: departmentId || null,
        roll_number: isStudent || data.role === "SECURITY" ? data.roll_no : null,
        year: isStudent && data.year ? Number.parseInt(data.year, 10) : null,
        room_number: isStudent ? data.room_no : null,
        hostel_name: isStudent ? data.hostel_name : null,
        parent_name: isStudent ? data.parent_name : null,
        parent_phone: isStudent ? data.parent_phone : null,
        parent_email: isStudent ? data.parent_email : null,
      };

      // Use upsert to avoid primary key conflicts with handle_new_user database trigger
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profileError) throw profileError;

      if (data.role !== "STUDENT") {
        const { error: requestError } = await supabase.from("role_requests").insert({
          user_id: userId,
          requested_role: data.role,
          department_id: departmentId,
        });
        if (requestError) throw requestError;
      }

      const successMessage = data.role === "STUDENT"
        ? "Account created! Please sign in."
        : "Request submitted! Wait for admin approval before accessing the app.";

      toast({ title: "Account created!", description: successMessage });
      
      setLocation("/login");
    } catch (error: any) {
      let errorMessage = error.message || "Something went wrong";
      
      // Check for 429 Too Many Requests or SMTP rate limit
      const isRateLimit = 
        error.status === 429 || 
        (typeof error.message === 'string' && error.message.includes('429')) ||
        (error.status === 400 && typeof error.message === 'string' && error.message.toLowerCase().includes('rate limit')) ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('too many signup attempts'));

      if (isRateLimit) {
        errorMessage = "Too many signup attempts. Please wait a few minutes and try again.";
        setCooldownSeconds(300);
      }

      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <AnimatedBackground />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl tracking-wider text-foreground">CREATE ACCOUNT</h1>
          <p className="text-muted-foreground text-sm mt-1">Join the hostel leave management system</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Personal Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-foreground/80">Full Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="John Doe" className="pl-10 bg-background/50 border-white/10" data-testid="input-full-name" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder="your@email.com" className="pl-10 bg-background/50 border-white/10" data-testid="input-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Register as</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="STUDENT">Student</SelectItem>
                          <SelectItem value="SUPERVISOR">Supervisor (Approval required)</SelectItem>
                          <SelectItem value="SECURITY">Security Guard (Approval required)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="9876543210" className="pl-10 bg-background/50 border-white/10" data-testid="input-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-foreground/80">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="password" placeholder="••••••••" className="pl-10 bg-background/50 border-white/10" data-testid="input-password" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {isStudent && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" /> Hostel & Academic Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="roll_no" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Roll Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="CS21001" className="pl-10 bg-background/50 border-white/10" data-testid="input-roll-no" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="room_no" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Room Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A-101" className="bg-background/50 border-white/10" data-testid="input-room-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="hostel_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Hostel Name</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-hostel-name">
                            <SelectValue placeholder="Select hostel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Block A">Block A</SelectItem>
                          <SelectItem value="Block B">Block B</SelectItem>
                          <SelectItem value="Block C">Block C</SelectItem>
                          <SelectItem value="Block D">Block D</SelectItem>
                          <SelectItem value="Block E">Block E</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Department</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-department">
                            <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select dept."} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.length === 0 ? (
                            <SelectItem value="none" disabled>
                              {departmentsLoading ? "Loading departments..." : "No departments available"}
                            </SelectItem>
                          ) : (
                            departments.map((department) => (
                              <SelectItem key={department.id} value={department.name}>
                                {department.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Year</FormLabel>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              )}

              {form.watch("role") === "SECURITY" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Security Guard Details
                </p>
                <FormField control={form.control} name="roll_no" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Guard Unique ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input {...field} placeholder="e.g. SEC-102" className="pl-10 bg-background/50 border-white/10" data-testid="input-guard-id" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              )}

              {form.watch("role") === "SUPERVISOR" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Department for Approval
                </p>
                <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Department</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-department-role-request">
                          <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select dept."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.length === 0 ? (
                          <SelectItem value="none" disabled>
                            {departmentsLoading ? "Loading departments..." : "No departments available"}
                          </SelectItem>
                        ) : (
                          departments.map((department) => (
                            <SelectItem key={department.id} value={department.name}>
                              {department.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              )}

              {isStudent && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Parent / Guardian Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="parent_name" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-foreground/80">Parent / Guardian Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="Parent full name" className="pl-10 bg-background/50 border-white/10" data-testid="input-parent-name" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="parent_phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Parent Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="9876543210" className="pl-10 bg-background/50 border-white/10" data-testid="input-parent-phone" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="parent_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Parent Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder="parent@email.com" className="pl-10 bg-background/50 border-white/10" data-testid="input-parent-email" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              )}

              <Button type="submit" className="w-full" disabled={loading || cooldownSeconds > 0 || departmentsLoading} data-testid="button-register">
                {loading
                  ? "Creating account..."
                  : cooldownSeconds > 0
                    ? `Try again in ${cooldownSeconds}s`
                    : departmentsLoading
                      ? "Loading departments..."
                      : <><UserPlus className="w-4 h-4 mr-2" /> Create Account</>}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
