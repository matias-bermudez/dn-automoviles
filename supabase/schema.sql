-- DN Automóviles — base de datos.
-- Pegar entero en Supabase → SQL Editor → Run. Se puede correr más de una vez sin romper nada.

-- ── Quién puede editar ───────────────────────────────────────────
-- Solo los emails de esta tabla pueden cargar, editar y borrar autos y fotos.
-- Se agregan a mano desde el SQL Editor (no se pueden leer ni tocar desde la web):
--   insert into public.admins (email) values ('dueño@ejemplo.com');
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where email = (auth.jwt() ->> 'email'));
$$;

-- ── Autos ─────────────────────────────────────────────────────────
create table if not exists public.autos (
  id              bigint generated always as identity primary key,
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- URL: /autos/<slug>/ (no cambia)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  marca           text not null,
  modelo          text not null,                 -- modelo y versión: "Onix LT 1.4"
  anio            int  not null check (anio between 1950 and 2100),
  km              int  not null default 0 check (km >= 0),
  tipo            text not null default 'auto' check (tipo in ('auto', 'camioneta', 'utilitario')),
  combustible     text not null default 'Nafta',
  transmision     text not null default 'Manual',
  traccion        text,                          -- "4x4" (vacío = no se muestra)
  motor           text,                          -- "1.4"
  color           text,
  puertas         int,
  duenos          int,
  precio          int check (precio > 0),        -- U$S. Vacío = "Consultar"
  etiqueta        text,                          -- cartelito: NUEVO INGRESO, DESTACADO, OPORTUNIDAD...
  destacado       boolean not null default false,-- grande en el inicio
  estado          text not null default 'disponible' check (estado in ('disponible', 'reservado', 'vendido')),
  publicado       boolean not null default true, -- false = borrador, no sale en la web
  patente_al_dia  boolean,
  libre_de_multas boolean,
  acepta_permuta  boolean not null default true,
  descripcion     text,
  fotos           text[] not null default '{}'   -- rutas en el bucket "fotos" (autos/<uuid>.jpg), la primera es la portada
);

-- Fecha de última modificación: la usan el sitemap y la detección de cambios al publicar.
create or replace function public.tocar_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists autos_updated_at on public.autos;
create trigger autos_updated_at before update on public.autos
  for each row execute function public.tocar_updated_at();

alter table public.autos enable row level security;

drop policy if exists "autos publicados visibles" on public.autos;
create policy "autos publicados visibles" on public.autos
  for select to anon, authenticated using (publicado and estado <> 'vendido');

drop policy if exists "admin gestiona autos" on public.autos;
create policy "admin gestiona autos" on public.autos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- ── Fotos ─────────────────────────────────────────────────────────
-- Bucket público: cualquiera puede ver una foto si sabe la ruta. Solo los admins suben o borran.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "admin gestiona fotos" on storage.objects;
create policy "admin gestiona fotos" on storage.objects
  for all to authenticated
  using (bucket_id = 'fotos' and public.es_admin())
  with check (bucket_id = 'fotos' and public.es_admin());
