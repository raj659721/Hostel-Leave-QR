import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Users, CheckCircle, XCircle, BarChart3, Bell,
  Database, RefreshCw, TableProperties, KeyRound, Save,
  FileCheck2, FileX2, QrCode, Search, CalendarDays, Download
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { LeaveTimeline } from "@/components/LeaveTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { approveLeave, rejectLeave, getSupervisorLeaves, getSupervisorAnalytics, getDepartmentStudents } from "@/lib/api/leave";
import { AnnouncementsList } from "@/components/AnnouncementsList";
import { LeaveCalendar } from "@/components/LeaveCalendar";
import { ExpandableText } from "@/components/ui/expandable-text";

interface SupervisorLeave {
  id: string;
  student_id: string;
  student_name: string;
  department: string;
  leave_type: string;
  destination: string;
  reason: string;
  from_date: string;
  to_date: string;
  supervisor_status: string;
  parent_status?: string;
  final_status: string;
  priority: number;
  created_at: string;
}

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<SupervisorLeave[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [remarkMap, setRemarkMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingFilter, setPendingFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"LEAVES" | "STUDENTS" | "TRACKER">("LEAVES");
  const [students, setStudents] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesData, stats, studentsData] = await Promise.all([
        getSupervisorLeaves(),
        getSupervisorAnalytics(),
        getDepartmentStudents()
      ]);
      setLeaves(leavesData as SupervisorLeave[]);
      setStudents(studentsData);
      const mine = stats[0];
      if (mine) {
        setAnalytics({
          pending: mine.pending_count ?? 0,
          approved: mine.approved_count ?? 0,
          rejected: mine.rejected_count ?? 0,
          emergency: mine.emergency_count ?? 0,
        });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load data";
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveLeave(id, remarkMap[id]);
      toast({ title: "Row updated", description: "Leave approved and OUT/IN QR rows generated." });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectLeave(id, remarkMap[id]);
      toast({ title: "Row updated", description: "Leave rejected and status columns synced." });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" });
    }
    setProcessingId(null);
  };

  const pending = leaves.filter((l) => l.supervisor_status === "PENDING");
  const displayPending = pending.filter(l => {
    if (pendingFilter === "ALL") return true;
    const typeUpper = l.leave_type?.toUpperCase() || "";
    const filterUpper = pendingFilter.toUpperCase();

    if (filterUpper === "HOME LEAVE" && typeUpper.includes("HOME")) return true;
    if (typeUpper.includes(filterUpper)) return true;

    // For "Other", match anything that isn't Home, Medical, or Emergency
    if (filterUpper === "OTHER") {
      if (!typeUpper.includes("HOME") && !typeUpper.includes("MEDICAL") && !typeUpper.includes("EMERGENCY")) return true;
    }

    return typeUpper === filterUpper;
  });

  const pendingLeaveTypes = ["Home Leave", "Medical", "Emergency", "Other"];

  const filtered = leaves.filter((l) => {
    const s = search.toLowerCase();
    return l.destination.toLowerCase().includes(s) || l.student_name.toLowerCase().includes(s) || (l.department || "").toLowerCase().includes(s);
  });

  const stats = [
    { label: "Pending Rows", value: analytics.pending ?? pending.length, icon: Clock, accentClass: "text-yellow-400", gradientClass: "from-yellow-500/20 to-yellow-600/5" },
    { label: "Approved Rows", value: analytics.approved ?? leaves.filter((l) => l.supervisor_status === "APPROVED").length, icon: CheckCircle, accentClass: "text-green-400", gradientClass: "from-green-500/20 to-green-600/5" },
    { label: "Rejected Rows", value: analytics.rejected ?? 0, icon: XCircle, accentClass: "text-red-400", gradientClass: "from-red-500/20 to-red-600/5" },
    { label: "Priority Rows", value: analytics.emergency ?? 0, icon: BarChart3, accentClass: "text-orange-400", gradientClass: "from-orange-500/20 to-orange-600/5" },
  ];

  const handleExportCSV = () => {
    const rows = [
      ["Student Name", "Department", "Leave Type", "Destination", "Reason", "From", "To", "Status"],
      ...filtered.map(l => [
        `"${l.student_name}"`,
        `"${l.department || ""}"`,
        `"${l.leave_type || ""}"`,
        `"${l.destination}"`,
        `"${l.reason}"`,
        `"${new Date(l.from_date).toLocaleString()}"`,
        `"${new Date(l.to_date).toLocaleString()}"`,
        `"${l.final_status}"`
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `department_leaves_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Started", description: "Your CSV is downloading." });
  };

  return (
    <ProtectedRoute allowedRoles={["SUPERVISOR", "ADMIN"]}>
      <DashboardLayout title="Supervisor Dashboard" subtitle="Database-friendly approval queue for leave_applications and QR generation.">

        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "LEAVES" ? "default" : "secondary"}
            onClick={() => setActiveTab("LEAVES")}
            className="w-40 flex-shrink-0"
          >
            <Clock className="w-4 h-4 mr-2" />
            Leave Requests
          </Button>
          <Button
            variant={activeTab === "STUDENTS" ? "default" : "secondary"}
            onClick={() => setActiveTab("STUDENTS")}
            className="w-40 flex-shrink-0"
          >
            <Users className="w-4 h-4 mr-2" />
            Student Directory
          </Button>
          <Button
            variant={activeTab === "TRACKER" ? "default" : "secondary"}
            onClick={() => setActiveTab("TRACKER")}
            className="w-48 flex-shrink-0"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Calendar & Tracking
          </Button>
        </div>

        {activeTab === "LEAVES" ? (
          <>
            {/* Stats */}
            {loading ? (
              <LoadingSkeleton variant="stat" rows={4} className="mb-6" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 w-full">
                {stats.map((s, i) => <StatCard key={s.label} {...s} index={i} loading={false} />)}
              </div>
            )}

            {/* Pending requests */}
            {pending.length > 0 && (
              <GlassCard className="mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <TableProperties className="w-4 h-4 text-yellow-400" />
                    Pending leave_applications rows
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 ml-2">{pending.length}</Badge>
                  </h2>
                  {pendingLeaveTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-medium text-muted-foreground self-center">Filter:</span>
                      <Select value={pendingFilter} onValueChange={setPendingFilter}>
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10 w-[140px]">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Types</SelectItem>
                          {pendingLeaveTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {displayPending.length === 0 ? (
                  <EmptyState icon={Search} title="No matches" description="No pending requests match the selected filter." />
                ) : (
                  <div className="space-y-4">
                    {displayPending.sort((a, b) => b.priority - a.priority).map((leave) => (
                      <motion.div key={leave.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                        data-testid={`leave-row-${leave.id}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{leave.student_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary inline-flex items-center gap-1"><KeyRound className="w-3 h-3" />{leave.department}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 inline-flex items-center gap-1"><Database className="w-3 h-3" />{leave.leave_type}</span>
                          {leave.priority >= 10 && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">Emergency</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{leave.destination}</span> · {new Date(leave.from_date).toLocaleDateString()} — {new Date(leave.to_date).toLocaleDateString()}
                        </p>
                        <div className="text-xs text-muted-foreground/80">
                          <ExpandableText text={leave.reason} lineClampClass="line-clamp-2" threshold={50} />
                        </div>
                        <Input
                          placeholder="remark column value (optional)"
                          value={remarkMap[leave.id] || ""}
                          onChange={(e) => setRemarkMap((p) => ({ ...p, [leave.id]: e.target.value }))}
                          className="h-8 text-xs bg-background/50 border-white/10"
                        />
                        <div className="flex flex-col sm:flex-row gap-2 mt-3">
                          <Button size="sm" className="bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 flex-1"
                            onClick={() => handleApprove(leave.id)} disabled={processingId === leave.id}
                            data-testid={`button-approve-${leave.id}`}>
                            <FileCheck2 className="w-3.5 h-3.5 mr-1" /> Approve <span className="hidden sm:inline">&nbsp;+ QR</span>
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
                            onClick={() => handleReject(leave.id)} disabled={processingId === leave.id}
                            data-testid={`button-reject-${leave.id}`}>
                            <FileX2 className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {/* All department requests */}
            <GlassCard>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Department leave_applications View
                </h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search rows…"
                      className="w-full sm:w-64 pl-9 bg-background/50 border-white/10 text-sm" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="border-white/10 gap-1.5 hidden sm:flex">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="border-white/10 gap-1.5 flex-1 sm:flex-initial">
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Sync
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <LoadingSkeleton rows={5} />
              ) : filtered.length === 0 ? (
                <EmptyState icon={Users} title="No requests found" description="Department leave requests will appear here." />
              ) : (
                <div className="divide-y divide-white/5">
                  {filtered.map((leave) => (
                    <div key={leave.id} className="py-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-sm">{leave.student_name}</span>
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-white/5 inline-flex items-center gap-1"><KeyRound className="w-3 h-3" />{leave.department}</span>
                          <span className="text-xs text-muted-foreground">{leave.destination}</span>
                        </div>
                        <StatusBadge status={leave.final_status} />
                      </div>
                      <button
                        type="button"
                        className="text-xs text-primary mt-1.5 flex items-center gap-1 hover:text-primary/80 transition-colors"
                        onClick={() => setExpandedId(expandedId === leave.id ? null : leave.id)}
                      >
                        <Bell className="w-3 h-3" />
                        {expandedId === leave.id ? "Hide" : "Show"} timeline_events
                      </button>
                      {expandedId === leave.id && <LeaveTimeline leaveId={leave.id} />}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Announcements */}
            <div className="mt-5">
              <AnnouncementsList />
            </div>
          </>
        ) : activeTab === "STUDENTS" ? (
          <GlassCard className="mb-5 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Student Directory</h2>
            {loading ? (
              <LoadingSkeleton rows={5} />
            ) : students.length === 0 ? (
              <EmptyState icon={Users} title="No students found" description="No students found in your department." />
            ) : (
              <div className="w-full text-sm">
                <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-3 text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                  <div>Student Name</div>
                  <div>Roll No</div>
                  <div>Room</div>
                  <div>Parent Info</div>
                  <div>Status</div>
                </div>
                <div className="divide-y divide-white/5">
                  {students.map((student) => (
                    <div key={student.id} className="flex flex-col md:grid md:grid-cols-5 gap-3 md:gap-4 px-4 py-4 md:py-3 hover:bg-white/5 transition-colors">
                      <div className="font-medium text-foreground flex items-center justify-between md:block">
                        <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wider">Student:</span>
                        {student.full_name}
                      </div>
                      <div className="flex items-center justify-between md:block">
                        <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wider">Roll No:</span>
                        {student.roll_number || "-"}
                      </div>
                      <div className="flex items-center justify-between md:block">
                        <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wider">Room:</span>
                        {student.room_number || "-"}
                      </div>
                      <div className="flex items-start justify-between md:block">
                        <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wider">Parent:</span>
                        <div className="text-right md:text-left">
                          <div className="text-foreground font-medium">{student.parent_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{student.parent_phone || "-"}</div>
                          <div className="text-xs text-muted-foreground md:max-w-none">
                            <ExpandableText text={student.parent_email || "-"} threshold={25} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:block">
                        <span className="md:hidden text-xs text-muted-foreground uppercase tracking-wider">Status:</span>
                        <StatusBadge status={student.status || "APPROVED"} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        ) : activeTab === "TRACKER" ? (
          <div className="flex flex-col gap-5">
            <LeaveCalendar leaves={leaves} />

            <GlassCard className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-400">
                <Clock className="w-5 h-5" /> Currently Out (Live Tracker)
              </h2>
              {(() => {
                const checkedOut = leaves.filter(l => l.final_status === "CHECKED_OUT");
                if (checkedOut.length === 0) {
                  return <EmptyState icon={CheckCircle} title="All Students Present" description="No students in your department are currently checked out." />
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {checkedOut.map(l => (
                      <div key={l.id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{l.student_name}</div>
                            <div className="text-xs text-muted-foreground">{l.leave_type}</div>
                          </div>
                          <Badge variant="outline" className="text-orange-400 border-orange-400/20 bg-orange-400/10">OUT</Badge>
                        </div>
                        <div className="text-sm mt-2"><span className="text-muted-foreground">Expected Return:</span><br />{new Date(l.to_date).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </GlassCard>
          </div>
        ) : null}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
