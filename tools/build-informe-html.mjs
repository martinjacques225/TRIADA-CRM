// tools/build-informe-html.mjs
// Genera un HTML autocontenido del Informe Ejecutivo Tríada 360, listo para
// convertir a PDF con un navegador headless (Edge/Chrome --print-to-pdf).
//
// Uso:  node tools/build-informe-html.mjs [ruta-datos.json] [salida.html]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { computeInforme } from '../modules/informe-ejecutivo/informe.engine.js';
import { buildReportDoc } from '../modules/informe-ejecutivo/informe.view.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const dataPath = process.argv[2] ? resolve(process.argv[2]) : resolve(__dirname, 'informe-data.json');
const outPath  = process.argv[3] ? resolve(process.argv[3]) : resolve(__dirname, 'informe.standalone.html');

const { diag, prospecto, evaluador } = JSON.parse(readFileSync(dataPath, 'utf8'));
const rep = computeInforme(diag, prospecto, evaluador);
const doc = buildReportDoc(rep);
const css = readFileSync(resolve(root, 'modules/informe-ejecutivo/informe.css'), 'utf8');

const TOKENS = `
:root{
  --bg:#FBFBFD; --surface:#fff; --surface2:#F4F6FB; --surface3:#ECEEF5;
  --border:#ECEEF5; --text:#0B1020; --text2:#666d84; --text3:#9aa0b3;
  --primary:#028090; --navy:#1E2761; --green:#4FB286; --violet:#5B6BD6;
  --amber:#F0B429; --danger:#E0604F;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{background:#fff;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased;}
/* En PDF cada página es una hoja A4 independiente */
.report-doc{display:block;}
.report-page{
  width:210mm; min-height:297mm; height:297mm;
  margin:0; box-shadow:none; page-break-after:always; break-after:page;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.report-page:last-child{page-break-after:auto;break-after:auto;}
`;

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Ejecutivo Tríada 360 — ${rep.empresa}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
${TOKENS}
${css}
@page { size: A4; margin: 0; }
</style>
</head>
<body class="has-report-open">
<div class="informe-viewer">
  <div class="report-scroll">
    <div class="report-doc">${doc}</div>
  </div>
</div>
</body>
</html>`;

writeFileSync(outPath, html, 'utf8');
console.log('OK ->', outPath);
console.log('Código informe:', rep.codigo, '| Empresa:', rep.empresa, '| Índice:', rep.overall);
