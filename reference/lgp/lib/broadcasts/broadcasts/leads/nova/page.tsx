import Link from "next/link";

import { Button } from "@/components/ui";
import { PageHeader } from "@/components/admin/page-header";
import { requireGestor } from "@/lib/auth";
import { LEAD_PIPELINE, LEAD_STATUS_META } from "@/lib/leads/status";
import { pickLeadsRecipients } from "@/lib/broadcasts/recipients";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { LeadsComposeForm } from "./compose-form";

export const dynamic = "force-dynamic";

/**
 * Compose page for a leads broadcast. Filter changes re-run this
 * server component (submitted via GET), which re-picks recipients
 * server-side so the preview count is always accurate — no drift
 * between what the form thinks and what the pick will do.
 */
export default async function NovaLeadsBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter_q?: string;
    filter_status?: string;
    filter_qualif?: string;
    incluir_sem_verificacao?: string;
  }>;
}) {
  await requireGestor();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const filter = {
    q: sp?.filter_q ?? "",
    status: sp?.filter_status ?? "todos",
    qualif: (sp?.filter_qualif ?? "todos") as
      | "todos"
      | "quente"
      | "morno"
      | "frio"
      | "sem",
    incluir_sem_verificacao: sp?.incluir_sem_verificacao === "on",
  };

  const recipients = await pickLeadsRecipients(supabase, {
    q: filter.q || undefined,
    status: filter.status,
    qualif: filter.qualif,
    incluir_sem_verificacao: filter.incluir_sem_verificacao,
  });

  const statusOptions = [
    { v: "todos", label: "Todos os status" },
    { v: "abertos", label: "🚀 Em aberto" },
    ...LEAD_PIPELINE.map((s) => ({
      v: s,
      label: `${LEAD_STATUS_META[s].icon} ${LEAD_STATUS_META[s].label}`,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Novo broadcast para leads"
        subtitle="Compõe a mensagem, filtra o público, e agenda o envio escalonado. Faça um teste antes de disparar."
        actions={
          <Link href="/admin/broadcasts/leads">
            <Button variant="outline">← Voltar</Button>
          </Link>
        }
      />

      <LeadsComposeForm
        filter={filter}
        statusOptions={statusOptions}
        previewCount={recipients.length}
        previewFirst={recipients[0]?.nome ?? null}
        previewLast={recipients[recipients.length - 1]?.nome ?? null}
      />
    </div>
  );
}
