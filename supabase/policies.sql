-- ════════════════════════════════════════════════════════════════════
--  Políticas de seguridad por fila (RLS) para Demo Viáticos
--
--  Ejecutar en Supabase → SQL Editor con un rol con privilegios.
--  Es idempotente: se puede volver a correr; borra y recrea cada política.
--
--  Modelo de acceso (coincide con NAV_BY_ROL en src/components/layout/AppShell.tsx):
--    usuario    ve y crea sus propias solicitudes
--    gerente    además ve y autoriza las de su equipo (usuarios.gerente_id = él)
--    tesoreria  ve todas, libera pagos
--    contador   ve todas (solo lectura), pólizas y trazabilidad
--    admin/demo todo. "demo" no puede borrar ni asignar rol admin.
--
--  Antes de correrlo, respalda la base. Después, prueba con cada rol.
-- ════════════════════════════════════════════════════════════════════

-- ── Helpers ─────────────────────────────────────────────────────────
-- Rol del usuario autenticado. SECURITY DEFINER evita recursión al leer
-- usuarios desde las políticas de usuarios.
create or replace function public.mi_rol()
returns text
language sql stable security definer set search_path = public as $$
  select rol from public.usuarios where id = auth.uid() and activo = true
$$;

create or replace function public.es_staff()          -- ve todas las solicitudes
returns boolean language sql stable security definer set search_path = public as $$
  select public.mi_rol() in ('admin','demo','tesoreria','contador')
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.mi_rol() in ('admin','demo')
$$;

-- ¿La solicitud pertenece a alguien de mi equipo (soy su gerente)?
create or replace function public.es_mi_equipo(p_usuario uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.usuarios u where u.id = p_usuario and u.gerente_id = auth.uid())
$$;

-- ¿Puedo ver esta solicitud? (los folios de solicitudes son texto, p. ej. ANT-2026-1234)
drop function if exists public.puedo_ver_solicitud(uuid);
create or replace function public.puedo_ver_solicitud(p_solicitud text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.solicitudes s
    where s.id = p_solicitud
      and (s.usuario_id = auth.uid() or public.es_staff() or public.es_mi_equipo(s.usuario_id))
  )
$$;

revoke all on function public.mi_rol(), public.es_staff(), public.es_admin(),
  public.es_mi_equipo(uuid), public.puedo_ver_solicitud(text) from public, anon;
grant execute on function public.mi_rol(), public.es_staff(), public.es_admin(),
  public.es_mi_equipo(uuid), public.puedo_ver_solicitud(text) to authenticated;

-- ── Activar RLS y cortar el acceso anónimo ──────────────────────────
do $$
declare t text;
begin
  foreach t in array array['usuarios','solicitudes','solicitud_items','comprobantes_cfdi',
    'notificaciones','push_subscriptions','bitacora','centros','divisiones',
    'limites_gasto','cuentas_contables','ajustes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ── usuarios ────────────────────────────────────────────────────────
-- Lectura: todos los autenticados (la app resuelve nombres y gerentes).
-- Nota: clabe y banco quedan visibles a cualquier usuario autenticado. Si
-- quieres ocultarlos, muévelos a una tabla aparte solo para admin/tesorería.
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios for select to authenticated
  using (true);

drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios for update to authenticated
  using (public.es_admin())
  with check (
    public.es_admin()
    -- demo no puede convertir a nadie en admin ni tocar a los admin
    and (public.mi_rol() = 'admin' or (rol <> 'admin' and (select rol from public.usuarios u where u.id = usuarios.id) <> 'admin'))
  );

-- Insert y delete solo por la API de administración (service_role, salta RLS).
drop policy if exists usuarios_insert on public.usuarios;
drop policy if exists usuarios_delete on public.usuarios;

-- ── solicitudes ─────────────────────────────────────────────────────
drop policy if exists solicitudes_select on public.solicitudes;
create policy solicitudes_select on public.solicitudes for select to authenticated
  using (usuario_id = auth.uid() or public.es_staff() or public.es_mi_equipo(usuario_id));

drop policy if exists solicitudes_insert on public.solicitudes;
create policy solicitudes_insert on public.solicitudes for insert to authenticated
  with check (usuario_id = auth.uid() and status = 'solicitado');

-- Dueño: corrige rechazadas y comprueba anticipos. Gerente: autoriza/rechaza las
-- de su equipo. Tesorería y admin: cualquier cambio. Contador: solo lectura.
drop policy if exists solicitudes_update on public.solicitudes;
create policy solicitudes_update on public.solicitudes for update to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_mi_equipo(usuario_id)
    or public.mi_rol() in ('admin','demo','tesoreria')
  )
  with check (
    usuario_id = auth.uid()
    or public.es_mi_equipo(usuario_id)
    or public.mi_rol() in ('admin','demo','tesoreria')
  );

drop policy if exists solicitudes_delete on public.solicitudes;
create policy solicitudes_delete on public.solicitudes for delete to authenticated
  using (public.mi_rol() = 'admin');

-- ── solicitud_items ─────────────────────────────────────────────────
drop policy if exists items_select on public.solicitud_items;
create policy items_select on public.solicitud_items for select to authenticated
  using (public.puedo_ver_solicitud(solicitud_id));

drop policy if exists items_insert on public.solicitud_items;
create policy items_insert on public.solicitud_items for insert to authenticated
  with check (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()));

drop policy if exists items_delete on public.solicitud_items;
create policy items_delete on public.solicitud_items for delete to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()) or public.es_admin());

-- ── comprobantes_cfdi ───────────────────────────────────────────────
drop policy if exists cfdi_select on public.comprobantes_cfdi;
create policy cfdi_select on public.comprobantes_cfdi for select to authenticated
  using (public.puedo_ver_solicitud(solicitud_id));

drop policy if exists cfdi_insert on public.comprobantes_cfdi;
create policy cfdi_insert on public.comprobantes_cfdi for insert to authenticated
  with check (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()) or public.es_admin());

-- Contador y admin actualizan el estado SAT; el dueño puede corregir las suyas.
drop policy if exists cfdi_update on public.comprobantes_cfdi;
create policy cfdi_update on public.comprobantes_cfdi for update to authenticated
  using (public.mi_rol() in ('admin','demo','contador') or exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()))
  with check (public.mi_rol() in ('admin','demo','contador') or exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()));

drop policy if exists cfdi_delete on public.comprobantes_cfdi;
create policy cfdi_delete on public.comprobantes_cfdi for delete to authenticated
  using (exists (select 1 from public.solicitudes s where s.id = solicitud_id and s.usuario_id = auth.uid()) or public.mi_rol() = 'admin');

-- ── notificaciones ──────────────────────────────────────────────────
drop policy if exists notif_select on public.notificaciones;
create policy notif_select on public.notificaciones for select to authenticated
  using (usuario_id = auth.uid());

-- Cualquier usuario autenticado puede avisar a otro (la app lo hace al crear o autorizar).
drop policy if exists notif_insert on public.notificaciones;
create policy notif_insert on public.notificaciones for insert to authenticated
  with check (true);

drop policy if exists notif_update on public.notificaciones;
create policy notif_update on public.notificaciones for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

drop policy if exists notif_delete on public.notificaciones;
create policy notif_delete on public.notificaciones for delete to authenticated
  using (usuario_id = auth.uid());

-- ── push_subscriptions ──────────────────────────────────────────────
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── bitacora ────────────────────────────────────────────────────────
-- Se lee junto con la solicitud a la que pertenece; se escribe al actuar sobre ella.
-- Ajusta el nombre de la columna si tu bitácora no se llama solicitud_id.
drop policy if exists bitacora_select on public.bitacora;
create policy bitacora_select on public.bitacora for select to authenticated
  using ((solicitud_id is null and public.es_staff()) or public.puedo_ver_solicitud(solicitud_id));

drop policy if exists bitacora_insert on public.bitacora;
create policy bitacora_insert on public.bitacora for insert to authenticated
  with check (solicitud_id is null or public.puedo_ver_solicitud(solicitud_id));

-- La bitácora no se edita ni se borra desde la app (ni admin).
drop policy if exists bitacora_update on public.bitacora;
drop policy if exists bitacora_delete on public.bitacora;

-- ── Catálogos: lectura para todos, escritura para admin/demo ───────
do $$
declare t text;
begin
  foreach t in array array['centros','divisiones','limites_gasto','cuentas_contables','ajustes']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_write on public.%I for insert to authenticated with check (public.es_admin())', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (public.es_admin()) with check (public.es_admin())', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    -- demo no borra (coincide con puedeBorrar en src/lib/permisos.ts)
    execute format('create policy %I_delete on public.%I for delete to authenticated using (public.mi_rol() = ''admin'')', t, t);
  end loop;
end $$;

-- ── Storage: bucket "comprobantes" ──────────────────────────────────
-- Bucket privado: la app guarda la ruta del archivo en comprobantes_cfdi.archivo_url
-- y genera URLs firmadas al mostrarlo (src/lib/archivos.ts). Las filas antiguas que
-- guardan la URL pública siguen funcionando: la app extrae la ruta de esa URL.
update storage.buckets set public = false where id = 'comprobantes';

drop policy if exists comprobantes_read on storage.objects;
create policy comprobantes_read on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes');

drop policy if exists comprobantes_upload on storage.objects;
create policy comprobantes_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes');

drop policy if exists comprobantes_update on storage.objects;
create policy comprobantes_update on storage.objects for update to authenticated
  using (bucket_id = 'comprobantes' and (owner = auth.uid() or public.es_admin()));

drop policy if exists comprobantes_delete on storage.objects;
create policy comprobantes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprobantes' and (owner = auth.uid() or public.mi_rol() = 'admin'));

-- ── Comprobación rápida ─────────────────────────────────────────────
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select * from pg_policies where schemaname in ('public','storage') order by tablename, policyname;
