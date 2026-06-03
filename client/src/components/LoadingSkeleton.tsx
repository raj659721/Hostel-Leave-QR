import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  variant?: "row" | "card" | "stat";
}

export function LoadingSkeleton({ rows = 4, className, variant = "row" }: LoadingSkeletonProps) {
  if (variant === "stat") {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-5 space-y-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-7 w-16 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-5 space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
                <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }} />
      ))}
    </div>
  );
}
