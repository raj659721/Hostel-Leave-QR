import { useState, useMemo } from "react";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { GlassCard } from "@/components/GlassCard";
import { Users } from "lucide-react";

interface LeaveCalendarProps {
  leaves: any[];
}

export function LeaveCalendar({ leaves }: LeaveCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const activeLeaves = useMemo(() => {
    return leaves.filter(l => l.supervisor_status === "APPROVED" || l.supervisor_status === "PENDING");
  }, [leaves]);

  const leaveDates = useMemo(() => {
    const dates: Date[] = [];
    activeLeaves.forEach(leave => {
      if (!leave.from_date || !leave.to_date) return;
      const start = startOfDay(parseISO(leave.from_date));
      const end = endOfDay(parseISO(leave.to_date));
      let current = start;
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [activeLeaves]);

  const leavesOnSelectedDate = useMemo(() => {
    if (!date) return [];
    return activeLeaves.filter(leave => {
      if (!leave.from_date || !leave.to_date) return false;
      const start = startOfDay(parseISO(leave.from_date));
      const end = endOfDay(parseISO(leave.to_date));
      return isWithinInterval(date, { start, end });
    });
  }, [date, activeLeaves]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <GlassCard className="flex-shrink-0">
        <h3 className="font-semibold mb-4 text-foreground">Department Leave Calendar</h3>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          modifiers={{ hasLeave: leaveDates }}
          modifiersClassNames={{ hasLeave: "bg-primary/20 text-primary font-bold" }}
          className="rounded-md border border-white/10"
        />
      </GlassCard>
      
      <GlassCard className="flex-grow">
        <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {date ? `Leaves on ${format(date, "MMM d, yyyy")}` : "Select a date"}
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
            {leavesOnSelectedDate.length} student(s)
          </span>
        </h3>
        
        {leavesOnSelectedDate.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No students are scheduled to be on leave on this date.
          </div>
        ) : (
          <div className="space-y-3">
            {leavesOnSelectedDate.map(leave => (
              <div key={leave.id} className="p-3 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{leave.student_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    leave.supervisor_status === "APPROVED" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {leave.supervisor_status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {leave.leave_type} • {leave.destination}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {format(parseISO(leave.from_date), "MMM d, h:mm a")} - {format(parseISO(leave.to_date), "MMM d, h:mm a")}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
