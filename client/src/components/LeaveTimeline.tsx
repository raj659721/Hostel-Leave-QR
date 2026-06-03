import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { getLeaveTimeline } from "@/lib/api/leave";

interface TimelineEvent {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
}

export function LeaveTimeline({ leaveId }: { leaveId: string }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaveTimeline(leaveId)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [leaveId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground py-2">Loading timeline…</p>;
  }

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No timeline events yet.</p>;
  }

  return (
    <div className="space-y-3" data-testid="leave-timeline">
      {events.map((ev) => (
        <div key={ev.id} className="flex gap-3 text-sm">
          <div className="mt-0.5 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="text-foreground font-medium capitalize">{ev.event_type.replace(/_/g, " ")}</div>
            <div className="text-muted-foreground text-xs">{ev.message}</div>
            <div className="text-muted-foreground/60 text-xs mt-0.5">
              {new Date(ev.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
