import { isSupabaseConfigured, supabase } from "@/src/lib/supabase";
import { authService } from "@/src/services/authService";
import { Profile } from "@/src/types/domain";

export const profileService = {
  async getMe() {
    return authService.getCurrentProfile();
  },

  async updateMe(patch: Pick<Partial<Profile>, "name" | "phone">) {
    const profile = await authService.getCurrentProfile();
    if (!profile) return null;
    if (!isSupabaseConfigured()) return { ...profile, ...patch };

    const { data, error } = await supabase
      .from("profiles")
      .update({ name: patch.name, phone: patch.phone })
      .eq("id", profile.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Profile;
  },
};
