-- DN Automóviles — publicar la web al instante cuando se carga, edita o borra un auto.
-- Cada cambio en la tabla autos le pide a GitHub que corra el workflow "Publicar" (1–2 minutos).
-- Sin esto igual se publica, pero depende de la revisión programada de GitHub, que se atrasa.
--
-- Una vez:
-- 1. En GitHub crear un token "fine-grained" solo para este repo, con permiso Actions: Read and write.
-- 2. Guardarlo en Supabase (SQL Editor), cambiando el texto entre comillas por el token:
--      select vault.create_secret('github_pat_...', 'github_token');
--    Para reemplazarlo más adelante:
--      select vault.update_secret((select id from vault.secrets where name = 'github_token'), 'github_pat_nuevo...');
-- 3. Pegar este archivo entero en el SQL Editor → Run.

create extension if not exists pg_net with schema extensions;

create or replace function public.publicar_web() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_token' limit 1;
  if token is null then
    return null;
  end if;
  -- Asincrónico: se manda después de guardar y no frena al panel.
  perform net.http_post(
    url := 'https://api.github.com/repos/matias-bermudez/dn-automoviles/actions/workflows/publicar.yml/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'dn-automoviles-supabase',
      'Content-Type', 'application/json'
    )
  );
  return null;
end $$;

revoke all on function public.publicar_web() from public, anon, authenticated;

-- Una vez por operación (no por fila): si se cambian varios autos juntos, se publica una sola vez.
drop trigger if exists autos_publicar on public.autos;
create trigger autos_publicar after insert or update or delete on public.autos
  for each statement execute function public.publicar_web();

-- Para ver si GitHub aceptó los últimos pedidos (status_code 204 = ok):
--   select id, status_code, content, created from net._http_response order by created desc limit 5;
