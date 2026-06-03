import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Shield, CheckCircle, Users, QrCode, LogIn, FileText, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/AnimatedBackground";

const features = [
  {
    icon: FileText,
    title: "Apply Leave",
    description: "Students submit leave requests with destination, dates, and reason in seconds.",
    color: "from-blue-500/20 to-blue-600/10",
    accent: "text-blue-400",
    border: "border-blue-500/20",
  },
  {
    icon: Users,
    title: "Parent Approval",
    description: "Parents receive OTP and approve their ward's leave request remotely.",
    color: "from-purple-500/20 to-purple-600/10",
    accent: "text-purple-400",
    border: "border-purple-500/20",
  },
  {
    icon: UserCheck,
    title: "Supervisor Approval",
    description: "Department supervisors approve leaves for their students only.",
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    icon: QrCode,
    title: "QR Gate Pass",
    description: "Two one-time QR codes (OUT & IN) generated when supervisor approves.",
    color: "from-amber-500/20 to-amber-600/10",
    accent: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    icon: CheckCircle,
    title: "Security Entry Logs",
    description: "Security scans QR at the gate and logs entry/exit times automatically.",
    color: "from-rose-500/20 to-rose-600/10",
    accent: "text-rose-400",
    border: "border-rose-500/20",
  },
];

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/5 backdrop-blur-md bg-background/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display text-lg tracking-wider">HOSTEL LEAVE</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" data-testid="nav-link-login">Login</Button>
          </Link>
          <Link href="/register">
            <Button size="sm" data-testid="nav-link-register">
              Get Started <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-primary/20 text-primary text-sm mb-8"
          >
            <Shield className="w-3.5 h-3.5" />
            Smart Hostel Management System
          </motion.div>

          <h1 className="font-display text-6xl sm:text-8xl md:text-[10rem] leading-none tracking-tight mb-6">
            <motion.span
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="block text-foreground/10 select-none"
              aria-hidden="true"
            >
              HOSTEL
            </motion.span>
            <motion.span
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
            >
              LEAVE
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-12"
          >
            A premium leave management platform for student hostels. Streamlined approvals, QR gate passes, and real-time tracking — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base px-8" data-testid="button-get-started">
                Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 border-white/10 hover:bg-white/5" data-testid="button-sign-in">
                <LogIn className="w-4 h-4 mr-2" /> Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1"
          >
            <div className="w-1.5 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature Carousel */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              HOW IT WORKS
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Five seamless steps from leave request to verified return.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Feature list */}
            <div className="space-y-3">
              {features.map((feature, i) => (
                <motion.button
                  key={feature.title}
                  onClick={() => setActiveFeature(i)}
                  whileHover={{ x: 4 }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                    activeFeature === i
                      ? `glass-panel ${feature.border} bg-gradient-to-r ${feature.color}`
                      : "border-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                  data-testid={`feature-${feature.title.toLowerCase().replace(" ", "-")}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${feature.color} border ${feature.border}`}>
                      <feature.icon className={`w-5 h-5 ${feature.accent}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">{i + 1}. {feature.title}</div>
                      {activeFeature === i && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-muted-foreground text-xs mt-1"
                        >
                          {feature.description}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Active feature display */}
            <div className="relative h-80 lg:h-96">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.05, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className={`absolute inset-0 glass-panel rounded-2xl border ${features[activeFeature].border} bg-gradient-to-br ${features[activeFeature].color} flex flex-col items-center justify-center p-8 text-center`}
                >
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${features[activeFeature].color} border ${features[activeFeature].border} flex items-center justify-center mb-6`}>
                    {(() => {
                      const Icon = features[activeFeature].icon;
                      return <Icon className={`w-10 h-10 ${features[activeFeature].accent}`} />;
                    })()}
                  </div>
                  <h3 className="font-display text-3xl text-foreground mb-3">
                    {features[activeFeature].title.toUpperCase()}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    {features[activeFeature].description}
                  </p>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {features.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveFeature(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeFeature ? `w-6 ${features[activeFeature].accent.replace("text-", "bg-")}` : "bg-white/20"}`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center glass-panel rounded-3xl p-12 border border-primary/20"
        >
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">
            READY TO GET STARTED?
          </h2>
          <p className="text-muted-foreground mb-8">
            Students, supervisors, and security — hostel leave with QR gate passes and parent alerts.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-10" data-testid="button-cta-register">
              Create Your Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 md:px-12 border-t border-white/5 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-display tracking-wider">HOSTEL LEAVE</span>
        </div>
        <p className="mt-2 text-xs">Secure. Smart. Streamlined.</p>
      </footer>
    </div>
  );
}
