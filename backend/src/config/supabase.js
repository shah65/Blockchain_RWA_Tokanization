const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

// Backend-only client — full access, used inside controllers/models after
// the backend itself has verified the caller (wallet signature check).
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false, // server-side: no session storage needed
      autoRefreshToken: false, // service key never expires — no refresh needed
    }
  }
);

module.exports = { supabaseAdmin };
