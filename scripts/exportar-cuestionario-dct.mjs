#!/usr/bin/env node
// scripts/exportar-cuestionario-dct.mjs
//
// Genera el documento de revisión del Diagnóstico Contable y Tributario para el
// especialista (Sebastián). Lee el catálogo REAL del módulo — no una copia — así
// que el documento no puede desincronizarse del sistema: si alguien cambia una
// pregunta, un puntaje o un peso, se vuelve a correr esto y el documento queda
// al día.
//
//   npm run exportar:cuestionario
//   npm run exportar:cuestionario -- "C:\ruta\destino.html"
//
// La salida es un HTML autocontenido: sin CDN, sin fuentes externas y sin red.
// Se abre con doble clic en cualquier computador, funciona sin internet, guarda
// lo escrito en el propio navegador y exporta las observaciones a un archivo.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

import {
  ETAPAS, PREGUNTAS, CAMPOS_IDENTIFICACION, PUNTOS_MAX,
} from '../modules/diagnostico-contable/domain/cuestionario.js';
import { NIVELES, CONTROL, ANTECEDENTES } from '../modules/diagnostico-contable/domain/puntaje.js';
import { CATALOGO_ALERTAS } from '../modules/diagnostico-contable/domain/alertas.js';
import { REGLAS_PRECIO, ACLARACION_PRECIO, DESCARGO } from '../modules/diagnostico-contable/domain/recomendacion.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Junto al resto del material de la alianza. Se ancla en el home del usuario y no
// en rutas relativas al repo: el CRM vive en Documents/GitHub y los documentos
// comerciales en el Escritorio, así que contar carpetas hacia arriba se equivoca.
const DESTINO_POR_DEFECTO = join(
  homedir(), 'Desktop', 'PROYECTOS', 'PRESENTACIONES', 'ALIANZA-SEBASTIAN',
  'Triada-Cuestionario-Contable-Tributario-REVISION.html',
);

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const FECHA = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

// ─────────────────────────────────────────────────────────────────────────────
// Piezas del documento
// ─────────────────────────────────────────────────────────────────────────────

/** Bloque de veredicto: lo que Sebastián marca y escribe en cada punto. */
function veredicto(id, opciones = ['Está bien', 'Ajustar', 'Sobra', 'Falta algo']) {
  return `<div class="rev" data-rev="${esc(id)}">
    <div class="rev__ops">
      ${opciones.map((o) => `<label class="rev__op">
        <input type="radio" name="v_${esc(id)}" value="${esc(o)}"> <span>${esc(o)}</span>
      </label>`).join('')}
    </div>
    <textarea class="rev__txt" name="c_${esc(id)}" rows="2"
      placeholder="Comentario (opcional): qué cambiarías y por qué."></textarea>
  </div>`;
}

function tablaOpciones(p) {
  if (!Array.isArray(p.opciones) || !p.opciones.length) return '';
  const puntua = p.peso > 0;
  return `<table class="ops">
    <thead><tr><th>Alternativa que ve el cliente</th>${puntua ? '<th class="n">Puntos</th>' : ''}</tr></thead>
    <tbody>
      ${p.opciones.map((o) => {
        const pts = typeof o.puntos === 'number' ? o.puntos : null;
        const cls = pts === null ? '' : pts >= 3 ? 'p3' : pts === 2 ? 'p2' : pts === 1 ? 'p1' : 'p0';
        return `<tr${o.desconocido ? ' class="nose"' : ''}>
          <td>${esc(o.label)}${o.ayuda ? `<div class="ops__h">${esc(o.ayuda)}</div>` : ''}</td>
          ${puntua ? `<td class="n"><span class="pt ${cls}">${pts === null ? '—' : pts}</span></td>` : ''}
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function bloqueSubcampos(p) {
  if (!Array.isArray(p.subcampos) || !p.subcampos.length) return '';
  return `<div class="sub">
    <div class="sub__t">Por cada elemento que el cliente marque se piden estos antecedentes:</div>
    <ul class="sub__l">
      ${p.subcampos.map((s) => `<li>${esc(s.label)}
        ${s.puntua ? '<span class="tag tag--pt">puntúa</span>' : '<span class="tag">informativo</span>'}</li>`).join('')}
    </ul>
    <div class="sub__t">Escala de las tres que puntúan:</div>
    <table class="ops"><tbody>
      ${CONTROL.map((c) => `<tr><td>${esc(c.label)}</td>
        <td class="n"><span class="pt ${c.puntos >= 3 ? 'p3' : c.puntos === 1 ? 'p1' : 'p0'}">${c.puntos}</span></td></tr>`).join('')}
    </tbody></table>
  </div>`;
}

function bloqueColumnas(p) {
  if (!Array.isArray(p.columnas) || !p.columnas.length) return '';
  return `<div class="sub">
    <div class="sub__t">Se registra una fila por activo, con estos datos (no puntúan):</div>
    <ul class="sub__l">${p.columnas.map((c) => `<li>${esc(c.label)}</li>`).join('')}</ul>
  </div>`;
}

const TIPO_TXT = {
  unica: 'Una sola alternativa', multiple: 'Se puede marcar más de una',
  texto: 'Texto libre', textarea: 'Texto libre', numero: 'Número',
  moneda: 'Monto', inventario: 'Lista con antecedentes por elemento',
  activos: 'Tabla de activos',
};

function pregunta(p, idx) {
  const puntua = p.peso > 0;
  return `<article class="q${puntua ? '' : ' q--info'}" id="q-${esc(p.id)}">
    <header class="q__h">
      <span class="q__id">${esc(p.id.replace('_', ' '))}</span>
      <h4 class="q__t">${esc(p.texto)}</h4>
      <span class="q__peso ${puntua ? 'w' + p.peso : 'w0'}">${puntua ? `Peso ${p.peso}` : 'No puntúa'}</span>
    </header>
    <div class="q__meta">
      <span>${esc(TIPO_TXT[p.tipo] || p.tipo)}</span>
      ${p.requerido ? '<span class="tag tag--req">Obligatoria</span>' : ''}
      ${p.condicion ? `<span class="tag tag--cond">${esc(p.condicion)}</span>` : ''}
    </div>
    ${p.ayuda ? `<p class="q__ayuda">Texto de ayuda en pantalla: “${esc(p.ayuda)}”</p>` : ''}
    ${tablaOpciones(p)}
    ${bloqueSubcampos(p)}
    ${bloqueColumnas(p)}
    ${veredicto(p.id)}
  </article>`;
}

function etapa(e) {
  const preguntas = PREGUNTAS.filter((p) => p.etapa === e.id && !p.oculta);
  if (!preguntas.length) return '';
  const conPeso = preguntas.filter((p) => p.peso > 0).length;
  return `<section class="et">
    <header class="et__h">
      <span class="et__n">Etapa ${e.n}</span>
      <h3>${esc(e.label)}</h3>
      <p>${esc(e.sub)} · ${preguntas.length} pregunta${preguntas.length > 1 ? 's' : ''}${
        conPeso ? `, ${conPeso} con puntaje` : ', ninguna puntúa'}</p>
    </header>
    ${preguntas.map(pregunta).join('')}
  </section>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Documento
// ─────────────────────────────────────────────────────────────────────────────
const totalPreguntas = PREGUNTAS.filter((p) => !p.oculta).length;
const totalConPeso = PREGUNTAS.filter((p) => p.peso > 0).length;
const pesoMax = PREGUNTAS.filter((p) => p.peso > 0).reduce((s, p) => s + p.peso * PUNTOS_MAX, 0);

const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagnóstico Contable y Tributario — Revisión del especialista · Tríada</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --navy:#0A0F1C; --petrol:#0E1830; --teal:#0E9AA0; --teal-br:#2ED3C6;
    --azul:#3F63C9; --crema:#FBF9F3;
    --ink:#142037; --tx:#2A3553; --tx2:#5E6A85; --line:#E2E6EE;
    --bg:#F4F6F8; --sf:#FFFFFF;
    --ok:#2E9B73; --amb:#B8801A; --dan:#C04F3F;
  }
  body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;background:var(--bg);
       color:var(--tx);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
  .page{max-width:940px;margin:0 auto;padding:0 22px 90px}

  /* Portada */
  .hero{background:linear-gradient(125deg,var(--petrol),var(--navy));color:var(--crema);
        padding:44px 40px;margin:0 -22px 30px;position:relative;overflow:hidden}
  .hero::after{content:'';position:absolute;inset:auto 0 0 0;height:4px;
        background:linear-gradient(90deg,var(--teal-br),var(--azul))}
  .hero__mark{display:flex;align-items:center;gap:13px;margin-bottom:26px}
  .hero__mark .nm{font-size:21px;font-weight:800;letter-spacing:.01em}
  .hero__mark .tg{font-size:9.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
        color:var(--teal-br);display:block;margin-top:1px}
  .hero__k{font-size:10.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
        color:var(--teal-br);display:block;margin-bottom:11px}
  .hero h1{font-size:31px;font-weight:600;line-height:1.16;letter-spacing:-.015em;max-width:20ch}
  .hero__s{font-size:16px;color:rgba(251,249,243,.82);margin-top:11px;max-width:52ch}
  .hero__meta{display:flex;flex-wrap:wrap;gap:8px 30px;margin-top:26px;padding-top:20px;
        border-top:1px solid rgba(251,249,243,.16);font-size:12.5px;color:rgba(251,249,243,.62)}
  .hero__meta b{color:var(--crema);font-weight:600}

  /* Cajas */
  .card{background:var(--sf);border:1px solid var(--line);border-radius:13px;
        padding:24px 26px;margin-bottom:18px}
  .card h2{font-size:18px;font-weight:700;color:var(--ink);margin-bottom:5px}
  .card h2 + .lead{color:var(--tx2);font-size:14px;margin-bottom:15px}
  .card p + p{margin-top:11px}
  .pedido{border-left:4px solid var(--teal)}
  .aviso{background:#FFF9E8;border:1px solid #EBD9A6;border-left:4px solid var(--amb);
         border-radius:10px;padding:16px 20px;margin-bottom:18px;font-size:14px}
  .aviso b{color:#7A5510}

  ol.pasos{margin:12px 0 0 20px} ol.pasos li{margin-bottom:9px}
  ul.lista{margin:10px 0 0 20px} ul.lista li{margin-bottom:6px}

  /* Cómo se calcula */
  .form{background:var(--petrol);color:var(--crema);border-radius:11px;padding:17px 22px;
        font-size:16px;text-align:center;margin:16px 0;font-weight:600;letter-spacing:.01em}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .esc{width:100%;border-collapse:collapse;margin-top:9px;font-size:14px}
  .esc th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
        color:var(--tx2);padding:7px 10px;border-bottom:2px solid var(--line)}
  .esc td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  .esc td.n{text-align:center;width:64px;white-space:nowrap}
  .pt{display:inline-block;min-width:26px;padding:1px 8px;border-radius:20px;
      font-weight:700;font-size:13px;text-align:center}
  .p3{background:#E4F2EB;color:var(--ok)} .p2{background:#EDF3E4;color:#5E8032}
  .p1{background:#FBF0DC;color:var(--amb)} .p0{background:#F9E9E6;color:var(--dan)}

  /* Etapas y preguntas */
  .et{margin:34px 0 0}
  .et__h{border-bottom:2px solid var(--ink);padding-bottom:11px;margin-bottom:16px}
  .et__n{font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--teal)}
  .et__h h3{font-size:23px;font-weight:700;color:var(--ink);margin:3px 0 3px}
  .et__h p{font-size:13.5px;color:var(--tx2)}

  .q{background:var(--sf);border:1px solid var(--line);border-radius:12px;
     padding:20px 22px;margin-bottom:14px;break-inside:avoid}
  .q--info{background:#FAFBFD}
  .q__h{display:flex;align-items:flex-start;gap:11px;flex-wrap:wrap}
  .q__id{font-family:ui-monospace,Consolas,monospace;font-size:11px;font-weight:700;
         background:var(--ink);color:#fff;padding:3px 8px;border-radius:5px;flex-shrink:0;margin-top:2px}
  .q__t{flex:1;font-size:16px;font-weight:650;color:var(--ink);line-height:1.4;min-width:220px}
  .q__peso{flex-shrink:0;font-size:11px;font-weight:700;padding:3px 11px;border-radius:20px;white-space:nowrap}
  .w3{background:#E4F2EB;color:var(--ok)} .w2{background:#EAEEFA;color:var(--azul)}
  .w1{background:#F0F2F6;color:var(--tx2)} .w0{background:#F0F2F6;color:#94A0B6}
  .q__meta{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:9px;
           font-size:12px;color:var(--tx2)}
  .q__ayuda{font-size:13px;color:var(--tx2);font-style:italic;margin-top:8px}
  .tag{display:inline-block;font-size:11px;font-weight:600;padding:1px 9px;border-radius:20px;
       background:#F0F2F6;color:var(--tx2)}
  .tag--req{background:#F9E9E6;color:var(--dan)}
  .tag--cond{background:#EAEEFA;color:var(--azul)}
  .tag--pt{background:#E4F2EB;color:var(--ok)}

  .ops{width:100%;border-collapse:collapse;margin-top:13px;font-size:14px}
  .ops th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;
          color:var(--tx2);padding:7px 10px;border-bottom:2px solid var(--line)}
  .ops th.n,.ops td.n{text-align:center;width:76px}
  .ops td{padding:8px 10px;border-bottom:1px solid var(--line)}
  .ops tr.nose td{color:var(--tx2);font-style:italic}
  .ops__h{font-size:12px;color:var(--tx2);margin-top:2px}

  .sub{margin-top:14px;padding:13px 16px;background:#F5F7FA;border-radius:9px}
  .sub__t{font-size:12px;font-weight:700;color:var(--tx2);text-transform:uppercase;
          letter-spacing:.05em;margin-bottom:7px}
  .sub__t:not(:first-child){margin-top:13px}
  .sub__l{margin-left:19px;font-size:14px} .sub__l li{margin-bottom:4px}

  /* Bloque de revisión */
  .rev{margin-top:15px;padding-top:14px;border-top:1px dashed #C9D2E0}
  .rev__ops{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:9px}
  .rev__op{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border:1px solid #CBD3E0;
           border-radius:20px;font-size:13px;cursor:pointer;background:#fff;user-select:none}
  .rev__op:hover{border-color:var(--teal)}
  .rev__op input{accent-color:var(--teal);cursor:pointer;margin:0}
  .rev__op:has(input:checked){background:#E1F4F3;border-color:var(--teal);font-weight:600;color:#0A626C}
  .rev__txt{width:100%;padding:9px 12px;border:1px solid #CBD3E0;border-radius:8px;
            font-family:inherit;font-size:14px;color:var(--tx);resize:vertical;background:#fff}
  .rev__txt:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,154,160,.14)}

  /* Alertas */
  .al{border:1px solid var(--line);border-left:4px solid var(--amb);border-radius:10px;
      padding:16px 19px;margin-bottom:12px;background:var(--sf);break-inside:avoid}
  .al--crit{border-left-color:var(--dan)}
  .al__h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .al__t{font-size:15px;font-weight:700;color:var(--ink);flex:1;min-width:200px}
  .al__n{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
         padding:2px 9px;border-radius:20px;background:#FBF0DC;color:var(--amb)}
  .al--crit .al__n{background:#F9E9E6;color:var(--dan)}
  .al__d{font-size:14px;color:var(--tx2);margin-top:7px}
  .al__c{font-size:12.5px;color:var(--tx2);margin-top:8px;padding-top:8px;border-top:1px solid var(--line)}
  .al__c b{color:var(--ink)}

  /* Barra de acciones — hija de body, NO de .page: sin márgenes negativos, o
     sangraría 22px a cada lado del viewport y aparecería scroll horizontal. */
  .bar{position:sticky;bottom:0;background:rgba(255,255,255,.97);border-top:1px solid var(--line);
       backdrop-filter:blur(6px);box-shadow:0 -3px 18px rgba(20,32,55,.07)}
  .bar__in{max-width:940px;margin:0 auto;padding:13px 22px;display:flex;gap:11px;
       align-items:center;flex-wrap:wrap}
  .bar__c{flex:1;font-size:13px;color:var(--tx2);min-width:170px}
  .btn{padding:11px 22px;border-radius:24px;border:1px solid transparent;font-size:14px;
       font-weight:650;cursor:pointer;font-family:inherit}
  .btn--p{background:var(--teal);color:#fff}
  .btn--p:hover{background:#0A7C82}
  .btn--g{background:#fff;color:var(--tx);border-color:#CBD3E0}
  .btn--g:hover{background:#F0F2F6}

  .fin{margin-top:34px;padding:26px;background:var(--sf);border:2px solid var(--ink);border-radius:13px}
  .fin h2{margin-bottom:4px}
  .campo{margin-top:15px}
  .campo label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;
               letter-spacing:.06em;color:var(--tx2);margin-bottom:5px}
  .campo input,.campo textarea{width:100%;padding:10px 13px;border:1px solid #CBD3E0;
       border-radius:8px;font-family:inherit;font-size:14.5px;color:var(--tx)}
  .campo textarea{resize:vertical}
  .pie{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);
       font-size:12px;color:var(--tx2);text-align:center}

  @media (max-width:720px){
    .hero{padding:32px 22px} .hero h1{font-size:24px} .grid2{grid-template-columns:1fr}
    .q__peso{order:3}
    /* Los veredictos se marcan con el pulgar: 44px es el mínimo cómodo. */
    .rev__op{padding:10px 16px;font-size:14px}
    .rev__ops{gap:8px}
    .btn{flex:1;padding:13px 18px}
  }
  @media print{
    body{background:#fff;font-size:11.5pt}
    .bar{display:none} .page{max-width:100%;padding:0}
    .hero{margin:0 0 18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .q,.al,.card{break-inside:avoid;box-shadow:none}
    .rev__txt{min-height:44px}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  }
</style>
</head>
<body>
<div class="page">

  <header class="hero">
    <div class="hero__mark">
      <svg width="42" height="42" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path d="M26 90 L60 62 L94 90" stroke="#FBF9F3" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 73 L60 45 L94 73" stroke="#2ED3C6" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 56 L60 28 L94 56" stroke="#3F63C9" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div><span class="nm">Tríada</span><span class="tg">Consultoría</span></div>
    </div>
    <span class="hero__k">Revisión del especialista</span>
    <h1>Diagnóstico Contable y Tributario</h1>
    <p class="hero__s">Cuestionario completo, puntajes y reglas, para su revisión técnica antes de usarlo con clientes.</p>
    <div class="hero__meta">
      <span>Fecha: <b>${esc(FECHA)}</b></span>
      <span>Preguntas: <b>${totalPreguntas}</b> (${totalConPeso} con puntaje)</span>
      <span>Alertas: <b>${CATALOGO_ALERTAS.length}</b></span>
      <span>Versión: <b>Fase 1</b></span>
    </div>
  </header>

  <div class="card pedido">
    <h2>Qué es esto y qué te pedimos</h2>
    <p>Construimos dentro de nuestro CRM una herramienta que el equipo comercial usará en
    reuniones con gerentes, administradores y responsables financieros de empresas de mayor
    complejidad. Levanta información contable, financiera, societaria y tributaria, entrega un
    puntaje preliminar y decide si corresponde <b>derivarte el caso</b>.</p>
    <p><b>El contenido técnico es tuyo, no nuestro.</b> Nosotros armamos la mecánica; las
    preguntas, los puntajes y los umbrales necesitan tu criterio antes de que esto se use
    frente a un cliente. Por eso este documento.</p>
    <ol class="pasos">
      <li>Lee cada pregunta con sus alternativas y el puntaje que asignamos.</li>
      <li>Marca <b>Está bien</b>, <b>Ajustar</b>, <b>Sobra</b> o <b>Falta algo</b>, y escribe tu comentario cuando corresponda.</li>
      <li>Al final hay un espacio para lo que <b>no preguntamos y deberíamos</b>.</li>
      <li>Aprieta <b>“Descargar mis observaciones”</b> abajo y envíanos el archivo que se descarga.</li>
    </ol>
    <p style="margin-top:13px;font-size:13.5px;color:var(--tx2)">Lo que escribas se guarda solo en
    tu computador mientras avanzas: puedes cerrar el archivo y seguir después. No se envía nada
    por internet ni necesitas conexión.</p>
  </div>

  <div class="aviso">
    <b>Un límite que pusimos a propósito.</b> La herramienta se presenta siempre como un
    <b>prediagnóstico comercial</b> basado en lo que el cliente declara, sin verificar
    documentación. En ninguna pantalla, ni en el informe, se dice que sea auditoría,
    certificación, informe legal o dictamen. Texto literal que aparece en el informe:
    <i>“${esc(DESCARGO)}”</i>
  </div>

  <div class="card">
    <h2>Cómo se calcula el puntaje</h2>
    <p class="lead">Esto es lo primero que conviene que revises: si la mecánica no te hace
    sentido, el resto tampoco.</p>
    <div class="form">Puntaje = puntos obtenidos ÷ máximo aplicable × 100</div>
    <div class="grid2">
      <div>
        <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx2)">Cada respuesta vale de 0 a 3</h3>
        <table class="esc"><tbody>
          <tr><td class="n"><span class="pt p3">3</span></td><td>Condición saludable</td></tr>
          <tr><td class="n"><span class="pt p2">2</span></td><td>Aceptable, con observaciones</td></tr>
          <tr><td class="n"><span class="pt p1">1</span></td><td>Condición débil</td></tr>
          <tr><td class="n"><span class="pt p0">0</span></td><td>Alerta importante o desconocimiento crítico</td></tr>
        </tbody></table>
      </div>
      <div>
        <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--tx2)">Y cada pregunta tiene un peso</h3>
        <table class="esc"><tbody>
          <tr><td class="n"><span class="pt p3">3</span></td><td>Regularización contable, auditoría IFRS, inscripción CMF, opinión del auditor, control de ingresos adicionales, operaciones relacionadas</td></tr>
          <tr><td class="n"><span class="pt p2">2</span></td><td>Régimen tributario, hallazgos pendientes, artículo 33 bis, estructura societaria</td></tr>
          <tr><td class="n"><span class="pt p1">1</span></td><td>Moneda base y elementos administrativos secundarios</td></tr>
          <tr><td class="n"><span class="pt p0">0</span></td><td>No puntúa: identificación, contexto y dimensionamiento</td></tr>
        </tbody></table>
      </div>
    </div>
    <p style="margin-top:15px"><b>Máximo posible hoy:</b> ${pesoMax} puntos ponderados, si a la
    empresa le aplican las ${totalConPeso} preguntas con puntaje.</p>
    <h3 style="font-size:14px;color:var(--ink);margin-top:20px;margin-bottom:6px">Cuatro decisiones que tomamos y conviene que confirmes</h3>
    <ul class="lista">
      <li><b>El puntaje no se muestra mientras se responde.</b> Nos pareció que si el entrevistado
      lo ve subir y bajar, deja de contestar lo que pasa y contesta lo que conviene.</li>
      <li><b>“No lo sé” vale 0, pero se cuenta aparte.</b> No es lo mismo declarar “no está
      regularizada” que no saberlo: las dos puntúan 0, pero la segunda además aparece en una
      lista de antecedentes no confirmados.</li>
      <li><b>Lo que no aplica no entra al cálculo.</b> Una empresa con balance tributario no
      arrastra el peso de las preguntas de IFRS: se excluyen del numerador y del denominador.</li>
      <li><b>Tener inversiones no resta.</b> Lo que resta es no tenerlas contabilizadas,
      declaradas o respaldadas.</li>
    </ul>
    ${veredicto('MECANICA', ['La mecánica está bien', 'Ajustar la mecánica'])}
  </div>

  <h2 style="font-size:25px;color:var(--ink);margin:38px 0 6px">El cuestionario</h2>
  <p style="color:var(--tx2);margin-bottom:6px">Las cinco etapas en el orden en que las ve el cliente.
  La etapa 1 solo identifica a la empresa y no puntúa.</p>

  <div class="card">
    <h2>Etapa 1 · Identificación</h2>
    <p class="lead">Datos de contexto. Ninguno afecta el puntaje.</p>
    <ul class="lista">
      ${CAMPOS_IDENTIFICACION.map((c) => `<li>${esc(c.label)}${c.requerido ? ' <span class="tag tag--req">Obligatorio</span>' : ''}</li>`).join('')}
    </ul>
    ${veredicto('IDENTIFICACION', ['Están bien', 'Falta un dato', 'Sobra alguno'])}
  </div>

  ${ETAPAS.map(etapa).join('')}

  <section class="et">
    <header class="et__h">
      <span class="et__n">Regla transversal</span>
      <h3>Alertas prioritarias</h3>
      <p>Se muestran <b>aunque el puntaje total sea favorable</b>. Son el contrapeso al promedio:
      una empresa puede sacar 88 y tener la contabilidad sin regularizar.</p>
    </header>
    ${CATALOGO_ALERTAS.map((a) => `<div class="al${a.nivel === 'critico' ? ' al--crit' : ''}">
      <div class="al__h">
        <span class="al__t">${esc(a.titulo)}</span>
        <span class="al__n">${a.nivel === 'critico' ? 'Prioritaria' : 'Advertencia'}</span>
      </div>
      <p class="al__d">${esc(a.detalle)}</p>
      ${veredicto('AL_' + a.id, ['Está bien', 'Cambiar el nivel', 'Cambiar el texto', 'Sobra'])}
    </div>`).join('')}
    <div class="card">
      <h2>¿Falta alguna alerta?</h2>
      <p class="lead">Situaciones que en tu experiencia deberían encender una luz y hoy no lo hacen.</p>
      <div class="campo"><textarea name="c_ALERTAS_FALTAN" rows="4"
        placeholder="Ej.: pérdidas tributarias de arrastre sin respaldo; gastos rechazados recurrentes; ..."></textarea></div>
    </div>
  </section>

  <section class="et">
    <header class="et__h">
      <span class="et__n">Lectura del resultado</span>
      <h3>Umbrales e interpretación</h3>
      <p>Qué le decimos al cliente según el puntaje que obtuvo.</p>
    </header>
    <div class="card">
      <table class="esc">
        <thead><tr><th class="n">Puntaje</th><th>Lectura</th><th>Frase que ve el cliente</th></tr></thead>
        <tbody>
          ${NIVELES.map((n) => `<tr>
            <td class="n"><b>${n.min}–${n.max}</b></td>
            <td><b>${esc(n.label)}</b></td>
            <td style="font-size:13.5px;color:var(--tx2)">${esc(n.resumen)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      ${veredicto('UMBRALES', ['Los cortes están bien', 'Mover los cortes', 'Cambiar las frases'])}
    </div>
  </section>

  <section class="et">
    <header class="et__h">
      <span class="et__n">Propuesta comercial</span>
      <h3>Precio inicial sugerido</h3>
      <p>Lo que la herramienta propone al cerrar la reunión. <b>Sale de nuestro encargo, no de tu criterio</b> — es
      justamente lo que necesitamos que confirmes.</p>
    </header>
    <div class="card">
      <table class="esc">
        <thead><tr><th>Cómo prepara la empresa su información</th><th class="n">Precio</th></tr></thead>
        <tbody>
          ${REGLAS_PRECIO.map((r) => `<tr>
            <td>${esc(r.motivo)}</td>
            <td class="n"><b>${r.uf != null ? 'desde ' + r.uf + ' UF' : 'a definir'}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p style="margin-top:13px;font-size:13.5px;color:var(--tx2)"><b>Aclaración que siempre acompaña al precio:</b>
      “${esc(ACLARACION_PRECIO)}”</p>
      ${veredicto('PRECIOS', ['Los valores están bien', 'Ajustar los valores', 'Cambiar el criterio'])}
      <div class="campo" style="margin-top:14px">
        <label>Si ajustas: ¿cuánto y por qué?</label>
        <textarea name="c_PRECIOS_DETALLE" rows="3"
          placeholder="Ej.: bajo IFRS con más de 3 sociedades no bajaría de 30 UF porque ..."></textarea>
      </div>
    </div>
  </section>

  <section class="et">
    <header class="et__h">
      <span class="et__n">Cierre de la reunión</span>
      <h3>Antecedentes que se piden</h3>
      <p>Según lo que quede débil o desconocido, la herramienta arma la lista de documentos que el
      ejecutivo solicita antes de derivarte el caso.</p>
    </header>
    <div class="card">
      <ul class="lista">
        ${Object.entries(ANTECEDENTES).map(([id, txt]) =>
          `<li><b>${esc(id.replace('_', ' '))}</b> · ${esc(txt)}</li>`).join('')}
      </ul>
      ${veredicto('ANTECEDENTES', ['La lista está bien', 'Falta documentación', 'Sobra algo'])}
      <div class="campo" style="margin-top:14px">
        <label>¿Qué otro documento necesitas para trabajar un caso?</label>
        <textarea name="c_ANTECEDENTES_FALTAN" rows="3"></textarea>
      </div>
    </div>
  </section>

  <section class="fin">
    <h2>Para cerrar</h2>
    <p class="lead">Las tres preguntas que más nos sirven.</p>
    <div class="campo">
      <label>1. ¿Qué falta preguntar? Lo que tú siempre preguntas y acá no está</label>
      <textarea name="c_FINAL_FALTA" rows="4"></textarea>
    </div>
    <div class="campo">
      <label>2. ¿Qué sobra o confunde? Preguntas que un gerente no sabría responder o que no aportan</label>
      <textarea name="c_FINAL_SOBRA" rows="4"></textarea>
    </div>
    <div class="campo">
      <label>3. ¿Lo usarías tal como está? Si no, qué tendría que cambiar primero</label>
      <textarea name="c_FINAL_USO" rows="4"></textarea>
    </div>
    <div class="campo">
      <label>Tu nombre y la fecha de esta revisión</label>
      <input type="text" name="c_FIRMA" placeholder="Nombre · fecha">
    </div>
  </section>

  <p class="pie">
    Documento generado desde el sistema el ${esc(FECHA)} · Tríada Consultoría<br>
    Uso interno y de nuestro especialista asociado. No distribuir a clientes.
  </p>
</div>

<div class="bar">
  <div class="bar__in">
    <span class="bar__c" id="estado">Sin observaciones registradas todavía.</span>
    <button class="btn btn--g" type="button" id="imprimir">Imprimir o guardar en PDF</button>
    <button class="btn btn--p" type="button" id="descargar">Descargar mis observaciones</button>
  </div>
</div>

<script>
(function () {
  var CLAVE = 'triada_revision_dct_v1';
  var estado = document.getElementById('estado');

  function campos() {
    return Array.prototype.slice.call(document.querySelectorAll('input, textarea'));
  }

  function guardar() {
    var d = {};
    campos().forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
      else if (el.value.trim()) d[el.name] = el.value;
    });
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) {
      console.warn('No se pudo guardar el avance en este navegador:', e);
    }
    contar(d);
  }

  function restaurar() {
    var d;
    try { d = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { d = {}; }
    campos().forEach(function (el) {
      if (!(el.name in d)) return;
      if (el.type === 'radio') el.checked = (el.value === d[el.name]);
      else el.value = d[el.name];
    });
    contar(d);
  }

  function contar(d) {
    var marcas = 0, notas = 0;
    Object.keys(d).forEach(function (k) {
      if (k.indexOf('v_') === 0) marcas++;
      else if (k.indexOf('c_') === 0 && String(d[k]).trim()) notas++;
    });
    estado.textContent = (marcas || notas)
      ? marcas + ' punto(s) marcado(s) y ' + notas + ' comentario(s) escrito(s).'
      : 'Sin observaciones registradas todavía.';
  }

  document.addEventListener('input', guardar);
  document.addEventListener('change', guardar);

  document.getElementById('imprimir').addEventListener('click', function () { window.print(); });

  document.getElementById('descargar').addEventListener('click', function () {
    var d = {};
    campos().forEach(function (el) {
      if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
      else if (el.value.trim()) d[el.name] = el.value.trim();
    });

    var lineas = ['REVISION DEL DIAGNOSTICO CONTABLE Y TRIBUTARIO — TRIADA',
                  'Revisor: ' + (d['c_FIRMA'] || '(sin nombre)'),
                  'Descargado: ' + new Date().toLocaleString('es-CL'), ''];

    // Un bloque por punto revisado, con su veredicto y su comentario juntos.
    document.querySelectorAll('[data-rev]').forEach(function (bloque) {
      var id = bloque.getAttribute('data-rev');
      var v = d['v_' + id], c = d['c_' + id];
      if (!v && !c) return;
      var q = bloque.closest('.q, .al, .card, .fin');
      var titulo = q ? (q.querySelector('.q__t, .al__t, h2') || {}).textContent : id;
      lineas.push('── ' + id + ' · ' + String(titulo || '').trim());
      if (v) lineas.push('   Veredicto: ' + v);
      if (c) lineas.push('   Comentario: ' + c);
      lineas.push('');
    });

    var libres = [['c_ALERTAS_FALTAN', 'ALERTAS QUE FALTAN'],
                  ['c_PRECIOS_DETALLE', 'AJUSTE DE PRECIOS'],
                  ['c_ANTECEDENTES_FALTAN', 'ANTECEDENTES QUE FALTAN'],
                  ['c_FINAL_FALTA', '1. QUE FALTA PREGUNTAR'],
                  ['c_FINAL_SOBRA', '2. QUE SOBRA O CONFUNDE'],
                  ['c_FINAL_USO', '3. LO USARIAS TAL COMO ESTA']];
    libres.forEach(function (par) {
      if (!d[par[0]]) return;
      lineas.push('── ' + par[1]);
      lineas.push('   ' + d[par[0]].replace(/\\n/g, '\\n   '));
      lineas.push('');
    });

    if (lineas.length <= 4) {
      alert('Todavía no hay observaciones que descargar. Marca al menos un punto o escribe un comentario.');
      return;
    }

    var blob = new Blob([lineas.join('\\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Revision-Diagnostico-Contable-Triada.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  restaurar();
})();
</script>
</body>
</html>`;

const destino = process.argv[2] ? resolve(process.argv[2]) : DESTINO_POR_DEFECTO;
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, HTML, 'utf8');

console.log(`Documento de revisión generado:
  ${destino}

  ${totalPreguntas} preguntas (${totalConPeso} con puntaje) · ${CATALOGO_ALERTAS.length} alertas
  ${NIVELES.length} umbrales · ${REGLAS_PRECIO.length} reglas de precio
  ${Math.round(HTML.length / 1024)} KB, autocontenido (sin internet ni dependencias)`);
