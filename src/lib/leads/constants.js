// src/lib/leads/constants.js
//
// Shared enum values + bilingual labels for the leads admin. Single
// source of truth so schema constraints, API validation, and UI
// dropdowns never drift. Add a new stage / source / type here first,
// then update the SQL CHECK constraint to match.
//
// COPY.<section>.<key>.<lang> is the same pattern used in the
// broadcasts admin so bilingual switching stays consistent across
// the admin surface.

export const LEAD_STAGES = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "proposal",
  "won",
  "lost",
  "dormant",
];

// Ordered top-to-bottom as they should appear in the kanban.
// Terminal stages (`won`, `lost`, `dormant`) at the end.
export const KANBAN_STAGES = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "proposal",
  "won",
  "lost",
];

export const LEAD_TYPES = [
  "individual_player",
  "academy",
  "school",
  "club",
  "partner_other",
];

// Which lead_types are organisations vs individuals — drives the
// progressive-disclosure sections in the new-lead form.
export const ORG_LEAD_TYPES = new Set([
  "academy",
  "school",
  "club",
  "partner_other",
]);

export const LEAD_SOURCES = [
  "manual",
  "qr_campaign",
  "landing_form",
  "partner_referral",
  "event",
  "cold_outreach",
  "import",
];

export const AGE_GROUPS = ["youth", "senior", "pro"];
export const ENGLISH_LEVELS = ["beginner", "intermediate", "advanced"];

export const ACTIVITY_TYPES = [
  "stage_change",
  "whatsapp_outbound",
  "whatsapp_inbound",
  "note_added",
  "call_logged",
  "email_logged",
  "assigned",
  "tag_change",
  "converted",
];

// Bilingual copy dictionary. Convention:
//   COPY.section.key.pt / COPY.section.key.en
// Nested for readability. Access via t(key, lang) below.

export const COPY = {
  page: {
    title: {
      pt: "Leads",
      en: "Leads",
    },
    subtitle: {
      pt: "Registre, filtre e trabalhe seus contatos de vendas e parceria.",
      en: "Register, filter and work your sales & partnership contacts.",
    },
    listView: { pt: "Lista", en: "List" },
    kanbanView: { pt: "Kanban", en: "Kanban" },
    newLead: { pt: "Novo lead", en: "New lead" },
    backToLeads: { pt: "Voltar aos leads", en: "Back to leads" },
    backToAdmin: { pt: "Voltar ao admin", en: "Back to admin" },
  },

  filters: {
    search: { pt: "Buscar por nome, org, telefone…", en: "Search name, org, phone…" },
    all: { pt: "Todos", en: "All" },
    stage: { pt: "Estágio", en: "Stage" },
    type: { pt: "Tipo", en: "Type" },
    source: { pt: "Origem", en: "Source" },
    owner: { pt: "Responsável", en: "Owner" },
    tag: { pt: "Tag", en: "Tag" },
    hasPhone: { pt: "Com telefone", en: "With phone" },
    hasEmail: { pt: "Com email", en: "With email" },
    nextAction: { pt: "Próxima ação", en: "Next action" },
    overdue: { pt: "Atrasada", en: "Overdue" },
    today: { pt: "Hoje", en: "Today" },
    thisWeek: { pt: "Esta semana", en: "This week" },
    clearFilters: { pt: "Limpar filtros", en: "Clear filters" },
  },

  metrics: {
    total: { pt: "Total", en: "Total" },
    thisWeek: { pt: "Esta semana", en: "This week" },
    newLeads: { pt: "Novos", en: "New" },
    won: { pt: "Ganhos", en: "Won" },
    conversionRate: { pt: "Taxa de conversão", en: "Conversion rate" },
  },

  columns: {
    name: { pt: "Nome", en: "Name" },
    organization: { pt: "Organização", en: "Organization" },
    type: { pt: "Tipo", en: "Type" },
    stage: { pt: "Estágio", en: "Stage" },
    source: { pt: "Origem", en: "Source" },
    owner: { pt: "Responsável", en: "Owner" },
    lastActivity: { pt: "Última atividade", en: "Last activity" },
    nextAction: { pt: "Próxima ação", en: "Next action" },
    actions: { pt: "Ações", en: "Actions" },
  },

  stages: {
    new: { pt: "Novo", en: "New" },
    contacted: { pt: "Contatado", en: "Contacted" },
    engaged: { pt: "Engajado", en: "Engaged" },
    qualified: { pt: "Qualificado", en: "Qualified" },
    proposal: { pt: "Proposta", en: "Proposal" },
    won: { pt: "Ganho", en: "Won" },
    lost: { pt: "Perdido", en: "Lost" },
    dormant: { pt: "Dormente", en: "Dormant" },
  },

  types: {
    individual_player: { pt: "Jogador", en: "Individual player" },
    academy: { pt: "Academia", en: "Academy" },
    school: { pt: "Escola", en: "School" },
    club: { pt: "Clube", en: "Club" },
    partner_other: { pt: "Outro parceiro", en: "Other partner" },
  },

  sources: {
    manual: { pt: "Manual", en: "Manual" },
    qr_campaign: { pt: "Campanha QR", en: "QR campaign" },
    landing_form: { pt: "Landing page", en: "Landing form" },
    partner_referral: { pt: "Indicação de parceiro", en: "Partner referral" },
    event: { pt: "Evento", en: "Event" },
    cold_outreach: { pt: "Prospecção fria", en: "Cold outreach" },
    import: { pt: "Importação", en: "Import" },
  },

  ageGroups: {
    youth: { pt: "Base (juniores)", en: "Youth" },
    senior: { pt: "Adulto amador", en: "Senior amateur" },
    pro: { pt: "Profissional", en: "Professional" },
  },

  englishLevels: {
    beginner: { pt: "Iniciante", en: "Beginner" },
    intermediate: { pt: "Intermediário", en: "Intermediate" },
    advanced: { pt: "Avançado", en: "Advanced" },
  },

  form: {
    section: {
      basics: { pt: "Informações básicas", en: "Basics" },
      contact: { pt: "Contato", en: "Contact" },
      playerDetails: { pt: "Detalhes do jogador", en: "Player details" },
      orgDetails: { pt: "Detalhes da organização", en: "Organization details" },
      classification: { pt: "Classificação", en: "Classification" },
      location: { pt: "Localização", en: "Location" },
      assignment: { pt: "Atribuição", en: "Assignment" },
      notes: { pt: "Notas iniciais", en: "Initial notes" },
    },
    field: {
      fullName: { pt: "Nome completo", en: "Full name" },
      email: { pt: "Email", en: "Email" },
      phone: { pt: "WhatsApp / Telefone", en: "WhatsApp / phone" },
      phoneHint: {
        pt: "Inclua código do país (55 para Brasil) + DDD.",
        en: "Include country code (55 for Brazil) + area code.",
      },
      leadType: { pt: "Tipo de lead", en: "Lead type" },
      organizationName: { pt: "Nome da organização", en: "Organization name" },
      roleAtOrg: { pt: "Cargo", en: "Role" },
      roleAtOrgHint: {
        pt: "Ex: Diretor, Técnico principal, Coordenador",
        en: "e.g. Director, Head Coach, Coordinator",
      },
      staffCount: { pt: "Nº de funcionários / staff", en: "Staff count" },
      ageGroup: { pt: "Categoria", en: "Age group" },
      positions: { pt: "Posições", en: "Positions" },
      englishLevel: { pt: "Nível de inglês", en: "English level" },
      stage: { pt: "Estágio", en: "Stage" },
      source: { pt: "Origem", en: "Source" },
      sourceDetail: { pt: "Detalhe da origem", en: "Source detail" },
      sourceDetailHint: {
        pt: "Ex: nome do evento, slug da campanha, parceiro que indicou",
        en: "e.g. event name, campaign slug, referring partner",
      },
      owner: { pt: "Responsável", en: "Owner" },
      tags: { pt: "Tags", en: "Tags" },
      tagsHint: {
        pt: "Separe múltiplas tags por vírgula (ex: warm, event-carioca)",
        en: "Comma-separated (e.g. warm, event-carioca)",
      },
      country: { pt: "País", en: "Country" },
      state: { pt: "Estado", en: "State" },
      city: { pt: "Cidade", en: "City" },
      estimatedValue: { pt: "Valor estimado (R$)", en: "Estimated value (R$)" },
      nextActionAt: { pt: "Próxima ação em", en: "Next action at" },
      nextActionNote: { pt: "Nota da próxima ação", en: "Next action note" },
      doNotContact: {
        pt: "Não contatar (respeitar opt-out)",
        en: "Do not contact (respect opt-out)",
      },
      summary: { pt: "Resumo curto", en: "Short summary" },
      summaryHint: {
        pt: "Aparece na lista para lembrar quem é sem abrir o detalhe.",
        en: "Shows in the list so you remember who this is without opening detail.",
      },
      notes: { pt: "Notas", en: "Notes" },
    },
    save: { pt: "Salvar lead", en: "Save lead" },
    cancel: { pt: "Cancelar", en: "Cancel" },
    saving: { pt: "Salvando…", en: "Saving…" },
    required: { pt: "Obrigatório", en: "Required" },
  },

  detail: {
    editFields: { pt: "Editar campos", en: "Edit fields" },
    saveChanges: { pt: "Salvar alterações", en: "Save changes" },
    cancelEdit: { pt: "Cancelar edição", en: "Cancel edit" },
    stageBadge: { pt: "Estágio", en: "Stage" },
    ownerBadge: { pt: "Responsável", en: "Owner" },
    notAssigned: { pt: "Não atribuído", en: "Unassigned" },
    tabTimeline: { pt: "Linha do tempo", en: "Timeline" },
    tabNotes: { pt: "Notas", en: "Notes" },
    addNote: { pt: "Adicionar nota", en: "Add note" },
    noteAdded: { pt: "Nota adicionada.", en: "Note added." },
    notePlaceholder: {
      pt: "Anote algo sobre este lead — contexto, próximos passos, insights…",
      en: "Write something about this lead — context, next steps, insights…",
    },
    empty: {
      timeline: {
        pt: "Nenhuma atividade registrada ainda.",
        en: "No activity logged yet.",
      },
      notes: { pt: "Nenhuma nota ainda.", en: "No notes yet." },
    },
    sendWhatsapp: { pt: "Enviar WhatsApp", en: "Send WhatsApp" },
    sendWhatsappPlaceholder: {
      pt: "Escreva uma mensagem…",
      en: "Write a message…",
    },
    sendWhatsappSent: {
      pt: "Mensagem enviada.",
      en: "Message sent.",
    },
    logCall: { pt: "Registrar ligação", en: "Log call" },
    logEmail: { pt: "Registrar email", en: "Log email" },
    delete: { pt: "Excluir lead", en: "Delete lead" },
    deleteConfirm: {
      pt: "Excluir este lead permanentemente? Esta ação não pode ser desfeita.",
      en: "Permanently delete this lead? This can't be undone.",
    },
    doNotContactWarning: {
      pt: "Este lead está marcado como não-contatar. WhatsApp bloqueado.",
      en: "This lead is marked do-not-contact. WhatsApp blocked.",
    },
    noPhoneWarning: {
      pt: "Adicione um telefone para poder enviar WhatsApp.",
      en: "Add a phone number to send WhatsApp.",
    },
    convertedTo: { pt: "Convertido em jogador:", en: "Converted to player:" },
  },

  activities: {
    stage_change: { pt: "Estágio alterado", en: "Stage changed" },
    whatsapp_outbound: { pt: "WhatsApp enviado", en: "WhatsApp sent" },
    whatsapp_inbound: { pt: "WhatsApp recebido", en: "WhatsApp received" },
    note_added: { pt: "Nota adicionada", en: "Note added" },
    call_logged: { pt: "Ligação registrada", en: "Call logged" },
    email_logged: { pt: "Email registrado", en: "Email logged" },
    assigned: { pt: "Responsável alterado", en: "Owner changed" },
    tag_change: { pt: "Tags alteradas", en: "Tags changed" },
    converted: { pt: "Convertido", en: "Converted" },
  },

  errors: {
    saveFailed: { pt: "Falha ao salvar.", en: "Save failed." },
    loadFailed: { pt: "Falha ao carregar.", en: "Load failed." },
    network: { pt: "Erro de rede.", en: "Network error." },
    phoneInvalid: {
      pt: "Telefone inválido. Verifique o código do país e DDD.",
      en: "Invalid phone. Check country code and area code.",
    },
    nameRequired: { pt: "Nome é obrigatório.", en: "Name is required." },
    typeRequired: { pt: "Tipo é obrigatório.", en: "Lead type is required." },
  },
};

/**
 * Look up a bilingual copy value. Path is a dot-separated key
 * (e.g. "columns.name"); lang is "pt" | "en"; falls back to pt if
 * the exact language is missing on the leaf.
 *
 * Usage:
 *   const label = t("stages.new", lang);
 */
export function t(path, lang = "pt") {
  const parts = path.split(".");
  let node = COPY;
  for (const p of parts) {
    if (node == null || typeof node !== "object") return path;
    node = node[p];
  }
  if (!node || typeof node !== "object") return path;
  return node[lang] || node.pt || node.en || path;
}

/**
 * Compact tone descriptors for each stage — used in badges + kanban
 * column headers. Keeping the tone here rather than in each component
 * so a global visual tweak is one file.
 */
export const STAGE_TONES = {
  new: "bg-white/10 text-white/80",
  contacted: "bg-blue-500/15 text-blue-300",
  engaged: "bg-cyan-500/15 text-cyan-300",
  qualified: "bg-emerald-500/15 text-emerald-300",
  proposal: "bg-amber-500/15 text-amber-300",
  won: "bg-accent-400/20 text-accent-200",
  lost: "bg-red-500/15 text-red-300",
  dormant: "bg-white/5 text-white/40",
};
