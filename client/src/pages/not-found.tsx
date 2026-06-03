import { Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="font-display text-[10rem] leading-none text-foreground/5 select-none mb-4">
          404
        </div>
        <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 -mt-16">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-foreground mb-2">PAGE NOT FOUND</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link href="/">
          <Button data-testid="button-go-home">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
