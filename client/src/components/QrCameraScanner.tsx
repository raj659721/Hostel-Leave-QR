import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, CameraOff } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Props {
  onScan: (token: string) => void;
  onClose: () => void;
}

export function QrCameraScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-camera-container";
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let html5Qr: Html5Qrcode | null = null;

    const start = async () => {
      try {
        html5Qr = new Html5Qrcode(containerId);
        scannerRef.current = html5Qr;

        await html5Qr.start(
          { facingMode: "environment" }, // rear camera
          {
            fps: 30,
            // Scanning full frame without a strict qrbox makes recognition much faster
          },
          (decodedText) => {
            // Strip prefix if present
            const token = decodedText.startsWith("HOSTEL-LEAVE:")
              ? decodedText.slice("HOSTEL-LEAVE:".length).trim()
              : decodedText.trim();
            onScan(token);
          },
          undefined // ignore per-frame failures
        );
        setStarted(true);
      } catch (err: any) {
        if (err?.name === "NotAllowedError" || err?.toString()?.includes("NotAllowedError")) {
          setError("Camera permission denied. Please allow camera access in your browser settings.");
        } else if (err?.toString()?.includes("NotFoundError")) {
          setError("No camera found on this device.");
        } else {
          setError("Could not start camera: " + (err?.message || String(err)));
        }
      }
    };

    start();

    return () => {
      if (html5Qr) {
        html5Qr.isScanning
          ? html5Qr.stop().catch(() => {}).finally(() => html5Qr!.clear())
          : html5Qr.clear();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Camera className="w-4 h-4 text-primary" />
            Scan QR Code
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:text-destructive" data-testid="button-close-scanner">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Camera view */}
        <div className="relative bg-black">
          {error ? (
            <div className="flex flex-col items-center justify-center h-72 gap-4 px-6 text-center">
              <CameraOff className="w-12 h-12 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="border-white/10" onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
              {/* The html5-qrcode library renders into this div */}
              <div id={containerId} className="w-full" />

              {/* Overlay corners */}
              {started && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-[220px] h-[220px]">
                    {/* TL */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                    {/* TR */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                    {/* BL */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                    {/* BR */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                    {/* Scan line animation */}
                    <motion.div
                      animate={{ top: ["10%", "85%", "10%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-2 right-2 h-0.5 bg-primary/70 rounded-full shadow-[0_0_8px_2px_rgba(99,102,241,0.5)]"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        {!error && (
          <div className="px-5 py-3 text-center text-xs text-muted-foreground border-t border-white/10">
            Point your camera at the student's QR code
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
