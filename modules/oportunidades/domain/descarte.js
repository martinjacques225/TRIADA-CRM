// modules/oportunidades/domain/descarte.js — CAUSALES CRÍTICAS (lógica pura).
//
// "Si aparece cualquiera de estas, no se puntúa: se descarta y no se pierde más
// tiempo." Objetivo de tiempo del encargo: descartar en 5 minutos.
//
// Dos tipos de detección:
//   · automática — el dato ya está en el CRM y la cuenta la hace el sistema
//     (margen bajo 25%, requisito obligatorio marcado "no cumple", plazo vencido).
//   · declarada  — la marca una persona al analizar las bases (multas
//     desproporcionadas, alcance ambiguo, dependencia de terceros…).
// El sistema NUNCA descarta solo: propone, explica y deja el clic a la persona.

export const CAUSALES = [
  { slug: 'requisito_faltante',      label: 'Falta un requisito obligatorio',            auto: true  },
  { slug: 'experiencia_institucional', label: 'Exige experiencia institucional que no tenemos', auto: true },
  { slug: 'plazo_imposible',         label: 'Plazo imposible de cumplir',                auto: true  },
  { slug: 'margen_insuficiente',     label: 'Margen estimado bajo 25%',                  auto: true  },
  { slug: 'multas_desproporcionadas', label: 'Multas desproporcionadas',                 auto: false },
  { slug: 'soporte_no_garantizable', label: 'Soporte que no podemos garantizar',         auto: false },
  { slug: 'alcance_ambiguo',         label: 'Alcance ambiguo sin posibilidad de aclarar', auto: false },
  { slug: 'dependencia_tercero',     label: 'Depende de un tercero no confirmado',       auto: false },
  { slug: 'requiere_abogado',        label: 'Necesita abogado y no hay aliado disponible', auto: false },
  { slug: 'auditoria_habilitacion',  label: 'Auditoría sin la habilitación correspondiente', auto: false },
  { slug: 'choque_proyectos',        label: 'Choca gravemente con los proyectos actuales', auto: false },
];

export const causalMeta = (slug) => CAUSALES.find((c) => c.slug === slug) || null;
export const causalLabel = (slug) => causalMeta(slug)?.label || slug || '—';

/**
 * Detecta las causales que el CRM puede probar solo, con la evidencia a la vista.
 *
 * @param {object} ctx
 *  - requisitos: [{tipo, obligatorio, cumple, texto}]
 *  - margenReal: fracción o null
 *  - margenDescarte: umbral (default 0.25)
 *  - diasHastaCierre: número o null (negativo = ya cerró)
 *  - horasEstimadas / horasDisponiblesAntesCierre: para el plazo
 *  - riesgosDeclarados: [{causal, descripcion, nivel}] marcados por una persona
 * @returns {Array<{causal, label, motivo, origen}>}
 */
export function detectarCausales(ctx = {}) {
  const out = [];
  const {
    requisitos = [], margenReal = null, margenDescarte = 0.25,
    diasHastaCierre = null, horasEstimadas = null, horasDisponiblesAntesCierre = null,
    riesgosDeclarados = [],
  } = ctx;

  // 1) Requisito obligatorio explícitamente NO cumplido.
  const faltantes = requisitos.filter((r) => r.obligatorio && r.cumple === 'no');
  if (faltantes.length) {
    const exp = faltantes.filter((r) => r.tipo === 'experiencia_institucional');
    if (exp.length) {
      out.push({
        causal: 'experiencia_institucional', label: causalLabel('experiencia_institucional'),
        motivo: `Las bases exigen experiencia institucional que Tríada no acredita: "${recorta(exp[0].texto)}".`,
        origen: 'sistema',
      });
    }
    const otros = faltantes.filter((r) => r.tipo !== 'experiencia_institucional');
    if (otros.length) {
      out.push({
        causal: 'requisito_faltante', label: causalLabel('requisito_faltante'),
        motivo: `${otros.length} requisito(s) obligatorio(s) marcados como no cumplidos: "${recorta(otros[0].texto)}".`,
        origen: 'sistema',
      });
    }
  }

  // 2) Margen bajo el piso.
  if (margenReal != null && margenReal < margenDescarte) {
    out.push({
      causal: 'margen_insuficiente', label: causalLabel('margen_insuficiente'),
      motivo: `Margen estimado ${Math.round(margenReal * 1000) / 10}%, bajo el piso de ${Math.round(margenDescarte * 100)}%.`,
      origen: 'sistema',
    });
  }

  // 3) Plazo: o ya cerró, o no alcanzan las horas hasta el cierre.
  if (diasHastaCierre != null && diasHastaCierre < 0) {
    out.push({ causal: 'plazo_imposible', label: causalLabel('plazo_imposible'), motivo: 'El proceso ya cerró.', origen: 'sistema' });
  } else if (horasEstimadas != null && horasDisponiblesAntesCierre != null && horasEstimadas > horasDisponiblesAntesCierre) {
    out.push({
      causal: 'plazo_imposible', label: causalLabel('plazo_imposible'),
      motivo: `La oferta exige ${horasEstimadas} h y hasta el cierre solo hay ${horasDisponiblesAntesCierre} h disponibles.`,
      origen: 'sistema',
    });
  }

  // 4) Las declaradas por una persona (multas, alcance, terceros…).
  riesgosDeclarados.forEach((r) => {
    if (!r || !r.causal) return;
    if (out.some((x) => x.causal === r.causal)) return;
    out.push({ causal: r.causal, label: causalLabel(r.causal), motivo: r.descripcion || causalLabel(r.causal), origen: 'manual' });
  });

  return out;
}

/** ¿Hay al menos una causal crítica? Lo usa el veredicto del marcador. */
export const hayCausalCritica = (causales = []) => causales.length > 0;

/**
 * Texto de una línea para el registro del descarte. Se guarda en
 * `motivo_descarte` para poder responder después "¿por qué no participamos?".
 */
export function resumenDescarte(causales = []) {
  if (!causales.length) return '';
  return causales.map((c) => `${c.label}: ${c.motivo}`).join(' · ');
}

/**
 * Reabrir una descartada exige justificación escrita (§9). Devuelve
 * { ok, error } igual que validarTransicion: la vista muestra el error tal cual.
 */
export function validarReapertura(motivo) {
  const m = String(motivo || '').trim();
  if (m.length < 10) return { ok: false, error: 'Para reabrir una oportunidad descartada hay que escribir una justificación (mínimo 10 caracteres).' };
  return { ok: true, error: null };
}

function recorta(t, n = 90) {
  const s = String(t || '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
