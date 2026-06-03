import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-2xl border-2 border-primary/30 border-t-primary flex items-center justify-center"
        >
          <Shield className="w-8 h-8 text-primary" />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground text-sm font-display tracking-widest"
        >
          HOSTEL LEAVE
        </motion.p>
      </motion.div>
    </div>
  );
}
