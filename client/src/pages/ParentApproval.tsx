import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { CheckCircle, XCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function ParentApproval() {
  const [matched, params] = useRoute<{ requestId: string; action: string }>("/parent-approval/:requestId/:action");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  const action = useMemo(() => params?.action?.toLowerCase(), [params?.action]);
  const requestId = params?.requestId;

  useEffect(() => {
    if (!matched) return;

    const processApproval = async () => {
      if (!requestId || (action !== "approve" && action !== "reject")) {
        setStatus("error");
        setMessage("Invalid approval link.");
        return;
      }

      const update: Record<string, unknown> = {
        parent_status: action === "approve" ? "APPROVED" : "REJECTED",
      };

      if (action === "approve") {
        update.parent_approved_at = new Date().toISOString();
      } else {
        update.parent_rejected_at = new Date().toISOString();
        update.final_status = "REJECTED";
      }

      const { error, data } = await supabase
        .from("leaves")
        .update(update)
        .eq("id", requestId)
        .limit(1);

      if (error) {
        setStatus("error");
        setMessage(error.message || "Unable to update request status.");
        return;
      }

      setStatus("success");
      setMessage(
        action === "approve"
          ? "Leave request approved successfully. The supervisor will review the final request."
          : "Leave request rejected successfully. The request has been declined and the supervisor will be notified."
      );
    };

    processApproval();
  }, [matched, requestId, action]);

  if (!matched) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full rounded-3xl border border-slate-200 bg-white shadow-xl p-10 text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          {status === "loading" ? (
            <Shield className="w-10 h-10 text-slate-500" />
          ) : status === "success" ? (
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          ) : (
            <XCircle className="w-10 h-10 text-red-500" />
          )}
        </div>

        <h1 className="text-2xl font-semibold text-slate-900 mb-3">
          {status === "loading"
            ? "Processing approval..."
            : status === "success"
            ? action === "approve"
              ? "Leave request approved"
              : "Leave request rejected"
            : "Approval failed"}
        </h1>
        <p className="text-sm text-slate-600 mb-8">{message || "Please wait while we update the request."}</p>

        {status !== "loading" && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/">Go to home</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/leave-history">View leave history</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
