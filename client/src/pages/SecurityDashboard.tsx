import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Scan, Clock, CheckCircle, AlertCircle, Camera, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { scanQr, getGateLogs, getSecurityRoster } from "@/lib/api/leave";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { QrCameraScanner } from "@/components/QrCameraScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnnouncementsList } from "@/components/AnnouncementsList";
import { Badge } from "@/components/ui/badge";

interface ScanLogRow {
  id: string;
  scan_type: string;
  scanned_at: string;
  leave_request_id: string;
  student_name?: string;
}

export default function SecurityDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [location, setLocation] = useState("Main Gate");
  const [logs, setLogs] = useState<ScanLogRow[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [lastResult, setLastResult] = useState<{ scan_type: string; leave_request_id: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"SCANNER" | "ROSTER">("SCANNER");
  const [roster, setRoster] = useState<any[]>([]);

  const fetchLogs = async () => {
    const raw = await getGateLogs(30);
    const leaveIds = [...new Set(raw.map((l: { leave_request_id: string }) => l.leave_request_id))];
    const { data: leaves } = await supabase
      .from("leave_requests")
      .select("id, student_id")
      .in("id", leaveIds.length ? leaveIds : ["00000000-0000-0000-0000-000000000000"]);

    const studentIds = [...new Set((leaves || []).map((l) => l.student_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    const nameByStudent: Record<string, string> = {};
    (profiles || []).forEach((p) => { nameByStudent[p.id] = p.full_name; });
    const studentByLeave: Record<string, string> = {};
    (leaves || []).forEach((l) => { studentByLeave[l.id] = l.student_id; });

    setLogs(raw.map((log: { id: string; scan_type: string; scanned_at: string; leave_request_id: string }) => ({
      ...log,
      student_name: nameByStudent[studentByLeave[log.leave_request_id]] || "Unknown",
    })));

    try {
      const rosterData = await getSecurityRoster();
      setRoster(rosterData || []);
    } catch (err) {
      console.error("Failed to fetch security roster", err);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleScan = async (code?: string) => {
    const raw = (code ?? scanInput).trim();
    if (!raw || !profile) return;
    setScanning(true);
    setLastResult(null);

    try {
      const result = await scanQr(raw, location, `device-${profile.id.slice(0, 8)}`);
      setLastResult({ scan_type: result.scan_type, leave_request_id: result.leave_request_id ?? result.leave_id ?? "" });
      toast({
        title: `${result.scan_type} scan successful`,
        description: result.scan_type === "OUT"
          ? "Student marked OUT. IN QR required for return."
          : "Student marked IN. Leave completed.",
      });
      setScanInput("");
      fetchLogs();
    } catch (e: unknown) {
      toast({ title: "Scan failed", description: e instanceof Error ? e.message : "Invalid or already-used QR", variant: "destructive" });
    }
    setScanning(false);
  };

  const todayOut = logs.filter((l) => l.scan_type === "OUT" && new Date(l.scanned_at).toDateString() === new Date().toDateString()).length;
  const todayIn  = logs.filter((l) => l.scan_type === "IN"  && new Date(l.scanned_at).toDateString() === new Date().toDateString()).length;

  return (
    <ProtectedRoute allowedRoles={["SECURITY", "ADMIN"]}>
      <DashboardLayout title="Gate Security" subtitle="Scan OUT or IN QR codes. Each code is single-use. OUT must happen before IN.">

        <div className="flex space-x-2 mb-6">
          <Button 
            variant={activeTab === "SCANNER" ? "default" : "secondary"} 
            onClick={() => setActiveTab("SCANNER")}
            className="w-40"
          >
            <Scan className="w-4 h-4 mr-2" />
            Scanner & Logs
          </Button>
          <Button 
            variant={activeTab === "ROSTER" ? "default" : "secondary"} 
            onClick={() => setActiveTab("ROSTER")}
            className="w-40"
          >
            <Clock className="w-4 h-4 mr-2" />
            Live Roster
          </Button>
        </div>

        {activeTab === "SCANNER" ? (
          <>
            {/* Today stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="bg-gradient-to-br from-rose-500/20 to-rose-600/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-rose-400">{todayOut}</div>
                  <div className="text-xs text-muted-foreground">OUT today</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <GlassCard className="bg-gradient-to-br from-green-500/20 to-green-600/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{todayIn}</div>
                  <div className="text-xs text-muted-foreground">IN today</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Scanner */}
          <GlassCard>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" /> QR Scanner
            </h2>
            <div className="space-y-3">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Gate location"
                className="bg-background/50 border-white/10 text-sm"
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  placeholder="Paste or type QR code…"
                  className="bg-background/50 border-white/10 font-mono text-sm w-full"
                  autoFocus
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={() => handleScan()} disabled={scanning || !scanInput.trim()} className="flex-1 sm:flex-none">
                    {scanning ? "…" : "Scan"}
                  </Button>
                  <Button variant="outline" size="icon" className="border-white/10 shrink-0"
                    onClick={() => setShowCamera(true)} data-testid="button-camera">
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-white/10 gap-2 text-sm"
                onClick={() => setShowCamera(true)}
                data-testid="button-scan-camera"
              >
                <Camera className="w-4 h-4" /> Use Camera to Scan
              </Button>

              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-xl border p-4 flex items-center gap-3 ${
                    lastResult.scan_type === "OUT"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border-green-500/30 bg-green-500/10 text-green-400"
                  }`}
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-semibold">{lastResult.scan_type} scan recorded</div>
                    <div className="text-xs opacity-70 mt-0.5">Leave ID: {lastResult.leave_request_id.slice(0, 8)}…</div>
                  </div>
                </motion.div>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Expired or already-used QR codes are rejected automatically.
              </p>
            </div>
          </GlassCard>

          {/* Audit log */}
          <GlassCard className="p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 font-semibold flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 text-primary" /> Scan Audit Log
            </div>
            <div className="flex-1 divide-y divide-white/5 overflow-y-auto max-h-[380px]">
              {logs.length === 0 ? (
                <EmptyState icon={Scan} title="No scans yet" description="Scanned QR codes will appear here." />
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-center justify-between text-sm hover:bg-white/3 transition-colors">
                    <div>
                      <div className="font-medium text-foreground">{log.student_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(log.scanned_at).toLocaleString()}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      log.scan_type === "OUT"
                        ? "text-rose-400 bg-rose-500/15"
                        : "text-green-400 bg-green-500/15"
                    }`}>
                      {log.scan_type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <div className="flex flex-col">
            <AnnouncementsList />
          </div>
        </div>
        </>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Overstay Alerts */}
            {(() => {
              const now = new Date();
              const overstay = roster.filter(r => r.final_status === "CHECKED_OUT" && new Date(r.to_date) < now);
              if (overstay.length > 0) {
                return (
                  <GlassCard className="border-rose-500/50 bg-rose-500/10">
                    <h2 className="text-rose-400 font-bold mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> OVERSTAY ALERTS ({overstay.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {overstay.map(r => (
                        <div key={r.id} className="p-3 rounded-md bg-white/5 border border-rose-500/30">
                          <div className="font-semibold">{r.student_name} <span className="text-xs text-muted-foreground ml-1">({r.room_number || "No Room"})</span></div>
                          <div className="text-xs text-rose-300 mt-1">Expected: {new Date(r.to_date).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground mt-1">Ph: {r.parent_phone || "N/A"}</div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expected to Leave */}
              <GlassCard>
                <h3 className="font-semibold mb-4 text-orange-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Expected to Leave Today
                </h3>
                {(() => {
                  const today = new Date().toDateString();
                  const expectedOut = roster.filter(r => r.final_status === "APPROVED" && new Date(r.from_date).toDateString() === today);
                  if (expectedOut.length === 0) return <EmptyState icon={CheckCircle} title="Clear" description="No students scheduled to leave today." />;
                  
                  return (
                    <div className="space-y-2">
                      {expectedOut.map(r => (
                        <div key={r.id} className="p-3 rounded-md bg-white/5 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{r.student_name}</div>
                            <div className="text-xs text-muted-foreground">{new Date(r.from_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {r.destination}</div>
                          </div>
                          <Badge variant="outline" className="text-orange-400 border-orange-400/20 bg-orange-400/10 shrink-0">PENDING OUT</Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </GlassCard>

              {/* Expected to Return */}
              <GlassCard>
                <h3 className="font-semibold mb-4 text-green-400 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Expected to Return Today
                </h3>
                {(() => {
                  const today = new Date().toDateString();
                  const expectedIn = roster.filter(r => r.final_status === "CHECKED_OUT" && new Date(r.to_date).toDateString() === today);
                  if (expectedIn.length === 0) return <EmptyState icon={CheckCircle} title="Clear" description="No students scheduled to return today." />;
                  
                  return (
                    <div className="space-y-2">
                      {expectedIn.map(r => (
                        <div key={r.id} className="p-3 rounded-md bg-white/5 flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{r.student_name}</div>
                            <div className="text-xs text-muted-foreground">{new Date(r.to_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • From {r.destination}</div>
                          </div>
                          <Badge variant="outline" className="text-green-400 border-green-400/20 bg-green-400/10 shrink-0">PENDING IN</Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </GlassCard>
            </div>
          </div>
        )}
      </DashboardLayout>

      {showCamera && (
        <QrCameraScanner
          onScan={(t) => { setShowCamera(false); setScanInput(t); handleScan(t); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </ProtectedRoute>
  );
}
