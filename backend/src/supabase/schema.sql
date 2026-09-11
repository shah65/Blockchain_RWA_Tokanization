-- ============================================================================
-- Supabase schema — OFF-CHAIN data only.
-- Everything money/ownership-critical lives on-chain (see anchor-program/).
-- These tables hold KYC info, media, and descriptive text that is either
-- too big or too private to put on a public blockchain.
-- ============================================================================

-- Extension for UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: KYC / user metadata. Row is keyed by wallet address, which is
-- the same string you'll see as `UserProfile.wallet` on-chain — this is
-- your join key between Supabase and Solana.
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,          -- e.g. "3fT9...xyz"
  role text not null check (role in ('business_owner', 'investor')),
  full_name text,
  email text,
  phone_number text,
  address text,
  avatar_url text,                              -- Supabase Storage URL
  kyc_document_url text,                        -- Supabase Storage URL (ID doc)
  kyc_status text default 'pending' check (kyc_status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- businesses: descriptive info for each on-chain Business PDA.
-- `onchain_pubkey` = the Business PDA address from Solana — foreign key
-- into the blockchain, not a Postgres FK.
-- ----------------------------------------------------------------------------
create table businesses (
  id uuid primary key default gen_random_uuid(),
  onchain_pubkey text unique not null,           -- Business PDA address
  owner_wallet text not null references profiles(wallet_address),
  name text not null,
  description text,
  category text,                                 -- e.g. "restaurant", "retail"
  location text,
  cover_image_url text,
  gallery_image_urls text[],                     -- array of Storage URLs
  -- price_per_token / total_tokens are mirrored here for fast reads/search,
  -- but the ON-CHAIN values are always the source of truth for actual money math.
  total_tokens bigint,
  price_per_token bigint,
  status text default 'active' check (status in ('active','paused','closed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- investments_cache: OPTIONAL denormalized cache of on-chain Investment PDAs,
-- so your "browse businesses" / "my portfolio" pages load fast without
-- hitting the RPC for every row. Populate this from a backend indexer job
-- that listens to program logs (or polls periodically) — never treat this
-- table as authoritative; always let the smart contract be the final source
-- of truth for actual balances.
-- ----------------------------------------------------------------------------
create table investments_cache (
  id uuid primary key default gen_random_uuid(),
  onchain_pubkey text unique not null,           -- Investment PDA address
  business_pubkey text not null references businesses(onchain_pubkey),
  investor_wallet text not null references profiles(wallet_address),
  tokens_owned bigint not null default 0,
  total_invested bigint not null default 0,
  last_synced_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- profit_history_cache: monthly profit-per-investor, denormalized from
-- ProfitDeposit + Investment PDAs, for the "how much did I earn in Jan/Feb"
-- dashboard chart. Populated by the same indexer job.
-- ----------------------------------------------------------------------------
create table profit_history_cache (
  id uuid primary key default gen_random_uuid(),
  business_pubkey text not null references businesses(onchain_pubkey),
  investor_wallet text not null references profiles(wallet_address),
  year int not null,
  month int not null check (month between 1 and 12),
  amount_claimed bigint not null default 0,
  claimed_at timestamptz,
  unique (business_pubkey, investor_wallet, year, month)
);

-- ----------------------------------------------------------------------------
-- Row Level Security: frontend uses the Supabase ANON key + these policies.
-- The SERVICE ROLE key (full bypass access) only ever lives in your backend
-- .env file — see backend/config/supabase.js. NEVER ship the service key
-- to any frontend bundle or mobile app.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table businesses enable row level security;
alter table investments_cache enable row level security;
alter table profit_history_cache enable row level security;

-- Anyone can read business listings (public marketplace browsing)
create policy "businesses are publicly readable"
  on businesses for select using (true);

-- A wallet can only read/update its own profile row.
-- `wallet_address` is matched against a custom JWT claim your backend signs
-- after verifying the wallet's signature (see backend/middleware/auth.js).
create policy "users read own profile"
  on profiles for select using (wallet_address = auth.jwt() ->> 'wallet_address');

create policy "users update own profile"
  on profiles for update using (wallet_address = auth.jwt() ->> 'wallet_address');

-- Investors can read only their own cached investment/profit rows.
create policy "investors read own investments"
  on investments_cache for select using (investor_wallet = auth.jwt() ->> 'wallet_address');

create policy "investors read own profit history"
  on profit_history_cache for select using (investor_wallet = auth.jwt() ->> 'wallet_address');

-- NOTE: all INSERT/UPDATE/DELETE from the app should go through your
-- backend (using the service role key), which independently verifies the
-- wallet signature before writing — do not let the frontend write directly
-- with the anon key for anything beyond its own profile.
