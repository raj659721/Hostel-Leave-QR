import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  currentUrl?: string;
  userId: string;
  name: string;
  onUploadSuccess?: (newUrl: string) => void;
  className?: string;
}

export function ProfilePictureUpload({ currentUrl, userId, name, onUploadSuccess, className = "" }: Props) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({ title: "Avatar updated!", description: "Your profile picture has been changed successfully." });
      
      if (onUploadSuccess) {
        onUploadSuccess(publicUrl);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err.message || "An error occurred during upload.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <div 
        className="relative w-16 h-16 rounded-full overflow-hidden bg-[#2BB673] flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20 shadow-lg cursor-pointer"
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          name?.[0]?.toUpperCase() || "?"
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}
