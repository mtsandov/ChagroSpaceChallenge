-- ChAgro — esquema inicial (Supabase / Postgres + PostGIS)
-- Aplicar con:  supabase db push   (o pegar en el SQL Editor del proyecto)

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Perfiles y roles
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('public', 'farmer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'public',
  created_at timestamptz not null default now()
);

-- Crea el perfil al registrarse. El rol viene de raw_user_meta_data.role ('farmer' | 'public').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'farmer' then 'farmer'::public.app_role else 'public'::public.app_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_farmer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'farmer');
$$;

-- ---------------------------------------------------------------------------
-- Catálogos (lectura pública)
-- ---------------------------------------------------------------------------
create table public.basins (
  id text primary key,
  name text not null,
  short_name text,
  description text,
  sustainable_quota_ha numeric,
  center geography(Point, 4326),
  zoom int default 13,
  geom geography(MultiPolygon, 4326)
);

create table public.crops (
  id text primary key,
  name text not null,
  root_depth_m numeric not null,
  p_depletion numeric not null,
  stages jsonb not null -- [{stage_name, kc_value, duration_days}]
);

create table public.soil_types (
  id text primary key,
  name text not null,
  theta_fc numeric not null,
  theta_wp numeric not null
);

create table public.land_cover (
  id bigserial primary key,
  basin_id text references public.basins (id),
  cbn1 text,
  cbn2 text,
  anio int,
  geom geography(MultiPolygon, 4326)
);
create index land_cover_geom_idx on public.land_cover using gist (geom);

-- ---------------------------------------------------------------------------
-- Fincas, parcelas y sistemas de riego (privados del agricultor)
-- ---------------------------------------------------------------------------
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  geom geography(MultiPolygon, 4326),
  created_at timestamptz not null default now()
);

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms (id) on delete cascade,
  basin_id text references public.basins (id),
  name text not null,
  geom geography(Polygon, 4326) not null,
  area_ha numeric generated always as (round((st_area(geom) / 10000)::numeric, 2)) stored,
  crop_id text references public.crops (id),
  planting_date date,
  soil_type_id text references public.soil_types (id),
  created_at timestamptz not null default now()
);
create index parcels_geom_idx on public.parcels using gist (geom);

create type public.irrigation_type as enum ('drip', 'sprinkler', 'micro_sprinkler', 'furrow', 'flood', 'subsurface', 'other');
create type public.irrigation_mode as enum ('per_plant', 'per_area');

create table public.irrigation_systems (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null unique references public.parcels (id) on delete cascade,
  type public.irrigation_type not null default 'drip',
  mode public.irrigation_mode not null default 'per_plant',
  efficiency numeric not null default 90 check (efficiency > 0 and efficiency <= 100),
  num_plants int,
  canopy_radius_m numeric,
  flow_rate_lph numeric,
  emitters int,
  system_flow_m3h numeric,
  percolation_mm_day numeric default 0,
  pump_kw numeric,
  pump_head_m numeric,
  attachment_path text -- archivo subido a Storage (plano, ficha técnica)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  kc numeric,
  et0_sum numeric,
  etc_sum numeric,
  effective_rain_mm numeric,
  net_mm numeric,
  gross_mm numeric,
  volume_m3 numeric,
  irrigation_time_h numeric,
  depletion_mm numeric,
  next_irrigation_date date,
  deficit_pct numeric default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Observaciones satelitales y clima (las carga el pipeline NASA)
-- ---------------------------------------------------------------------------
create table public.sar_parcels (
  parcel_id text primary key, -- id público (p. ej. HACIENDA_NORTE_01)
  basin_id text references public.basins (id),
  name text not null,
  zone_type text check (zone_type in ('commercial_farm', 'smallholder', 'community')),
  crop text,
  geom geography(Polygon, 4326) not null
);
create index sar_parcels_geom_idx on public.sar_parcels using gist (geom);

create table public.parcel_observations (
  id bigserial primary key,
  parcel_id text not null references public.sar_parcels (parcel_id) on delete cascade,
  observation_date date not null,
  baseline_date date,
  sensor text not null, -- 'NISAR GCOV', 'OPERA DSWx-S1', 'SMAP', 'VIIRS'
  sar_backscatter_db numeric,
  sar_delta_db numeric,
  irrigated_area_pct numeric,
  irrigated_area_ha numeric,
  soil_moisture_m3m3 numeric,
  ndvi numeric,
  status text check (status in ('excessive', 'normal', 'deficit')),
  unique (parcel_id, observation_date, sensor)
);

create table public.weather_daily (
  basin_id text references public.basins (id),
  date date not null,
  lat numeric not null,
  lng numeric not null,
  t2m_max numeric,
  t2m_min numeric,
  t2mdew numeric,
  rh2m numeric,
  ws2m numeric,
  allsky_sfc_sw_dwn numeric, -- MJ/m²/día
  ps numeric, -- kPa
  prectotcorr numeric, -- mm/día
  et0 numeric,
  source text not null default 'NASA POWER',
  primary key (basin_id, date, source)
);

create table public.virtual_stations (
  station_id text primary key,
  basin_id text references public.basins (id),
  name text not null,
  geom geography(Point, 4326) not null
);

create table public.station_readings (
  station_id text references public.virtual_stations (station_id) on delete cascade,
  ts timestamptz not null,
  level_pct numeric,
  flow_trend text,
  alert_level text check (alert_level in ('normal', 'warning', 'critical_low')),
  primary key (station_id, ts)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.basins enable row level security;
alter table public.crops enable row level security;
alter table public.soil_types enable row level security;
alter table public.land_cover enable row level security;
alter table public.farms enable row level security;
alter table public.parcels enable row level security;
alter table public.irrigation_systems enable row level security;
alter table public.recommendations enable row level security;
alter table public.sar_parcels enable row level security;
alter table public.parcel_observations enable row level security;
alter table public.weather_daily enable row level security;
alter table public.virtual_stations enable row level security;
alter table public.station_readings enable row level security;

-- Perfil: cada quien ve y edita el suyo (el rol no se puede auto-cambiar desde el cliente)
create policy "own profile read" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- El cliente solo puede editar su nombre; el rol lo cambia el service role
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Datos públicos del visor: lectura para todos (anon + authenticated)
create policy "public read" on public.basins for select using (true);
create policy "public read" on public.crops for select using (true);
create policy "public read" on public.soil_types for select using (true);
create policy "public read" on public.land_cover for select using (true);
create policy "public read" on public.sar_parcels for select using (true);
create policy "public read" on public.parcel_observations for select using (true);
create policy "public read" on public.weather_daily for select using (true);
create policy "public read" on public.virtual_stations for select using (true);
create policy "public read" on public.station_readings for select using (true);

-- Datos privados del agricultor
create policy "farmer owns farms" on public.farms for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.is_farmer());

create policy "farmer owns parcels" on public.parcels for all
  using (exists (select 1 from public.farms f where f.id = farm_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.farms f where f.id = farm_id and f.owner_id = auth.uid()));

create policy "farmer owns irrigation systems" on public.irrigation_systems for all
  using (exists (
    select 1 from public.parcels p join public.farms f on f.id = p.farm_id
    where p.id = parcel_id and f.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.parcels p join public.farms f on f.id = p.farm_id
    where p.id = parcel_id and f.owner_id = auth.uid()));

create policy "farmer owns recommendations" on public.recommendations for all
  using (exists (
    select 1 from public.parcels p join public.farms f on f.id = p.farm_id
    where p.id = parcel_id and f.owner_id = auth.uid()))
  with check (exists (
    select 1 from public.parcels p join public.farms f on f.id = p.farm_id
    where p.id = parcel_id and f.owner_id = auth.uid()));

-- Vista pública agregada: área y conteo de parcelas registradas por cuenca, sin datos del sistema de riego
create view public.v_public_basin_registrations with (security_invoker = false) as
  select p.basin_id, count(*) as registered_parcels, round(sum(p.area_ha), 1) as registered_area_ha
  from public.parcels p
  group by p.basin_id;
grant select on public.v_public_basin_registrations to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: archivos del sistema de riego (privados por usuario)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('irrigation-files', 'irrigation-files', false)
  on conflict (id) do nothing;

create policy "farmer reads own files" on storage.objects for select
  using (bucket_id = 'irrigation-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "farmer uploads own files" on storage.objects for insert
  with check (bucket_id = 'irrigation-files' and (storage.foldername(name))[1] = auth.uid()::text and public.is_farmer());
