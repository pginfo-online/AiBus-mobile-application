import type { TicketResponseData } from "../../types/api";
import { translations } from "../../core/localization/translations.ts";
import type { SupportedLanguage } from "../../core/localization/translations.ts";
export function escapeHtml(value?: string | number | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
export function formatTicketDate(
  value?: string,
  language: SupportedLanguage = "en",
): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(`${language}-IN`, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
}
export function buildTicketHtml(
  ticket: TicketResponseData,
  language: SupportedLanguage = "en",
): string {
  const b = ticket.booking;
  const e = escapeHtml;
  const t = (key: string, params: Record<string, string | number> = {}) => {
    let value = translations[language][key] || translations.en[key] || key;
    for (const [name, param] of Object.entries(params))
      value = value.replaceAll(`{${name}}`, String(param));
    return e(value);
  };
  const pickup = b.pickupSnapshot || {};
  const drop = b.dropoffSnapshot || {};
  const rows = b.passengers
    .map(
      (p) =>
        `<tr><td><strong>${e(p.name)}</strong><br/><small>${t("pax.years", { age: p.age })}, ${t(`pax.gender_${p.gender}`)}${b.seats.find((s) => s.seatNo === p.seatNo)?.cancelledAt ? ` · ${t("flow.cancelled")}` : ""}</small></td><td class="seat">${e(p.seatNo)}</td></tr>`,
    )
    .join("");
  const dateTime = (value?: string) => {
    if (!value) return "—";
    if (!value.includes("T")) return e(value);
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? e(value)
      : e(
          d.toLocaleString(`${language}-IN`, {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
  };
  const phase =
    b.status === "CONFIRMED"
      ? "confirmed"
      : b.status === "CANCELLED"
        ? "cancelled"
        : b.status === "CANCELLATION_REQUESTED"
          ? "cancelling"
          : b.status === "REFUNDED"
            ? "refund"
            : "uncertain";
  const policies = Array.isArray(b.cancellationPolicy)
    ? b.cancellationPolicy.filter(
        (p) => typeof p.title === "string" && typeof p.description === "string",
      )
    : [];
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"/><title>AiBus — ${t("flow.trip_details")}</title><style>
 @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,'Noto Sans Devanagari',sans-serif;color:#414258;font-size:13px;line-height:1.5;margin:0}main{max-width:650px;margin:auto}header{background:#d84d56;color:white;padding:22px;text-align:center}.brand{text-align:left;font-size:21px;font-weight:bold}.route{font-size:20px;font-weight:bold;margin:12px 0}.ids{border-top:1px solid #f2b3b8;padding-top:8px;font-size:12px}.intro{margin:20px 6px 30px}.panel{border:1px solid #d8d8df;margin:16px 0;break-inside:avoid}.panel h2{font-size:16px;background:#e6eaf6;margin:0;padding:10px 24px}.content{padding:22px 24px}.columns{display:flex;gap:30px}.columns>div{flex:1;min-width:0}.label,small{color:#738099;font-size:12px}.rule{border:0;border-top:1px dashed #85889b;margin:20px 0}table{width:100%;border-collapse:collapse}td{padding:10px 0;vertical-align:top}.seat{width:25%;font-weight:bold}.status{margin:18px 0}.policy{padding:20px;border-bottom:1px solid #ddd}.icon{color:#d84d56;margin-right:8px}strong{overflow-wrap:anywhere}
 </style></head><body><main><header><div class="brand">AiBus</div><strong>${t("flow.trip_details")}</strong><div class="route">${e(b.fromCityName)}-${e(b.toCityName)}</div><div class="ids">${t("flow.ticket_number")}: <strong>${e(ticket.ticketNumber) || "—"}</strong>　|　PNR: <strong>${e(ticket.pnrNumber) || "—"}</strong></div></header>
 <div class="intro"><p>${t("flow.greeting", { name: b.contactName })}</p><p>${t("flow.ticket_intro", { from: b.fromCityName, to: b.toCityName })}<br/><strong>${e(formatTicketDate(b.journeyDate, language))} ${e(b.pickupTime)}</strong></p></div>
 <section class="panel"><h2>${t("flow.journey_details")}</h2><div class="content"><div class="columns"><div><span class="label">${t("flow.departure")}</span><p><span class="icon">▣</span><strong>${pickup.departureDateTime ? dateTime(pickup.departureDateTime) : e(b.journeyDate)} ${pickup.departureDateTime ? "" : e(b.pickupTime)}</strong></p></div><div><span class="label">${t("flow.arrival")}</span><p><span class="icon">▣</span><strong>${dateTime(drop.arrivalDateTime || b.dropoffTime)}</strong></p></div></div>
 <span class="label">${t("flow.travels")}</span><div><span class="icon">▤</span><strong>${e(b.operatorName)}</strong><br/><small>${e(b.busType)}</small></div><hr class="rule"/>
 <div class="columns"><div><span class="label">${t("pax.pickup")}</span><p><strong>${e(b.pickupLocation) || "—"}</strong><br/>${e(pickup.address)}<br/>${e(pickup.landmark)}<br/><strong>${e(pickup.contact)}</strong></p></div><div><span class="label">${t("pax.drop")}</span><p><strong>${e(b.dropoffLocation) || "—"}</strong><br/>${e(drop.address)}<br/>${e(drop.landmark)}</p></div></div><hr class="rule"/>
 <table><thead><tr><td class="label">${t("pax.passenger_details")}</td><td class="label">${t("pax.seats")}</td></tr></thead><tbody>${rows}</tbody></table></div></section>
 <div class="status">${t("flow.status")}: <strong>${t(`flow.${phase}`)}</strong>　·　${t("pax.amount")}: ₹${e(Number(b.totalFare).toFixed(2))}</div>
 <section class="panel"><div class="content"><a href="aibus://help" style="color:#414258;text-decoration:none">${t("flow.need_help")} →</a></div></section>
 ${policies.length ? `<section class="panel"><h2>${t("flow.booking_policies")}</h2>${policies.map((p) => `<div class="policy"><strong>${e(p.title)}</strong><p>${e(p.description)}</p></div>`).join("")}</section>` : ""}
 </main></body></html>`;
}
