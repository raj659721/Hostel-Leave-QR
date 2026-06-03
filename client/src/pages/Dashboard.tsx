import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  FileText, Clock, CheckCircle, XCircle, Plus, QrCode,
  Bell, ArrowRight, User, Building, TrendingUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { AnnouncementsList } from "@/components/AnnouncementsList";

interface LeaveRequest {
  id: string;
  from_date: string;
  to_date: string;
  destination: string;
  leave_type: string;
  final_status: string;
  supervisor_status: string;
  parent_status?: string;
  created_at: string;
}

interface StudentDetails {
  department: string;
  year: string;
  room_no: string;
  hostel_name: string;
  roll_no: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [leaves, setLeaves]   = useState<LeaveRequest[]>([]);
  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const isDevMode = 
        import.meta.env.VITE_DEV_MODE === "true" || 
        import.meta.env.VITE_DEV_MODE === true ||
        (window.location.hostname === "localhost" && localStorage.getItem("dev_mode_fallback") === "true");

      if (isDevMode) {
        setLeaves([]);
        const devProfiles = JSON.parse(localStorage.getItem("dev_profiles") || "{}");
        const devProfile = Object.values(devProfiles).find((p: any) => p.id === profile.id) as any;
        if (devProfile) {
          setStudent({
            department: devProfile.department || "CSE",
            year: String(devProfile.year || "1"),
            room_no: devProfile.room_number || "A-101",
            hostel_name: devProfile.hostel_name || "Block A",
            roll_no: devProfile.roll_number || "CS21001",
          });
        } else {
          setStudent({
            department: "CSE",
            year: "1",
            room_no: "A-101",
            hostel_name: "Block A",
            roll_no: "CS21001",
          });
        }
        setLoading(false);
        return;
      }

      const [leavesRes, studentRes] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("id, from_date, to_date, destination, leave_type, final_status, supervisor_status, created_at")
          .eq("student_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("students")
          .select("department, year, room_no, hostel_name, roll_no")
          .eq("id", profile.id)
          .single(),
      ]);
      setLeaves(leavesRes.data || []);
      if (studentRes.data) setStudent(studentRes.data);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const stats = [
    {
      label: "Total Requests", value: leaves.length,
      icon: FileText, border: "border-l-[#243B53]", iconColor: "text-[#243B53]",
    },
    {
      label: "Pending", value: leaves.filter((l) => l.final_status === "PENDING").length,
      icon: Clock, border: "border-l-amber-500", iconColor: "text-amber-600",
    },
    {
      label: "Approved", value: leaves.filter((l) => l.supervisor_status === "APPROVED").length,
      icon: CheckCircle, border: "border-l-[#2BB673]", iconColor: "text-[#2BB673]",
    },
    {
      label: "Parent Pending", value: leaves.filter((l) => l.parent_status === "PENDING").length,
      icon: Bell, border: "border-l-[#F59E0B]", iconColor: "text-[#F59E0B]",
    },
    {
      label: "Rejected", value: leaves.filter((l) => l.final_status === "REJECTED").length,
      icon: XCircle, border: "border-l-[#D64545]", iconColor: "text-[#D64545]",
    },
  ];

  const activeLeave = leaves.find(
    (l) => l.supervisor_status === "APPROVED" && l.final_status !== "COMPLETED"
  );
  const pendingParentLeave = leaves.find((l) => l.parent_status === "PENDING" && l.final_status === "PENDING");

  return (
    <ProtectedRoute>
      <DashboardLayout
        title={`Welcome, ${profile?.full_name?.split(" ")[0] || "Student"}`}
        subtitle="Manage your leave requests and track approval status."
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-lg shadow-sm p-5`}
              data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
                  <div className="text-3xl font-bold text-gray-800">
                    {loading
                      ? <span className="inline-block w-8 h-7 rounded bg-gray-100 animate-pulse" />
                      : s.value}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {pendingParentLeave && (
          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Parent approval is still pending for your leave request to <strong>{pendingParentLeave.destination}</strong>.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Quick Actions + Profile */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-gray-200 rounded-lg shadow-sm p-5"
            >
              <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#243B53]" />
                Quick Actions
              </h2>
              <div className="space-y-2.5">
                <Link href="/apply-leave">
                  <Button
                    className="w-full justify-between bg-[#243B53] hover:bg-[#1a2d40] text-white"
                    data-testid="button-apply-leave"
                  >
                    Apply for Leave <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/leave-history">
                  <Button
                    variant="outline"
                    className="w-full justify-between border-gray-200 text-gray-700 hover:bg-gray-50"
                    data-testid="button-leave-history"
                  >
                    View Leave History <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                {activeLeave && (
                  <Link href={`/gate-pass/${activeLeave.id}`}>
                    <Button
                      variant="outline"
                      className="w-full justify-between border-emerald-200 text-[#2BB673] hover:bg-emerald-50"
                      data-testid="button-gate-pass"
                    >
                      <QrCode className="w-4 h-4 mr-1" /> View Gate Pass <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>



            {/* Student Profile Card */}
            {student && (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white border border-gray-200 rounded-lg shadow-sm p-5"
              >
                <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#243B53]" />
                  Student Profile
                </h2>
                <div className="space-y-2">
                  {[
                    { label: "Roll Number",  value: student.roll_no },
                    { label: "Department",   value: student.department },
                    { label: "Year",         value: student.year },
                    { label: "Hostel Block", value: student.hostel_name },
                    { label: "Room",         value: student.room_no },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500 text-xs">{item.label}</span>
                      <span className="text-gray-800 font-medium text-xs">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AnnouncementsList />
            </motion.div>
          </div>

          {/* Right: Recent Leave Requests Table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#243B53]" />
                Recent Leave Requests
              </h2>
              <Link href="/leave-history">
                <button className="text-xs text-[#243B53] font-medium hover:underline flex items-center gap-0.5">
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Destination</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-3">Dates</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-100">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                    <div className="flex-1 h-3 bg-gray-100 rounded" />
                    <div className="w-20 h-3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : leaves.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No leave requests yet"
                description="Apply for your first leave to get started."
                action={{ label: "Apply for Leave", onClick: () => window.location.href = "/apply-leave" }}
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {leaves.map((leave, i) => (
                  <motion.div
                    key={leave.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex flex-col md:grid md:grid-cols-12 px-5 py-4 gap-3 md:gap-0 items-start md:items-center hover:bg-gray-50 transition-colors"
                    data-testid={`leave-card-${leave.id}`}
                  >
                    <div className="w-full md:col-span-4 flex justify-between items-start md:block">
                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 md:hidden">Destination</div>
                        <div className="text-sm font-semibold text-gray-800 break-words">{leave.destination}</div>
                      </div>
                      <div className="md:hidden shrink-0 ml-2">
                        <StatusBadge status={leave.final_status} />
                      </div>
                    </div>
                    <div className="w-full md:col-span-3 flex items-center justify-between md:block">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider md:hidden">Type</div>
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full text-right md:text-left">
                        {leave.leave_type}
                      </span>
                    </div>
                    <div className="w-full md:col-span-3 flex items-center justify-between md:block">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider md:hidden">Dates</div>
                      <div className="text-xs text-gray-500 text-right md:text-left">
                        {new Date(leave.from_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
                        {new Date(leave.to_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="hidden md:flex md:col-span-2 justify-end">
                      <StatusBadge status={leave.final_status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
