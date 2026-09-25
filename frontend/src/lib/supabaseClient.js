import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const KYC_DOCS_BUCKET =
  import.meta.env.VITE_KYC_DOCS_BUCKET || "kyc_bucket_dacuments";
export const KYC_SELFIE_BUCKET =
  import.meta.env.VITE_KYC_SELFIE_BUCKET || "kyc_selfies";