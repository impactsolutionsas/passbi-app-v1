import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_API_URL;
const key = process.env.EXPO_PUBLIC_API_KEY;
export const supabaseClient = createClient(url, key);
