create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique,
  phone text,
  role text not null default 'client' check (role in ('client','driver_pending','driver','store_owner','admin','super_admin','blocked')),
  driver_status text not null default 'none' check (driver_status in ('none','pending','approved','rejected','blocked')),
  driver_level int default 1,
  is_blocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  full_name text,
  cpf text,
  phone text,
  vehicle_type text,
  vehicle_plate text,
  cnh text,
  region text,
  pix_key text,
  status text default 'pending' check (status in ('pending','approved','rejected','blocked')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  type text not null default 'mais_pedido' check (type in ('mais_pedido','parceiro_oficial','teste','em_breve')),
  address text,
  phone text,
  neighborhood text,
  opening_hours text,
  delivery_time text,
  rating numeric default 5,
  base_fee numeric default 8,
  image_url text,
  active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric not null default 0,
  promo_price numeric,
  image_url text,
  active boolean default true,
  confirm_in_store boolean default true,
  stock_simulated int,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  discount numeric not null default 0,
  type text not null default 'order' check (type in ('order','delivery','percentage')),
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade,
  title text not null,
  description text,
  discount_label text,
  image_url text,
  active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  driver_id uuid references public.profiles(id),
  establishment_id uuid references public.establishments(id),
  status text not null default 'Aguardando entregador',
  items_text text,
  notes text,
  catalog_subtotal numeric default 0,
  custom_subtotal numeric default 0,
  estimated_value numeric default 0,
  safety_margin numeric default 0,
  authorized_purchase_limit numeric default 0,
  actual_value numeric,
  delivery_fee numeric default 0,
  platform_fee numeric default 0,
  discount numeric default 0,
  total_paid numeric default 0,
  coupon_code text,
  over_limit_status text default 'none' check (over_limit_status in ('none','pending_customer_approval','approved','rejected')),
  extra_payment_required numeric default 0,
  confirmation_code text,
  invoice_photo_url text,
  goods_photo_url text,
  invoice_photo_sent boolean default false,
  goods_photo_sent boolean default false,
  paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  complement_requested_at timestamptz,
  complement_approved_at timestamptz,
  complement_rejected_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type text not null check (type in ('catalog','custom')),
  product_id uuid references public.products(id),
  name text not null,
  quantity numeric not null default 1,
  unit_price_estimate numeric not null default 0,
  total_estimate numeric not null default 0,
  store_id uuid,
  notes text,
  allow_substitution boolean default true,
  brand_preference text,
  created_at timestamptz default now()
);

create table if not exists public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  status text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.order_chats (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  sender_role text,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.driver_wallets (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid references public.profiles(id) on delete cascade,
  pending_balance numeric default 0,
  available_balance numeric default 0,
  operational_limit numeric default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.driver_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references public.driver_wallets(id) on delete cascade,
  order_id uuid references public.orders(id),
  type text not null,
  amount numeric not null,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  order_id uuid references public.orders(id),
  type text,
  status text default 'open',
  description text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_driver_applications_updated_at on public.driver_applications;
create trigger set_driver_applications_updated_at before update on public.driver_applications for each row execute function public.set_updated_at();
drop trigger if exists set_establishments_updated_at on public.establishments;
create trigger set_establishments_updated_at before update on public.establishments for each row execute function public.set_updated_at();
drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
drop trigger if exists set_promotions_updated_at on public.promotions;
create trigger set_promotions_updated_at before update on public.promotions for each row execute function public.set_updated_at();
drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists set_driver_wallets_updated_at on public.driver_wallets;
create trigger set_driver_wallets_updated_at before update on public.driver_wallets for each row execute function public.set_updated_at();
drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, role, driver_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    'client',
    'none'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and coalesce(is_blocked, false) = false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin') and coalesce(is_blocked, false) = false)
$$;

create or replace function public.is_driver()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'driver')
$$;

create or replace function public.is_approved_driver()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'driver' and driver_status = 'approved' and coalesce(is_blocked, false) = false)
$$;

alter table public.profiles enable row level security;
alter table public.driver_applications enable row level security;
alter table public.establishments enable row level security;
alter table public.products enable row level security;
alter table public.coupons enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.order_chats enable row level security;
alter table public.driver_wallets enable row level security;
alter table public.driver_wallet_transactions enable row level security;
alter table public.support_tickets enable row level security;

create policy "profiles self read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles admin read" on public.profiles for select to authenticated using (public.is_admin());
create policy "profiles self update basic" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles super admin update" on public.profiles for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "profiles admin update non super" on public.profiles for update to authenticated using (public.is_admin() and role <> 'super_admin') with check (role <> 'super_admin');

create policy "driver applications self insert" on public.driver_applications for insert to authenticated with check (user_id = auth.uid());
create policy "driver applications self read" on public.driver_applications for select to authenticated using (user_id = auth.uid());
create policy "driver applications admin read" on public.driver_applications for select to authenticated using (public.is_admin());
create policy "driver applications admin update" on public.driver_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "establishments active read" on public.establishments for select to authenticated using (active = true);
create policy "establishments admin read" on public.establishments for select to authenticated using (public.is_admin());
create policy "establishments admin insert" on public.establishments for insert to authenticated with check (public.is_admin());
create policy "establishments admin update" on public.establishments for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "establishments admin delete" on public.establishments for delete to authenticated using (public.is_admin());

create policy "products active read" on public.products for select to authenticated using (active = true);
create policy "products admin read" on public.products for select to authenticated using (public.is_admin());
create policy "products admin insert" on public.products for insert to authenticated with check (public.is_admin());
create policy "products admin update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products admin delete" on public.products for delete to authenticated using (public.is_admin());

create policy "coupons active read" on public.coupons for select to authenticated using (active = true);
create policy "coupons admin crud" on public.coupons for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "promotions active read" on public.promotions for select to authenticated using (active = true);
create policy "promotions admin crud" on public.promotions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "orders client insert" on public.orders for insert to authenticated with check (client_id = auth.uid());
create policy "orders client read" on public.orders for select to authenticated using (client_id = auth.uid());
create policy "orders driver available read" on public.orders for select to authenticated using (public.is_approved_driver() and driver_id is null);
create policy "orders driver own read" on public.orders for select to authenticated using (public.is_approved_driver() and driver_id = auth.uid());
create policy "orders admin read" on public.orders for select to authenticated using (public.is_admin());
create policy "orders client complement update" on public.orders for update to authenticated using (client_id = auth.uid() and over_limit_status = 'pending_customer_approval') with check (client_id = auth.uid());
create policy "orders driver accept update" on public.orders for update to authenticated using (public.is_approved_driver() and (driver_id = auth.uid() or driver_id is null)) with check (public.is_approved_driver());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "order items related read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())));
create policy "order items client insert" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid()));
create policy "order items admin read" on public.order_items for select to authenticated using (public.is_admin());

create policy "order events related read" on public.order_status_events for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())));
create policy "order events related insert" on public.order_status_events for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())));

create policy "order chats related read" on public.order_chats for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())));
create policy "order chats related insert" on public.order_chats for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and (o.client_id = auth.uid() or o.driver_id = auth.uid() or public.is_admin())));

create policy "driver wallets own read" on public.driver_wallets for select to authenticated using (driver_id = auth.uid());
create policy "driver wallets admin read" on public.driver_wallets for select to authenticated using (public.is_admin());
create policy "driver wallets admin update" on public.driver_wallets for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "wallet transactions own read" on public.driver_wallet_transactions for select to authenticated using (exists (select 1 from public.driver_wallets w where w.id = wallet_id and w.driver_id = auth.uid()));
create policy "wallet transactions admin write" on public.driver_wallet_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "support tickets self insert" on public.support_tickets for insert to authenticated with check (user_id = auth.uid());
create policy "support tickets self read" on public.support_tickets for select to authenticated using (user_id = auth.uid());
create policy "support tickets admin read" on public.support_tickets for select to authenticated using (public.is_admin());
create policy "support tickets admin update" on public.support_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Operações sensíveis de pagamento, promoção administrativa avançada e liquidação de carteira
-- devem migrar para Edge Functions com service_role no servidor, nunca no app.
