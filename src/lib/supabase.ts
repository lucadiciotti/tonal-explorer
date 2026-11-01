import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://rvbxqwjyfxtnqhfsudqt.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Ynhxd2p5Znh0bnFoZnN1ZHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MDQ5OTgsImV4cCI6MjA3ODI4MDk5OH0.YPMxCkFGLTGJYIpk1eb_C4gGh3_6Pzq1TBi3qMOXR3o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
