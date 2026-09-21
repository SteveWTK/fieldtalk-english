// src/lib/whatsapp/lead-funnel-cta.js
//
// Role-tailored CTA copy for the Q2-reply bubble. The single lever
// that moves conversion measurably — an agent, a coach, and an
// academy director each see a different verb because the promise
// hits differently.
//
// Keep the copy short: this appears immediately above the /demo link
// in a WhatsApp bubble, so it has to work in ~40 characters.

/**
 * @param {'agent'|'coach'|'club_staff'|'academy_director'|'other'|null|undefined} role
 * @returns {string} Portuguese CTA line ending with an arrow so the
 *                   link on the next line feels like the target of it.
 */
export function ctaForRole(role) {
  switch (role) {
    case "agent":
      return "👉 Veja como é rápido pros seus jogadores:";
    case "coach":
      return "👉 Convide sua turma pra experimentar:";
    case "club_staff":
      return "👉 Faça um teste com um jogador:";
    case "academy_director":
      return "👉 Peça uma demo pro seu elenco:";
    default:
      return "👉 Explore a demo em 2 minutos:";
  }
}
