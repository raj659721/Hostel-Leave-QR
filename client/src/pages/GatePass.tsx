import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Calendar, Clock, MapPin, User, Tag, LogOut, LogIn, Ban } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { getLeaveQrCodes } from "@/lib/api/leave";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { LeaveTimeline } from "@/components/LeaveTimeline";

interface LeaveRequest {
  id: string;
  from_date: string;
  to_date: string;
  out_time: string;
  return_time: string;
  destination: string;
  leave_type: string;
  supervisor_status: string;
  final_status: string;
  supervisor_remark?: string;
}

interface QrRow {
  id: string;
  type: "OUT" | "IN";
  qr_code: string;
  status: string;
  expires_at: string;
  used_at: string | null;
}

function QrBlock({
  qr, label, icon: Icon, accentClass, borderClass,
}: {
  qr: QrRow;
  label: string;
  icon: typeof LogOut;
  accentClass: string;
  borderClass: string;
}) {
  const used = qr.status === "used";
  const expired = qr.status === "expired" || new Date(qr.expires_at) < new Date();

  return (
    <div className={`rounded-xl border p-4 ${used || expired ? "opacity-50 border-white/10" : borderClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`font-display text-sm tracking-wider flex items-center gap-2 ${accentClass}`}>
          <Icon className="w-4 h-4" /> {label} QR
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          used    ? "bg-gray-500/20 text-gray-400" :
          expired ? "bg-red-500/20 text-red-400"  :
                    "bg-green-500/20 text-green-400"
        }`}>
          {used ? "USED" : expired ? "EXPIRED" : "ACTIVE"}
        </span>
      </div>
      {used || expired ? (
        <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
          <Ban className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-xs">This pass is no longer valid</p>
          {qr.used_at && <p className="text-xs mt-1 text-muted-foreground/60">Used {new Date(qr.used_at).toLocaleString()}</p>}
        </div>
      ) : (
        <div className="flex justify-center py-4 bg-white rounded-xl">
          <QRCodeSVG value={qr.qr_code} size={176} level="H" />
        </div>
      )}
      <p className="text-xs text-center text-muted-foreground mt-3">Single-use · show at gate only</p>
    </div>
  );
}

export default function GatePass() {
  const [, params] = useRoute<{ id: string }>("/gate-pass/:id");
  const { profile } = useAuth();
  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [qrs, setQrs] = useState<QrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("id", params.id)
        .single();

      if (fetchError) {
        setError("Leave request not found.");
      } else if (!["APPROVED", "CHECKED_OUT", "CHECKED_IN"].includes(data.supervisor_status)) {
        setError("Gate pass is only available for approved or active leaves.");
      } else {
        setLeave(data);
        try {
          const codes = await getLeaveQrCodes(params.id);
          setQrs(codes as QrRow[]);
        } catch {
          setError("QR codes not generated yet. Ask your supervisor to re-approve.");
        }
      }
      setLoading(false);
    };
    load();
  }, [params?.id]);

  if (loading) return <LoadingScreen />;

  const outQr = qrs.find((q) => q.type === "OUT" && q.status !== "used");
  const inQr  = qrs.find((q) => q.type === "IN" && q.status !== "used");

  return (
    <ProtectedRoute>
      <DashboardLayout title="Gate Pass" subtitle="Present these QR codes at the gate — each is single-use.">
        <div className="max-w-lg mx-auto space-y-5">
          {error ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-panel rounded-2xl p-10 text-center">
              <Shield className="w-12 h-12 mx-auto text-destructive mb-4 opacity-50" />
              <h2 className="font-display text-2xl mb-2">NOT AVAILABLE</h2>
              <p className="text-muted-foreground text-sm">{error}</p>
            </motion.div>
          ) : leave ? (
            <>
              {/* Leave details card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="glass-panel rounded-2xl border border-green-500/30 overflow-hidden">
                  <div className="px-5 py-4 border-b border-green-500/20 bg-green-500/10">
                    <h2 className="font-display text-lg text-green-400">LEAVE GATE PASS</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Two one-time QR codes — EXIT first, then RE-ENTRY</p>
                  </div>
                  <div className="p-5 space-y-2.5 text-sm">
                    {[
                      { icon: User,     label: profile?.full_name },
                      { icon: Tag,      label: leave.leave_type },
                      { icon: MapPin,   label: leave.destination },
                      { icon: Calendar, label: `${new Date(leave.from_date).toLocaleDateString()} — ${new Date(leave.to_date).toLocaleDateString()}` },
                      { icon: Clock,    label: `${leave.out_time} — ${leave.return_time}` },
                    ].map(({ icon: Icon, label }, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground/90">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* QR codes */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="grid gap-4">
                {outQr && <QrBlock qr={outQr} label="EXIT"     icon={LogOut} accentClass="text-rose-400"  borderClass="border-rose-500/30" />}
                {inQr  && <QrBlock qr={inQr}  label="RE-ENTRY" icon={LogIn}  accentClass="text-green-400" borderClass="border-green-500/30" />}
              </motion.div>

              {/* Timeline */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                <div className="glass-panel rounded-xl p-5">
                  <h3 className="text-sm font-semibold mb-4">Leave Timeline</h3>
                  <LeaveTimeline leaveId={leave.id} />
                </div>
              </motion.div>
            </>
          ) : null}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
