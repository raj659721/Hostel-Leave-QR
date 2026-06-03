import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accentClass?: string;
  gradientClass?: string;
  borderAccent?: string;
  loading?: boolean;
  index?: number;
  className?: string;
}

export function StatCard({
  label, value, icon: Icon,
  accentClass = "text-[#243B53]",
  borderAccent = "border-l-[#243B53]",
  loading = false, index = 0, className
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className={cn(
        "bg-white border border-gray-200 border-l-4 rounded-lg shadow-sm p-5",
        borderAccent,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
          <div className="text-3xl font-bold text-gray-800">
            {loading
              ? <span className="inline-block w-10 h-8 rounded bg-gray-100 animate-pulse" />
              : value}
          </div>
        </div>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0 ml-3")}>
          <Icon className={cn("w-5 h-5", accentClass)} />
        </div>
      </div>
    </motion.div>
  );
}
