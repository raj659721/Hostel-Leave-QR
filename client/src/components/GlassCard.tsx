import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gradient?: boolean;
}

export function GlassCard({ children, className, gradient = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg shadow-sm p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
