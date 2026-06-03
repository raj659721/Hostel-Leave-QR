import { cn } from "@/lib/utils";

type FinalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
type SubStatus   = "PENDING" | "APPROVED" | "REJECTED";

const finalConfig: Record<FinalStatus, { label: string; className: string }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED:  { label: "Approved",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED:  { label: "Rejected",  className: "bg-red-50 text-red-700 border border-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border border-gray-200" },
  COMPLETED: { label: "Completed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};

const subConfig: Record<SubStatus, { label: string; className: string }> = {
  PENDING:  { label: "Pending",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
  APPROVED: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-700 border border-red-200" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  variant?: "final" | "sub";
}

export function StatusBadge({ status, className, variant = "final" }: StatusBadgeProps) {
  const map = variant === "sub" ? subConfig : finalConfig;
  const config = (map as any)[status] || finalConfig["PENDING"];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        config.className,
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {config.label}
    </span>
  );
}
