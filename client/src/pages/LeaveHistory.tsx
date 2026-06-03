import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { History, Search, Filter, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaveRequest {
  id: string;
  from_date: string;
  to_date: string;
  out_time: string;
  return_time: string;
  destination: string;
  reason: string;
  leave_type: string;
  parent_status: string;
  supervisor_status: string;
  final_status: string;
  supervisor_remark?: string;
  created_at: string;
}

export default function LeaveHistory() {
  const { profile } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!profile) return;
    const fetchLeaves = async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("student_id", profile.id)
        .order("created_at", { ascending: false });
      setLeaves(data || []);
      setLoading(false);
    };
    fetchLeaves();
  }, [profile]);

  const filtered = leaves.filter((l) => {
    const matchSearch = l.destination.toLowerCase().includes(search.toLowerCase()) ||
      l.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.final_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <ProtectedRoute allowedRoles={["STUDENT"]}>
      <DashboardLayout title="Leave History" subtitle="Track all your leave requests and their statuses.">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destination or reason…"
              className="pl-10 bg-background/50 border-white/10"
              data-testid="input-search" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-background/50 border-white/10" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-6"><LoadingSkeleton rows={5} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title="No leave requests found"
              description={search || statusFilter !== "all" ? "Try adjusting your filters." : "Apply for your first leave to get started."}
            />
          ) : (
            <div className="divide-y divide-white/5">
              {/* Header row */}
              <div className="grid grid-cols-12 px-5 py-3 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider border-b border-white/5">
                <div className="col-span-7 md:col-span-4">Destination</div>
                <div className="col-span-1 hidden md:block">Type</div>
                <div className="col-span-4 hidden md:block">Dates</div>
                <div className="col-span-5 md:col-span-2">Status</div>
                <div className="col-span-1 hidden md:block text-right">Pass</div>
              </div>
              {filtered.map((leave, i) => (
                <motion.div key={leave.id}
                   initial={{ opacity: 0, x: -8 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.04 }}
                   className="grid grid-cols-12 px-5 py-4 items-center hover:bg-white/5 transition-colors"
                   data-testid={`leave-row-${leave.id}`}>

                  {/* Destination */}
                  <div className="col-span-7 md:col-span-4">
                    <div className="text-sm font-medium text-foreground">{leave.destination}</div>
                    <div className="text-xs text-muted-foreground md:hidden">
                      {new Date(leave.from_date).toLocaleDateString()}
                    </div>
                    {leave.supervisor_remark && (
                      <div className="text-xs text-muted-foreground/60 italic mt-0.5 truncate max-w-[140px]"
                        title={leave.supervisor_remark}>
                        "{leave.supervisor_remark}"
                      </div>
                    )}
                  </div>

                  {/* Type */}
                  <div className="col-span-1 hidden md:block text-xs capitalize text-foreground/80">
                    {leave.leave_type?.toLowerCase()}
                  </div>

                  {/* Dates */}
                  <div className="col-span-4 hidden md:block">
                    <div className="text-xs text-foreground/80">
                      {new Date(leave.from_date).toLocaleDateString()} — {new Date(leave.to_date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{leave.out_time} — {leave.return_time}</div>
                  </div>

                  {/* Leave Status */}
                  <div className="col-span-5 md:col-span-2">
                    <StatusBadge status={leave.final_status} />
                  </div>

                  {/* Pass / QR */}
                  <div className="col-span-1 hidden md:flex justify-end">
                    {leave.supervisor_status === "APPROVED" && (
                      <Link href={`/gate-pass/${leave.id}`}>
                        <Button variant="ghost" size="icon"
                          className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
                          data-testid={`button-gate-pass-${leave.id}`}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
