import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Phone, BookOpen, Home, Users, User, Mail, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const completeSchema = z.object({
  full_name:    z.string().min(2, "Full name required"),
  phone:        z.string().min(10, "Valid phone required"),
  roll_no:      z.string().min(1, "Roll number required"),
  room_no:      z.string().min(1, "Room number required"),
  hostel_name:  z.string().min(1, "Hostel name required"),
  department:   z.string().min(1, "Department required"),
  year:         z.string().min(1, "Year required"),
  parent_name:  z.string().min(2, "Parent name required"),
  parent_phone: z.string().min(10, "Valid parent phone required"),
  parent_email: z.string().email("Valid parent email required").or(z.literal("")),
});

type CompleteForm = z.infer<typeof completeSchema>;

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      full_name:    profile?.full_name || user?.user_metadata?.full_name || "",
      phone:        profile?.phone || "",
      roll_no:      "",
      room_no:      "",
      hostel_name:  "",
      department:   "",
      year:         "",
      parent_name:  "",
      parent_phone: "",
      parent_email: "",
    },
  });

  const onSubmit = async (data: CompleteForm) => {
    if (!user) return;
    setLoading(true);
    try {
      const isDevMode = 
        import.meta.env.VITE_DEV_MODE === "true" || 
        import.meta.env.VITE_DEV_MODE === true ||
        (window.location.hostname === "localhost" && localStorage.getItem("dev_mode_fallback") === "true");

      if (isDevMode) {
        const devProfiles = JSON.parse(localStorage.getItem("dev_profiles") || "{}");
        const profilePayload = {
          id: user.id,
          full_name: data.full_name,
          email: user.email ?? "dev@example.com",
          phone: data.phone,
          role: profile?.role ?? "STUDENT",
          status: "APPROVED",
          department: data.department,
          year: data.year,
          room_number: data.room_no,
          hostel_name: data.hostel_name,
          parent_name: data.parent_name,
          parent_phone: data.parent_phone,
          parent_email: data.parent_email || null,
        };
        devProfiles[profilePayload.email] = profilePayload;
        localStorage.setItem("dev_profiles", JSON.stringify(devProfiles));
        localStorage.setItem("dev_user_profile", JSON.stringify(profilePayload));
      } else {
        const { error: profileErr } = await supabase
          .from("profiles")
          .upsert({
            id:        user.id,
            full_name: data.full_name,
            email:     user.email ?? "",
            phone:     data.phone,
            role:      profile?.role ?? "STUDENT",
          }, { onConflict: "id" });
        if (profileErr) throw profileErr;

        const { error: studentErr } = await supabase
          .from("students")
          .upsert({
            id:           user.id,
            roll_no:      data.roll_no,
            room_no:      data.room_no,
            hostel_name:  data.hostel_name,
            department:   data.department,
            year:         data.year,
            parent_name:  data.parent_name,
            parent_phone: data.parent_phone,
            parent_email: data.parent_email || null,
            current_status: "IN_HOSTEL",
          }, { onConflict: "id" });

        if (studentErr) console.warn("Students upsert (non-fatal):", studentErr.message);
      }

      await refreshProfile();
      toast({ title: "Profile completed!", description: "Welcome to Hostel Leave." });
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Failed to save profile", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-background">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-3xl tracking-wider text-foreground">COMPLETE PROFILE</h1>
          <p className="text-muted-foreground text-sm mt-1">Fill in your details to start using the system.</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Personal */}
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
                          <Input {...field} placeholder="Your full name" className="pl-10 bg-background/50 border-white/10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-foreground/80">Your Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="9876543210" className="pl-10 bg-background/50 border-white/10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Hostel & Academic */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5" /> Hostel &amp; Academic Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="roll_no" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Roll Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} placeholder="CS21001" className="pl-10 bg-background/50 border-white/10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="room_no" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Room Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A-101" className="bg-background/50 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hostel_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Hostel Block</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10">
                            <SelectValue placeholder="Select block" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Block A","Block B","Block C","Block D","Block E"].map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Department</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10">
                            <SelectValue placeholder="Select dept." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["CSE","ECE","ME","CE","EEE","IT","Other"].map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Year</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50 border-white/10">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["1st Year","2nd Year","3rd Year","4th Year"].map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Parent / Guardian */}
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
                          <Input {...field} placeholder="Parent full name" className="pl-10 bg-background/50 border-white/10" />
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
                          <Input {...field} placeholder="9876543210" className="pl-10 bg-background/50 border-white/10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="parent_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Parent Email <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input {...field} type="email" placeholder="parent@email.com" className="pl-10 bg-background/50 border-white/10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading} data-testid="button-complete-profile">
                {loading ? "Saving…" : <><ArrowRight className="w-4 h-4 mr-2" /> Complete Profile & Continue</>}
              </Button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
}
