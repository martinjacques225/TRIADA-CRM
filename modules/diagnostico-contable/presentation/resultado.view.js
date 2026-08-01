// modules/diagnostico-contable/presentation/resultado.view.js
// ETAPA 5 — Resultado y recomendación.
//
// Es la pantalla que se le muestra al gerente al cerrar la reunión, así que cada
// número viene acompañado de qué lo produjo. Ninguna frase afirma que la empresa
// está certificada o libre de contingencias: la lectura siempre es "de acuerdo
// con la información declarada".

import { esc, i, anilloPuntaje, barraPuntaje, chipRiesgo, badgeEstado, tarjetaAlerta, uf, fecha } from './ui.js';
import { nivelMeta } from '../domain/puntaje.js';
import { ESTADOS, transicionesDe, estadoLabel } from '../domain/estados.js';
import { preguntaPorId } from '../domain/cuestionario.js';

/** Número en formato chileno (coma decimal), sin decimales sobrantes. */
const _num = (n) => Number(n ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 2 });

export function renderResultado(ctx) {
  const {
    datos = {}, puntaje = {}, alertas = [], recomendacion = {},
    fortalezas = [], brechas = [], antecedentes = [], desconocidas = [],
    guardado = false, puedeEditar = true, empresaVinculada = null, historial = [],
  } = ctx;

  const nivel = puntaje.nivel ? nivelMeta(puntaje.nivel) : null;

  return `<div class="dct-resultado">
    ${_encabezado(datos, guardado, empresaVinculada)}

    <div class="dct-res-grid">
      <section class="card card-pad dct-res-puntaje" aria-labelledby="dctResPuntaje">
        <h2 id="dctResPuntaje" class="dct-res-h">Puntaje preliminar</h2>
        ${anilloPuntaje(puntaje.general, 'Puntaje general')}
        <div class="dct-res-nivel">
          ${chipRiesgo(puntaje.nivel)}
          <p class="dct-res-lectura">${esc(nivel ? nivel.resumen : 'Faltan respuestas para emitir una lectura preliminar.')}</p>
        </div>
        <div class="dct-res-sub">
          <div class="dct-res-sub__item">
            <span class="dct-res-sub__l">Evaluación financiera</span>
            ${barraPuntaje(puntaje.financiero)}
          </div>
          <div class="dct-res-sub__item">
            <span class="dct-res-sub__l">Evaluación tributaria</span>
            ${barraPuntaje(puntaje.tributario)}
          </div>
        </div>
        <p class="dct-res-cobertura">
          ${puntaje.cobertura
            ? `Calculado sobre ${puntaje.cobertura.evaluadas} de ${puntaje.cobertura.aplicables} preguntas con puntaje aplicables a esta empresa
               (${_num(puntaje.cobertura.puntosObtenidos)} de ${_num(puntaje.cobertura.puntosMaximos)} puntos ponderados).`
            : ''}
        </p>
      </section>

      <section class="card card-pad dct-res-alertas" aria-labelledby="dctResAlertas">
        <h2 id="dctResAlertas" class="dct-res-h">
          Alertas prioritarias
          ${alertas.length ? `<span class="dct-res-count">${alertas.length}</span>` : ''}
        </h2>
        ${alertas.length
          ? `<p class="dct-res-nota">Se muestran aunque el puntaje total sea favorable.</p>
             <div class="dct-alertas">${alertas.map(tarjetaAlerta).join('')}</div>`
          : `<div class="dct-res-ok">${i('checkCirc', 20)}
              <p>No se identificaron alertas prioritarias con la información declarada. Esto no equivale a una certificación ni descarta contingencias.</p>
             </div>`}
      </section>
    </div>

    <div class="dct-res-grid dct-res-grid--3">
      ${_lista('Fortalezas', 'checkCirc', 'var(--green)', fortalezas,
        'Todavía no hay respuestas en condición saludable.')}
      ${_lista('Brechas detectadas', 'alert', 'var(--amber)', brechas,
        'No se detectaron brechas en las respuestas declaradas.')}
      ${_listaDesconocidas(desconocidas)}
    </div>

    ${_antecedentes(antecedentes)}
    ${_recomendacion(recomendacion, puedeEditar)}
    ${_acciones(datos, puedeEditar, guardado)}
    ${historial.length ? _historial(historial) : ''}

    <p class="dct-descargo">${i('alert', 13)} ${esc(recomendacion.descargo || '')}</p>
  </div>`;
}

function _encabezado(d, guardado, empresa) {
  return `<header class="dct-res-head">
    <button class="btn btn-ghost btn-sm" data-dct="volver-portada">${i('chevL', 14)} Historial</button>
    <div class="dct-res-head__t">
      <h1>${esc(d.razonSocial || 'Diagnóstico')}</h1>
      <div class="dct-res-head__meta">
        ${d.codigo ? `<span class="dct-mono">${esc(d.codigo)}</span>` : ''}
        ${d.industria ? `<span>${esc(d.industria)}</span>` : ''}
        <span>${esc(fecha(d.fecha))}</span>
        ${d.estado ? badgeEstado(d.estado) : ''}
        ${empresa ? `<span class="dct-fila__link">${i('building', 12)} ${esc(empresa)}</span>` : ''}
        ${!guardado ? '<span class="dct-chip dct-chip--warn">Sin guardar</span>' : ''}
      </div>
    </div>
  </header>`;
}

function _lista(titulo, icono, color, items, vacio) {
  return `<section class="card card-pad dct-res-lista">
    <h3 class="dct-res-h3"><span style="color:${color}">${i(icono, 15)}</span> ${esc(titulo)}</h3>
    ${items.length
      ? `<ul class="dct-ul">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
      : `<p class="dct-mute">${esc(vacio)}</p>`}
  </section>`;
}

function _listaDesconocidas(ids) {
  const textos = ids.map((id) => preguntaPorId(id)?.bloque || preguntaPorId(id)?.texto || id);
  return `<section class="card card-pad dct-res-lista">
    <h3 class="dct-res-h3"><span style="color:var(--text2)">${i('search', 15)}</span> Respuestas desconocidas
      ${ids.length ? `<span class="dct-res-count dct-res-count--mute">${ids.length}</span>` : ''}</h3>
    ${textos.length
      ? `<p class="dct-res-nota">Antecedentes que la empresa no pudo confirmar en la reunión.</p>
         <ul class="dct-ul">${textos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
      : '<p class="dct-mute">La empresa pudo responder todas las preguntas del recorrido.</p>'}
  </section>`;
}

function _antecedentes(items) {
  if (!items.length) return '';
  return `<section class="card card-pad dct-res-antecedentes" aria-labelledby="dctResAnt">
    <h2 id="dctResAnt" class="dct-res-h">${i('fileText', 17)} Antecedentes que deben solicitarse</h2>
    <p class="dct-res-nota">La lista concreta con la que se cierra la reunión.</p>
    <ol class="dct-ol">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  </section>`;
}

function _recomendacion(rec, puedeEditar) {
  const p = rec.precio || {};
  const urgencia = rec.urgencia === 'prioritaria' ? 'var(--danger)'
    : rec.urgencia === 'recomendada' ? 'var(--amber)' : 'var(--green)';

  return `<section class="card card-pad dct-res-rec" style="--urg:${urgencia}" aria-labelledby="dctResRec">
    <div class="dct-res-rec__cuerpo">
      <div>
        <h2 id="dctResRec" class="dct-res-h">Recomendación comercial</h2>
        <p class="dct-res-rec__servicio">${esc(rec.servicio || '—')}</p>
        <p class="dct-res-rec__accion"><strong>Próxima acción:</strong> ${esc(rec.proximaAccion || '—')}</p>
      </div>
      <div class="dct-precio">
        <span class="dct-precio__l">Precio inicial sugerido</span>
        <span class="dct-precio__v">${p.uf != null ? `desde ${esc(uf(p.uf))}` : esc(p.etiqueta || 'Sujeto a revisión')}</span>
        <span class="dct-precio__m">${esc(p.motivo || '')}</span>
      </div>
    </div>
    <p class="dct-precio__aclaracion">${esc(p.aclaracion || '')}</p>
    <div class="dct-res-rec__ctas">
      <button class="btn btn-primary" data-dct="solicitar-sebastian" ${puedeEditar ? '' : 'disabled'}>
        ${i('handshake', 16)} ${esc(rec.ctaPrincipal || 'Solicitar evaluación con Sebastián')}
      </button>
      <button class="btn btn-ghost" data-dct="informe-actual">
        ${i('fileText', 16)} ${esc(rec.ctaSecundario || 'Generar informe preliminar')}
      </button>
    </div>
  </section>`;
}

function _acciones(d, puedeEditar, guardado) {
  const siguientes = transicionesDe(d.estado || 'completado');
  return `<section class="card card-pad dct-res-acciones" aria-labelledby="dctResAcc">
    <h2 id="dctResAcc" class="dct-res-h">Acciones</h2>
    <div class="dct-acc-grid">
      ${puedeEditar ? `<button class="btn btn-navy" data-dct="guardar-crm">${i('download', 15)} ${guardado ? 'Actualizar en el CRM' : 'Guardar en el CRM'}</button>` : ''}
      ${puedeEditar ? `<button class="btn btn-ghost" data-dct="asociar-empresa">${i('building', 15)} ${d.leadId || d.clienteId ? 'Cambiar empresa asociada' : 'Asociar a una empresa'}</button>` : ''}
      ${puedeEditar ? `<button class="btn btn-ghost" data-dct="crear-oportunidad" ${d.oportunidadLeadId ? 'disabled' : ''}>
        ${i('trending', 15)} ${d.oportunidadLeadId ? 'Oportunidad ya creada' : 'Crear oportunidad comercial'}</button>` : ''}
      ${puedeEditar ? `<button class="btn btn-ghost" data-dct="programar-seguimiento">${i('calClock', 15)} ${d.citaId ? 'Reprogramar seguimiento' : 'Programar seguimiento'}</button>` : ''}
      ${puedeEditar ? `<button class="btn btn-ghost" data-dct="editar-respuestas">${i('pencil', 15)} Editar respuestas</button>` : ''}
      <button class="btn btn-ghost" data-dct="imprimir">${i('fileCheck', 15)} Imprimir</button>
      <button class="btn btn-ghost" data-dct="exportar">${i('download', 15)} Exportar resumen</button>
    </div>

    ${puedeEditar && siguientes.length ? `<div class="dct-estado-row">
      <span class="dct-estado-row__l">Estado comercial</span>
      <div class="dct-estado-row__btns">
        ${siguientes.map((s) => {
          const meta = ESTADOS.find((e) => e.v === s);
          return `<button class="btn btn-ghost btn-sm" data-dct="estado" data-estado="${esc(s)}" title="${esc(meta?.sub || '')}">
            ${esc(estadoLabel(s))}</button>`;
        }).join('')}
      </div>
    </div>` : ''}
  </section>`;
}

function _historial(items) {
  const TIPO = {
    creada: 'Creada', guardada: 'Guardada', completada: 'Cuestionario cerrado',
    estado: 'Cambio de estado', informe: 'Informe generado', oportunidad: 'Oportunidad creada',
    seguimiento: 'Seguimiento agendado', duplicada: 'Duplicada', archivada: 'Archivada', nota: 'Nota',
  };
  return `<section class="card card-pad dct-res-hist" aria-labelledby="dctResHist">
    <h2 id="dctResHist" class="dct-res-h">Historial</h2>
    <ul class="dct-timeline">
      ${items.map((a) => `<li class="dct-timeline__i">
        <span class="dct-timeline__t">${esc(TIPO[a.tipo] || a.tipo)}</span>
        ${a.detalle ? `<span class="dct-timeline__d">${esc(a.detalle)}</span>` : ''}
        <span class="dct-timeline__f">${esc(_fechaCorta(a.createdAt))}</span>
      </li>`).join('')}
    </ul>
  </section>`;
}

function _fechaCorta(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
}
