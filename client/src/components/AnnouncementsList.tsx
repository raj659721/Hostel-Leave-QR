import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "./EmptyState";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select(`
        id,
        title,
        message,
        created_at,
        profiles ( full_name )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Fetch announcements error:", error.message);
    } else {
      setAnnouncements((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();

    const subscription = supabase
      .channel('announcements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;

    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Announcement deleted",
        description: "The announcement has been successfully removed.",
      });
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 overflow-hidden flex flex-col h-full">
        <div className="p-5 border-b border-gray-200 font-semibold flex items-center gap-2 shrink-0">
          <Megaphone className="w-4 h-4 text-[#243B53]" /> Announcements
        </div>
        <div className="p-5 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-200 font-semibold flex items-center gap-2 shrink-0">
        <Megaphone className="w-4 h-4 text-[#243B53]" /> Recent Announcements
      </div>
      <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-gray-100">
        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            description="There are no announcements at this time."
          />
        ) : (
          announcements.map((ann, i) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 hover:bg-gray-50 transition-colors relative group"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 mb-1">{ann.title}</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mb-3">
                    {ann.message}
                  </p>
                </div>
                {profile?.role === "ADMIN" && (
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>By {ann.profiles?.full_name || "Admin"}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ann.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

