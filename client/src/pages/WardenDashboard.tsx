import { useEffect } from "react";
import { useLocation } from "wouter";

export default function WardenDashboard() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/supervisor");
  }, [setLocation]);
  return null;
}
