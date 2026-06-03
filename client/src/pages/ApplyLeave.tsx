import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, FileText, Phone, Send, Tag, Info } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { applyLeave, sendParentEmail, type LeaveType } from "@/lib/api/leave";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const leaveSchema = z.object({
  leave_type:  z.string().min(1, "Leave type is required"),
  from_date:   z.string().min(1, "From date is required"),
  to_date:     z.string().min(1, "To date is required"),
  out_time:    z.string().min(1, "Departure time is required"),
  return_time: z.string().min(1, "Return time is required"),
  destination: z.string().min(2, "Destination is required"),
  reason:      z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveForm = z.infer<typeof leaveSchema>;

export default function ApplyLeave() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [parentPhone, setParentPhone] = useState<string>("");
  const [parentEmail, setParentEmail] = useState<string>("");
  const [parentName, setParentName] = useState<string>("");
  const [loadingParent, setLoadingParent] = useState(true);

  const form = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type: "", from_date: "", to_date: "", out_time: "", return_time: "",
      destination: "", reason: "",
    },
  });

  useEffect(() => {
    if (!profile) return;

    const fetchStudentProfile = async () => {
      setLoadingParent(true);
      setLoadingParent(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("parent_phone, parent_name, parent_email")
        .eq("id", profile.id)
        .maybeSingle();

      if (error) {
        console.error("Failed loading student parent details:", error);
        toast({
          title: "Unable to load parent details",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      } else if (data) {
        setParentPhone(data.parent_phone || "");
        setParentName(data.parent_name || "");
        setParentEmail(data.parent_email || "");
      }

      setLoadingParent(false);
    };

    fetchStudentProfile();
  }, [profile, toast]);

  const onSubmit = async (data: LeaveForm) => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({ title: "Not signed in", description: "Please sign in and try again.", variant: "destructive" });
        setLocation("/login");
        return;
      }

      // Ensure profiles table entry exists
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id);

        if (!profileRow || profileRow.length === 0) {
          const { error: insertErr } = await supabase.from("profiles").insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email ?? "",
            role: "STUDENT",
          });
          if (insertErr && insertErr.code !== "23505") {
            toast({ title: "Profile setup failed", description: insertErr.message, variant: "destructive" });
            console.error("Profile insert error:", insertErr);
            return;
          }
        }

      const leaveResult = await applyLeave({
        leave_type:   data.leave_type as LeaveType,
        from_date:    data.from_date,
        to_date:      data.to_date,
        out_time:     data.out_time,
        return_time:  data.return_time,
        destination:  data.destination,
        reason:       data.reason,
        parent_phone: parentPhone,
      });

      let submissionToast: Parameters<typeof toast>[0] = {
        title: "Leave request submitted!",
        description: "Your supervisor will review it. Parent will be notified automatically.",
      };

      if (parentEmail) {
        try {
          await sendParentEmail({
            leaveRequestId: leaveResult.id,
            parentEmail,
            studentName: profile?.full_name || "Student",
            leaveType: data.leave_type,
            fromDate: data.from_date,
            toDate: data.to_date,
            destination: data.destination,
            reason: data.reason,
          });
        } catch (emailError: any) {
          console.error("Parent email send failed:", emailError);
          submissionToast = {
            title: "Leave request submitted",
            description: `Leave saved, but email failed: ${emailError.message || "Unknown error"}`,
          };
        }
      } else {
        submissionToast = {
          title: "Leave request submitted",
          description: "Your supervisor will review it. Parent email is not set on your profile.",
        };
      }

      toast(submissionToast);
      setLocation("/leave-history");
    } catch (err: any) {
      console.error("Leave submission error:", err);
      toast({ title: "Submission failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["STUDENT"]}>
      <DashboardLayout title="Apply for Leave" subtitle="Submit a leave request for supervisor approval.">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">



          <GlassCard>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                <FormField control={form.control} name="leave_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Leave Type
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-leave-type">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HOME">Home Leave</SelectItem>
                        <SelectItem value="MEDICAL">Medical</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="from_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> From Date
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="bg-background/50 border-white/10" data-testid="input-from-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="to_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> To Date
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="bg-background/50 border-white/10" data-testid="input-to-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="out_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Departure Time
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="time" className="bg-background/50 border-white/10" data-testid="input-out-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="return_time" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                        <Clock className="w-3.5 h-3.5 text-primary" /> Return Time
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="time" className="bg-background/50 border-white/10" data-testid="input-return-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Destination
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Home, City Hospital" className="bg-background/50 border-white/10" data-testid="input-destination" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="reason" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-foreground/80">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Reason
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the reason for your leave…" rows={4}
                        className="bg-background/50 border-white/10 resize-none" data-testid="input-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-leave">
                  {loading ? "Submitting…" : <><Send className="w-4 h-4 mr-2" />Submit Leave Request</>}
                </Button>
              </form>
            </Form>
          </GlassCard>
        </motion.div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
