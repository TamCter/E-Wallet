-- Kích hoạt Realtime cho bảng transactions một cách an toàn (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;
