-- Tool Usage Table
create table if not exists tool_usage (
  user_id uuid not null,
  tool_name text not null,
  count integer not null default 1,
  last_used timestamptz not null default now(),
  primary key (user_id, tool_name)
);

-- Tool Config Table
create table if not exists tool_config (
  tool_name text primary key,
  timeout_ms integer,
  max_calls_per_session integer,
  rate_limits jsonb, -- e.g. {"perMinute": 5, "perHour": 20}
  enabled boolean default true,
  updated_at timestamptz not null default now()
);

-- Indexes for analytics
create index if not exists idx_tool_usage_tool on tool_usage(tool_name);
create index if not exists idx_tool_usage_user on tool_usage(user_id); 