-- ───────────────────────────────────────────────────────────────
-- Bulk WhatsApp broadcasts (one-shot, filter-driven).
--
-- Sibling to `campanhas` — NOT an extension of it. Campanhas model
-- multi-phase rematricula lifecycles tied to a semestre; broadcasts
-- model single-shot "compose + filter + schedule + send" flows
-- (David's request, 2026-08-11).
--
-- Recipient is polymorphic: either a lead or an aluno, checked by
-- constraint. One shared dispatcher (`/api/cron/dispatch-broadcasts`)
-- handles both types.
--
-- Auto-skip rule: at send-time, if a lead recipient's status has
-- flipped to `convertido`, the row is marked skipped (skip_reason =
-- 'lead_convertido') instead of sent.
-- ───────────────────────────────────────────────────────────────

create type broadcast_target as enum ('leads', 'alunos');

create type broadcast_status as enum (
  'rascunho',      -- created but not yet fanned out
  'agendado',      -- recipients written, waiting for cron
  'em_envio',      -- some recipients sent, others still pending
  'concluido',     -- all recipients processed (sent / falhou / skipped)
  'cancelado'      -- gestor cancelled mid-flight; unsent recipients marked skipped
);

create type broadcast_recipient_status as enum (
  'agendado',      -- waiting for its slot
  'enviada',       -- Z-API accepted the send
  'falhou',        -- Z-API threw / returned an error
  'skipped'        -- skipped by auto-skip rules or on cancel
);

create table broadcasts (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,                -- internal label ("Aviso início 2026/2")
  target_type         broadcast_target not null,
  filter              jsonb not null default '{}'::jsonb,   -- filter shape at compose time
  mensagem            text not null,
  agendado_para       timestamptz not null,         -- when the stagger STARTS
  intervalo_seg       int not null default 8
    check (intervalo_seg between 3 and 60),
  respeitar_fim_de_semana boolean not null default false,   -- true = Sat allowed (Sun never)
  janela_inicio_h     int not null default 8
    check (janela_inicio_h between 0 and 23),
  janela_fim_h        int not null default 19
    check (janela_fim_h between 1 and 24 and janela_fim_h > janela_inicio_h),
  status              broadcast_status not null default 'rascunho',
  criado_por          uuid references auth.users(id) on delete set null,
  total_recipients    int not null default 0,
  enviados            int not null default 0,
  falhou              int not null default 0,
  skipped             int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on broadcasts (status, agendado_para);
create index on broadcasts (target_type, created_at desc);
create trigger broadcasts_updated_at before update on broadcasts
  for each row execute function set_updated_at();

create table broadcast_recipients (
  id                  uuid primary key default gen_random_uuid(),
  broadcast_id        uuid not null references broadcasts(id) on delete cascade,
  lead_id             uuid references leads(id) on delete cascade,
  aluno_id            uuid references alunos(id) on delete cascade,
  telefone            text not null,                -- snapshotted at fan-out time
  agendado_para       timestamptz not null,
  status              broadcast_recipient_status not null default 'agendado',
  zapi_message_id     text,
  error               text,
  skip_reason         text,                          -- populated when status='skipped'
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  -- Exactly one of lead_id / aluno_id set — matches the polymorphic
  -- recipient design.
  check ((lead_id is null) != (aluno_id is null))
);

-- Prevent double-scheduling the same recipient within one broadcast.
create unique index on broadcast_recipients (broadcast_id, lead_id)
  where lead_id is not null;
create unique index on broadcast_recipients (broadcast_id, aluno_id)
  where aluno_id is not null;

-- Cron drain: any recipient whose slot is due AND still pending.
create index on broadcast_recipients (agendado_para)
  where status = 'agendado';
create index on broadcast_recipients (broadcast_id);

alter table broadcasts enable row level security;
alter table broadcast_recipients enable row level security;

create policy broadcasts_read on broadcasts
  for select using (is_gestor() or is_atendente_or_gestor());

create policy broadcasts_write on broadcasts
  for all using (is_gestor()) with check (is_gestor());

create policy broadcast_recipients_read on broadcast_recipients
  for select using (is_atendente_or_gestor());

create policy broadcast_recipients_write on broadcast_recipients
  for all using (is_gestor()) with check (is_gestor());
