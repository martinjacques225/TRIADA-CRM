# 🖼️ Guía para generar las imágenes del Simulador de Remodelación

> Objetivo: **más espacios y más estilos** para `demos/remodela/`. Como Masonry se quedó sin
> créditos, estas imágenes se generan con **otra IA de imágenes** y se dejan en la carpeta indicada.
> Cuando estén, se agregan al `SPACES` del `index.html` (yo lo hago, o la sesión aparte que ya corre).

---

## 0. ⚠️ Lo más importante (para que el comparador antes/después funcione)

El simulador superpone la foto **"antes"** y la **"después"** y las corta con un slider. Por eso
**las dos fotos de un mismo espacio DEBEN tener exactamente el mismo encuadre** (misma cámara, misma
ventana/puerta, misma perspectiva). La única forma segura de lograrlo:

1. **Genera 1 sola foto "antes"** del espacio (texto→imagen).
2. **Cada "después" se hace EDITANDO esa misma foto "antes"** (imagen→imagen / *edit* / *inpainting*),
   pidiéndole que **conserve el ángulo de cámara, la ventana/puerta y la distribución**, y **cambie solo
   las terminaciones, el mobiliario y el estilo**. **NO** generes el "después" desde cero.

**IAs que sirven (tienen modo editar / imagen a imagen):** ChatGPT (subes la imagen y pides el cambio) ·
Google Gemini / Nano Banana · Adobe Firefly (*Relleno generativo*) · FLUX Kontext (fal.ai, Krea) ·
Leonardo.ai · Midjourney (con imagen de referencia + *editor*). Cualquiera que te deje **subir una foto y
editarla** conservando la composición.

**Estilo de cámara (pégalo en todos los prompts):**
`photorealistic interior real-estate photo, wide-angle lens, eye-level, straight-on composition, no people, natural daylight, 3:2 aspect ratio landscape`

---

## 1. Formato, medidas, nombres y dónde guardarlas

| Cosa | Especificación |
|---|---|
| **Proporción** | **3:2 horizontal** (landscape). Es lo más importante del formato. |
| **Tamaño** | Mínimo **1200 px de ancho**. Ideal **1344×896**, **1500×1000** o **1536×1024**. Más grande también sirve (yo optimizo). |
| **Formato de archivo** | **JPG** de preferencia. Si tu IA solo entrega **PNG**, no importa — yo lo convierto a JPG. |
| **Peso** | No te preocupes: yo dejo cada una en ~150 KB (JPG calidad 82). |
| **Carpeta donde dejarlas** | `C:\Users\velve\Documents\GitHub\TRIADA-CRM\demos\remodela\img\` |
| **Nombres de archivo** | **Exactos** como la columna "Archivo": minúsculas, sin tildes ni espacios, con guiones. |

> Cuando las tengas en esa carpeta, **avísame** y las agrego al simulador (SPACES) + optimizo + verifico +
> despliego. (O la tarea/sesión aparte que ya está corriendo puede hacerlo.)

**Criterios de aprobación generales (aplican a TODAS):**
- ✅ Parece **foto real** (no dibujo, no render 3D obvio, no caricatura).
- ✅ **3:2 horizontal**, **sin personas**, **sin texto ni marcas de agua**.
- ✅ Sin objetos deformes ni artefactos raros (muebles chuecos, cosas derritiéndose, etc.).
- ✅ **(SÓLO "después")** **Mismo encuadre que su "antes"**: la ventana/puerta y la perspectiva quedan en
  la misma posición. **Si el encuadre cambió, se rechaza** (el slider se vería mal).

---

## 2. 🅰️ Local comercial — ✅ ya tienes el "antes" (`local-antes.jpg`)

Edita **`local-antes.jpg`** (un local vacío y datado con puerta de vidrio a la calle a la derecha) para
crear los dos "después". **No** regeneres el antes salvo que quieras (su prompt está al final).

| Archivo | Prompt (editar sobre `local-antes.jpg`) | Criterio de aprobación |
|---|---|---|
| `local-cafe.jpg` | *Edit this exact empty storefront into a warm specialty **coffee shop**, keeping the same camera angle and the same glass street door/window on the right with the street visible outside, same floor plan and proportions. Add a wood-and-tile coffee counter with a professional espresso machine along the left wall, warm pendant lights and Edison bulbs, wood shelving with mugs and bags of coffee beans, a chalkboard menu, two or three small round café tables with chairs, potted and hanging plants, warm polished concrete floor, cozy artisan atmosphere, warm golden lighting.* | Se ve **claramente una cafetería** (barra + máquina de café + mesas). Misma puerta/calle a la derecha que el antes. Ambiente cálido y acogedor, claramente mejor que el antes. |
| `local-boutique.jpg` | *Edit this exact empty storefront into a chic modern retail **clothing boutique**, keeping the same camera angle and the same glass street door/window on the right with the street visible outside, same floor plan and proportions. Add clean white walls with warm-oak display shelving and a clothing rail with neatly folded garments and accessories along the left wall, a minimalist checkout counter, elegant track and accent lighting, a full-length mirror, a couple of plants, light polished wood floor, bright premium boutique atmosphere.* | Se ve **claramente una tienda de ropa** (repisas + ropa + mostrador + espejo). Mismo encuadre/puerta que el antes. Look premium y luminoso. |

---

## 3. 🍳 Cocina — genera antes + 3 estilos

Primero genera **`cocina-antes.jpg`**, luego **edítala** para los 3 estilos.

| Archivo | Prompt | Criterio de aprobación |
|---|---|---|
| `cocina-antes.jpg` *(genera)* | *Photorealistic real-estate "before renovation" photo of a dated, worn small Chilean apartment **kitchen**. Old chipped melamine cabinets in a faded wood tone, cracked ceramic countertop, worn checkerboard vinyl floor, an old white gas stove, a small window above the sink with a dull view, greasy tiled backsplash, a bare hanging bulb, cluttered and tired.* + estilo de cámara | Cocina **datada pero creíble** (no una ruina). Se distingue la **ventana sobre el lavaplatos** (referencia para los después). 3:2, sin personas. |
| `cocina-moderno.jpg` *(editar)* | *Edit this exact kitchen into a **modern contemporary** style, keeping the same camera angle, the same window above the sink, same layout and proportions. Sleek handleless matte-white cabinets, light quartz countertop, light oak or white porcelain floor, stainless-steel appliances, a slab or subway-tile backsplash, under-cabinet LED lighting, minimalist, bright and airy.* | Mismo encuadre/ventana que el antes. Estilo **moderno** nítido (blanco, líneas limpias). |
| `cocina-nordico.jpg` *(editar)* | *Edit this exact kitchen into a warm **Scandinavian / Nordic** style, keeping the same camera angle, same window and layout. Soft white and pale-birch cabinets, light wood countertop, pale wood floor, open shelving with ceramics and plants, white subway tiles, warm brass handles, cozy bright daylight.* | Mismo encuadre. Estilo **nórdico** cálido (maderas claras, plantas). |
| `cocina-calido.jpg` *(editar)* | *Edit this exact kitchen into a warm **rustic-contemporary** style, keeping the same camera angle, same window and layout. Warm wood cabinets, a butcher-block or warm-stone countertop, terracotta or handmade-tile backsplash, matte-black fixtures, medium-tone wood floor, plants and warm pendant lighting, inviting and cozy.* | Mismo encuadre. Estilo **cálido/rústico** (madera, terracota, negro mate). |

---

## 4. 🛏️ Dormitorio — genera antes + 3 estilos

| Archivo | Prompt | Criterio de aprobación |
|---|---|---|
| `dormitorio-antes.jpg` *(genera)* | *Photorealistic real-estate "before renovation" photo of a dated, worn Chilean **bedroom**. Scuffed beige walls, old worn laminate floor, a tired metal-frame bed with a mismatched old duvet, a bulky old wardrobe, faded curtains over a single window, a bare bulb, cluttered and dim.* + estilo de cámara | Dormitorio **datado pero creíble**. Se distingue la **ventana** (referencia). 3:2, sin personas. |
| `dormitorio-moderno.jpg` *(editar)* | *Edit this exact bedroom into a **modern contemporary** style, keeping the same camera angle, same window and layout. Clean white and soft-grey walls, an upholstered low platform bed with crisp neutral linens, a floating nightstand, light oak floor, sheer curtains, recessed and pendant lighting, a few plants, minimalist and serene.* | Mismo encuadre/ventana. Estilo **moderno** sereno. |
| `dormitorio-nordico.jpg` *(editar)* | *Edit this exact bedroom into a warm **Scandinavian / Nordic** style, keeping the same camera angle, same window and layout. Soft white walls, pale wood floor, a cozy wood-frame bed with layered beige linen and a knit throw, light wood furniture, woven textures and plants, warm soft daylight, hygge feel.* | Mismo encuadre. Estilo **nórdico** acogedor. |
| `dormitorio-calido.jpg` *(editar)* | *Edit this exact bedroom into a warm, cozy **premium** style, keeping the same camera angle, same window and layout. Warm off-white walls with a soft terracotta or deep-green accent wall, medium wood floor, an upholstered bed with warm textiles, a rattan or wood nightstand, brass lamps, warm ambient lighting, boutique-hotel feel.* | Mismo encuadre. Estilo **cálido premium** (muro de acento, latón). |

---

## 5. 💼 Oficina *(opcional)* — genera antes + 3 estilos

| Archivo | Prompt | Criterio de aprobación |
|---|---|---|
| `oficina-antes.jpg` *(genera)* | *Photorealistic "before renovation" photo of a dated, worn small **office** room. Scuffed grey-beige walls, stained old grey carpet tiles, a bulky old melamine desk, mismatched old office chairs, a bulky CRT-era monitor, tangled cables, a fluorescent ceiling light, a window with old vertical blinds, cluttered and dull.* + estilo de cámara | Oficina **datada pero creíble**. Se distingue la **ventana**. 3:2, sin personas. |
| `oficina-moderno.jpg` *(editar)* | *Edit this exact office into a **modern** workspace, keeping the same camera angle, same window and layout. Light-oak desks, ergonomic chairs, white walls with acoustic felt panels, light floor, plants, pendant and recessed lighting, slim monitors, clean and bright.* | Mismo encuadre. Estilo **moderno** de oficina. |
| `oficina-industrial.jpg` *(editar)* | *Edit this exact office into an **industrial** style, keeping the same camera angle, same window and layout. Exposed brick or micro-cement accent wall, black-framed glass partition, wood-and-black-steel desks, Edison-bulb pendants, polished concrete floor, plants.* | Mismo encuadre. Estilo **industrial** (ladrillo/acero negro). |
| `oficina-calido.jpg` *(editar)* | *Edit this exact office into a warm **collaborative** workspace, keeping the same camera angle, same window and layout. Warm wood surfaces, soft upholstered seating, warm textiles and rug, plenty of plants, warm ambient lighting, cozy and inviting.* | Mismo encuadre. Estilo **cálido/colaborativo**. |

---

## 6. 🛋️ Living — 2 estilos extra *(opcional)* — edita `living-antes.jpg` (ya existe)

| Archivo | Prompt (editar sobre `living-antes.jpg`) | Criterio de aprobación |
|---|---|---|
| `living-industrial.jpg` | *Edit this exact living room into an **industrial loft** style, keeping the same camera angle, the same window and layout. Exposed brick or micro-cement wall, black-steel and reclaimed-wood furniture, a leather sofa, Edison-bulb fixtures, polished concrete floor, metal shelving, plants.* | Mismo encuadre que el living-antes. Estilo **industrial** claro. |
| `living-minimalista.jpg` | *Edit this exact living room into an **ultra-minimalist** style, keeping the same camera angle, same window and layout. Pure white walls, a single low neutral sofa, almost no clutter, hidden storage, light micro-cement floor, one large plant, soft even light, serene and empty.* | Mismo encuadre. Estilo **minimalista** (blanco, casi vacío). |

---

## 7. Prompt del "antes" del local (por si lo quieres regenerar)

`local-antes.jpg` *(ya lo tienes; sólo por referencia):*
> *Photorealistic real-estate "before renovation" photo of a small, dated, empty Chilean commercial storefront interior. Bare scuffed walls with patchy old paint, worn cracked grey floor tiles, an exposed dangling fluorescent tube light, old surface wiring, a dusty metal roll-up shutter and a plain aluminium-framed glass door to the street on the right with sidewalk visible outside, empty and neglected, a couple of stray cardboard boxes, dim flat lighting.* + estilo de cámara

---

## 8. Prioridad sugerida (si no quieres hacer todas)

1. **Local comercial** (café + boutique) — ya tienes el antes, son solo 2 ediciones. *(Rápido y alto impacto: suma "negocio" al "hogar".)*
2. **Cocina** (antes + 3) — es lo que más quiere ver la gente al remodelar.
3. **Dormitorio** (antes + 3).
4. *(Opcional)* Oficina, y los 2 estilos extra del Living.

> Con solo **Local + Cocina** ya el simulador pasa de 1 a 3 espacios y se ve mucho más completo.
> Cada espacio nuevo = su "antes" + al menos 2–3 "después" con el **mismo encuadre**.
