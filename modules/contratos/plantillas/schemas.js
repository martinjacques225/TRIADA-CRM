// modules/contratos/plantillas/schemas.js
// Registro de plantillas de contrato del módulo Contratos: metadatos + esquema de
// formulario (grupos/campos) + reglas de derivación (fecha y montos). Lo consume
// modules/contratos/contratos.js. Se mantiene junto con las plantillas autocontenidas
// que genera _herramientas/vendor-contratos.py (mismo id ↔ mismo archivo).
//
// computed: cómo derivar los campos "fill" que NO se piden al usuario:
//   · dateInput: el input tipo date del que salen fecha_dia / fecha_mes / fecha_larga.
//   · money: { baseKey, ivaKeys, totalKeys, mirrorKeys } — del monto neto base se calcula
//     IVA (19%) y total; mirrorKeys son fills que muestran el mismo neto (subtotales).
// Tipos de campo: text · rut · email · tel · number · date · money · select (con opciones[]).

const RUT_MARTIN = '19.807.642-2'; // MARTÍN ALEJANDRO JACQUES VENEGAS (rep. del Asesor)

export const TEMPLATES = [
  {
    id: 'asesoria',
    nombre: 'Asesoría y Consultoría',
    desc: 'Acompañamiento en tecnología, ventas y finanzas. Obligación de medios.',
    file: 'contrato-asesoria.html',
    prefijo: 'TRD-ASE-',
    icon: 'handshake',
    computed: {
      dateInput: 'fecha',
      money: { baseKey: 'honorarios_neto', ivaKeys: ['iva_19'], totalKeys: ['total_pagar'], mirrorKeys: ['subtotal_neto'] },
    },
    grupos: [
      {
        id: 'cliente', titulo: 'Datos del cliente', abierto: true,
        campos: [
          { k: 'cliente_razon_social', label: 'Razón social o nombre', type: 'text', required: true, ph: 'Ej: Comercial Los Robles SpA' },
          { k: 'cliente_rut', label: 'RUT', type: 'rut', required: true, ph: '76.123.456-7' },
          { k: 'cliente_giro', label: 'Giro', type: 'text', ph: 'Ej: comercio al por menor' },
          { k: 'cliente_representante', label: 'Representante legal', type: 'text', required: true, ph: 'Nombre y apellido' },
          { k: 'cliente_representante_rut', label: 'RUT del representante', type: 'rut', required: true, ph: '12.345.678-9' },
          { k: 'cliente_domicilio', label: 'Domicilio', type: 'text', ph: 'Calle, número, comuna' },
          { k: 'cliente_correo', label: 'Correo', type: 'email', ph: 'correo@empresa.cl' },
          { k: 'cliente_telefono', label: 'Teléfono', type: 'tel', ph: '+56 9 ...' },
        ],
      },
      {
        id: 'documento', titulo: 'Datos del contrato', abierto: true,
        campos: [
          { k: 'correlativo', label: 'N.º de contrato', type: 'text', prefijo: 'TRD-ASE-', default: '', ph: 'auto al emitir', help: 'Al emitir se asigna automático por tu organización.' },
          { k: 'fecha', label: 'Fecha de firma', type: 'date' },
          { k: 'ciudad', label: 'Ciudad de suscripción', type: 'text', default: 'Talca' },
          { k: 'comuna', label: 'Comuna (jurisdicción)', type: 'text', default: 'Talca' },
          { k: 'modalidad', label: 'Modalidad', type: 'select', default: 'por proyecto', opciones: ['por proyecto', 'retainer mensual'] },
          { k: 'num_reuniones', label: 'N.º de reuniones por período', type: 'number', ph: 'Ej: 4' },
          { k: 'num_horas', label: 'Horas de dedicación por período', type: 'number', ph: 'Ej: 20' },
        ],
      },
      {
        id: 'montos', titulo: 'Honorarios', abierto: true,
        campos: [
          { k: 'honorarios_neto', label: 'Honorarios netos (CLP)', type: 'money', required: true, help: 'El IVA (19%) y el total se calculan solos.' },
          { k: 'anticipo_pct', label: 'Anticipo a la firma', type: 'text', default: '50%' },
          { k: 'pago_modo', label: 'Facturación del retainer', type: 'select', default: 'anticipado', opciones: ['anticipado', 'vencido'] },
          { k: 'plazo_pago_dias', label: 'Plazo de pago (días)', type: 'number', default: '5' },
        ],
      },
      {
        id: 'avanzado', titulo: 'Plazos y cláusulas', abierto: false,
        campos: [
          { k: 'respuesta_dias', label: 'Respuesta del cliente (días hábiles)', type: 'number', default: '3' },
          { k: 'confidencialidad_anios', label: 'Confidencialidad (años)', type: 'number', default: '2' },
          { k: 'no_solicitacion_meses', label: 'No captación de personal (meses)', type: 'number', default: '12' },
          { k: 'aviso_termino_dias', label: 'Aviso de término (días)', type: 'number', default: '30' },
          { k: 'subsanacion_dias', label: 'Subsanación por incumplimiento (días)', type: 'number', default: '10' },
        ],
      },
      {
        id: 'proveedor', titulo: 'Tríada (representante legal)', abierto: false,
        campos: [
          { k: 'proveedor_representante_rut', label: 'RUT de Martín Jacques', type: 'rut', default: RUT_MARTIN, help: 'Precargado. Firma como representante del Asesor.' },
        ],
      },
    ],
  },
  {
    "id": "sitio-web",
    "nombre": "Sitio Web",
    "desc": "Diseño y desarrollo de sitio web corporativo.",
    "file": "contrato-sitio-web.html",
    "prefijo": "TRD-WEB-",
    "icon": "panel",
    "computed": {
      "dateInput": "fecha",
      "money": null
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Datos del Cliente",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre",
            "type": "text",
            "required": true,
            "ph": "Ej: Comercial Los Robles SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT",
            "type": "rut",
            "ph": "76.123.456-7"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Ej: comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "ph": "Nombre completo"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle, número, ciudad"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "contacto@cliente.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 ..."
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-WEB-",
            "ph": "0000"
          },
          {
            "k": "fecha",
            "label": "Fecha",
            "type": "date",
            "help": "Deriva día, mes y fecha larga en el documento."
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (domicilio legal)",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "num_horas",
            "label": "Horas de capacitación",
            "type": "number",
            "default": "1",
            "help": "Capacitación funcional incluida (cláusula 2)."
          }
        ]
      },
      {
        "id": "montos",
        "titulo": "Precio y pago",
        "abierto": true,
        "campos": [
          {
            "k": "adicionales_neto",
            "label": "Adicionales según propuesta (CLP neto)",
            "type": "money",
            "ph": "$0 si no aplica",
            "help": "OJO: no recalcula el subtotal/IVA/total impresos ($490.000 / $93.100 / $583.100), que están fijos en la plantilla."
          },
          {
            "k": "plazo_pago_dias",
            "label": "Plazo de pago (días corridos)",
            "type": "number",
            "default": "5",
            "help": "Desde la emisión del documento tributario."
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Plazos y cláusulas (avanzado)",
        "abierto": false,
        "campos": [
          {
            "k": "plazo_ejecucion_semanas",
            "label": "Plazo de ejecución (semanas hábiles)",
            "type": "text",
            "default": "3 a 4",
            "help": "Es un rango textual, no un número."
          },
          {
            "k": "num_revisiones",
            "label": "Rondas de ajustes por etapa",
            "type": "number",
            "default": "2"
          },
          {
            "k": "respuesta_dias",
            "label": "Respuesta/aprobación del Cliente (días hábiles)",
            "type": "number",
            "default": "3"
          },
          {
            "k": "uat_revision_dias",
            "label": "Plazo de observación/aceptación (días hábiles)",
            "type": "number",
            "default": "5"
          },
          {
            "k": "garantia_dias",
            "label": "Garantía post-entrega (días corridos)",
            "type": "number",
            "default": "30"
          },
          {
            "k": "confidencialidad_anios",
            "label": "Confidencialidad (años tras el término)",
            "type": "number",
            "default": "2"
          },
          {
            "k": "subsanacion_dias",
            "label": "Subsanación de incumplimiento (días corridos)",
            "type": "number",
            "default": "10"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Prestador (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT representante Tríada (Martín Jacques)",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    "id": "landing",
    "nombre": "Landing Page",
    "desc": "Landing de campaña enfocada en conversión.",
    "file": "contrato-landing.html",
    "prefijo": "TRD-LAND-",
    "icon": "target",
    "computed": {
      "dateInput": "fecha",
      "money": null
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Datos del Cliente",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre",
            "type": "text",
            "required": true,
            "ph": "Comercial XYZ SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT",
            "type": "rut",
            "ph": "76.543.210-9"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante",
            "type": "text",
            "ph": "Nombre del representante"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle 123, Comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "cliente@correo.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 1234 5678"
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Datos del documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-LAND-",
            "ph": "0000"
          },
          {
            "k": "fecha",
            "label": "Fecha",
            "type": "date",
            "help": "Deriva el día y el mes de la portada y la fecha larga del cuerpo."
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna",
            "type": "text",
            "default": "Talca"
          }
        ]
      },
      {
        "id": "proyecto",
        "titulo": "Alcance y plazos del proyecto",
        "abierto": true,
        "campos": [
          {
            "k": "plazo_ejecucion_semanas",
            "label": "Plazo de ejecución (semanas hábiles)",
            "type": "text",
            "default": "1 a 2",
            "help": "Se cuenta desde el pago del anticipo y la entrega completa de contenidos y accesos."
          },
          {
            "k": "num_revisiones",
            "label": "Rondas de ajustes incluidas",
            "type": "number",
            "default": "2"
          }
        ]
      },
      {
        "id": "montos",
        "titulo": "Precio y pago",
        "abierto": true,
        "campos": [
          {
            "k": "adicionales_neto",
            "label": "Adicionales según propuesta (CLP neto)",
            "type": "money",
            "help": "Opcional. El precio base $290.000, el IVA y el total están FIJOS en la plantilla; este monto NO recalcula el total automáticamente."
          },
          {
            "k": "plazo_pago_dias",
            "label": "Plazo de pago (días corridos)",
            "type": "number",
            "default": "5"
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Plazos avanzados",
        "abierto": false,
        "campos": [
          {
            "k": "respuesta_dias",
            "label": "Plazo del Cliente para aprobar avances (días hábiles)",
            "type": "number",
            "default": "3"
          },
          {
            "k": "uat_revision_dias",
            "label": "Plazo para observar la entrega (días hábiles)",
            "type": "number",
            "default": "5"
          },
          {
            "k": "garantia_dias",
            "label": "Garantía post-entrega (días corridos)",
            "type": "number",
            "default": "30"
          },
          {
            "k": "confidencialidad_anios",
            "label": "Confidencialidad (años)",
            "type": "number",
            "default": "2"
          },
          {
            "k": "subsanacion_dias",
            "label": "Subsanación de incumplimiento (días corridos)",
            "type": "number",
            "default": "10"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Datos del Prestador (fijos)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT representante Tríada",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    "id": "app",
    "nombre": "Aplicación / App",
    "desc": "Desarrollo de aplicación o app a medida.",
    "file": "contrato-app.html",
    "prefijo": "TRD-APP-",
    "icon": "cpu",
    "computed": {
      "dateInput": "fecha",
      "money": {
        "baseKey": "honorarios_neto",
        "ivaKeys": [
          "iva_19"
        ],
        "totalKeys": [
          "total_pagar"
        ],
        "mirrorKeys": [
          "subtotal_neto"
        ]
      }
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Datos del Cliente",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre del Cliente",
            "type": "text",
            "required": true,
            "ph": "Empresa SpA / Nombre completo"
          },
          {
            "k": "cliente_rut",
            "label": "RUT del Cliente",
            "type": "rut",
            "required": true,
            "ph": "76.543.210-K"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Comercio, servicios, etc."
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal del Cliente",
            "type": "text",
            "ph": "Nombre completo"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle, número, comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "cliente@correo.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 ..."
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Datos del documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-APP-",
            "ph": "0000",
            "required": true
          },
          {
            "k": "fecha",
            "label": "Fecha del contrato",
            "type": "date",
            "required": true
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (jurisdicción)",
            "type": "text",
            "default": "Talca"
          }
        ]
      },
      {
        "id": "montos",
        "titulo": "Precio",
        "abierto": true,
        "campos": [
          {
            "k": "honorarios_neto",
            "label": "Valor del servicio (neto CLP)",
            "type": "money",
            "required": true,
            "ph": "1.500.000",
            "help": "Valor referencial desde $1.500.000 neto; el monto final se define tras el Diagnóstico 360 y la especificación. Los hitos se calculan 40% anticipo / 30% avance / 30% final sobre este neto."
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Plazos y condiciones",
        "abierto": false,
        "campos": [
          {
            "k": "plazo_pago_dias",
            "label": "Plazo de pago por hito (días corridos)",
            "type": "number",
            "default": "5"
          },
          {
            "k": "uat_revision_dias",
            "label": "Revisión de aceptación / UAT (días hábiles)",
            "type": "number",
            "default": "10"
          },
          {
            "k": "garantia_dias",
            "label": "Garantía post-aceptación (días corridos)",
            "type": "number",
            "default": "60"
          },
          {
            "k": "confidencialidad_anios",
            "label": "Confidencialidad (años tras el término)",
            "type": "number",
            "default": "2"
          },
          {
            "k": "subsanacion_dias",
            "label": "Subsanación de incumplimiento (días corridos)",
            "type": "number",
            "default": "10"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Datos del Prestador (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT representante Tríada (Martín Jacques)",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    "id": "arriendo-software",
    "nombre": "Arriendo de Software (SaaS)",
    "desc": "Arriendo y licencia de software por suscripción.",
    "file": "contrato-arriendo-software.html",
    "prefijo": "TRD-SAAS-",
    "icon": "layers",
    "computed": {
      "dateInput": "fecha",
      "money": {
        "baseKey": "canon_mensual",
        "ivaKeys": [],
        "mirrorKeys": [],
        "totalKeys": []
      }
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Datos del Cliente (Licenciatario)",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre del Cliente",
            "type": "text",
            "required": true,
            "ph": "Empresa Ejemplo SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT del Cliente",
            "type": "rut",
            "ph": "76.123.456-7"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "ph": "Nombre y apellido"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle 000, Comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "cliente@correo.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 0000 0000"
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-SAAS-",
            "ph": "0000",
            "required": true
          },
          {
            "k": "fecha",
            "label": "Fecha del contrato",
            "type": "date",
            "required": true,
            "help": "Deriva día, mes y la fecha larga del cuerpo."
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (domicilio/jurisdicción)",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "plan",
            "label": "Plan contratado",
            "type": "select",
            "opciones": [
              "Esencial",
              "Crecimiento",
              "Integral"
            ],
            "default": "Crecimiento"
          }
        ]
      },
      {
        "id": "montos",
        "titulo": "Económico y pago",
        "abierto": true,
        "campos": [
          {
            "k": "canon_mensual",
            "label": "Canon mensual (neto)",
            "type": "money",
            "required": true,
            "help": "Valor neto; el IVA se agrega cuando corresponda. Debe coincidir con el plan (Esencial $59.000 · Crecimiento $129.000 · Integral $249.000)."
          },
          {
            "k": "plazo_pago_dias",
            "label": "Plazo de pago (días corridos del inicio del periodo)",
            "type": "number",
            "default": "5"
          },
          {
            "k": "medio_pago",
            "label": "Medio de pago",
            "type": "select",
            "opciones": [
              "Transferencia electrónica",
              "Tarjeta de crédito/débito",
              "Efectivo"
            ],
            "default": "Transferencia electrónica"
          },
          {
            "k": "vigencia_meses",
            "label": "Periodo inicial (meses)",
            "type": "number",
            "default": "12"
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "SLA, plazos y cláusulas",
        "abierto": false,
        "campos": [
          {
            "k": "aviso_termino_dias",
            "label": "Aviso de no renovación (días corridos)",
            "type": "number",
            "default": "30"
          },
          {
            "k": "disponibilidad_pct",
            "label": "Disponibilidad objetivo (SLA)",
            "type": "text",
            "default": "99%"
          },
          {
            "k": "confidencialidad_anios",
            "label": "Confidencialidad (años tras el término)",
            "type": "number",
            "default": "2"
          },
          {
            "k": "limite_responsabilidad_meses",
            "label": "Límite de responsabilidad (meses de canon)",
            "type": "number",
            "default": "3"
          },
          {
            "k": "subsanacion_dias",
            "label": "Plazo de subsanación por incumplimiento (días)",
            "type": "number",
            "default": "10"
          },
          {
            "k": "portabilidad_dias",
            "label": "Portabilidad de datos tras término (días)",
            "type": "number",
            "default": "30"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Proveedor (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT del representante de Tríada",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    "id": "mantencion",
    "nombre": "Mantención (Plan Mensual)",
    "desc": "Plan mensual de soporte y mantención.",
    "file": "contrato-mantencion.html",
    "prefijo": "TRD-MANT-",
    "icon": "refresh",
    "computed": {
      "dateInput": "fecha",
      "money": {
        "baseKey": "canon_mensual",
        "ivaKeys": [],
        "totalKeys": [],
        "mirrorKeys": []
      }
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Cliente",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre",
            "type": "text",
            "ph": "Comercial XYZ SpA",
            "required": true
          },
          {
            "k": "cliente_rut",
            "label": "RUT",
            "type": "rut",
            "ph": "76.543.210-K",
            "required": true
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "ph": "Nombre y apellido"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle 000, comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "contacto@cliente.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 0000 0000"
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-MANT-",
            "ph": "0000"
          },
          {
            "k": "fecha",
            "label": "Fecha del contrato",
            "type": "date"
          },
          {
            "k": "ciudad",
            "label": "Ciudad de celebración",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (jurisdicción)",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "plan",
            "label": "Plan contratado",
            "type": "select",
            "opciones": [
              "Esencial",
              "Crecimiento",
              "Integral"
            ],
            "default": "Esencial"
          }
        ]
      },
      {
        "id": "montos",
        "titulo": "Canon y pago",
        "abierto": true,
        "campos": [
          {
            "k": "canon_mensual",
            "label": "Canon mensual (neto)",
            "type": "money",
            "help": "Debe coincidir con el plan: Esencial $59.000 · Crecimiento $129.000 · Integral $249.000."
          },
          {
            "k": "plazo_pago_dias",
            "label": "Pago anticipado dentro de (días del mes)",
            "type": "number",
            "default": "5"
          }
        ]
      },
      {
        "id": "servicio",
        "titulo": "Alcance y niveles de servicio",
        "abierto": false,
        "campos": [
          {
            "k": "bolsa_horas",
            "label": "Bolsa mensual de horas de soporte",
            "type": "number",
            "ph": "p. ej. 4"
          },
          {
            "k": "horario_atencion",
            "label": "Horario de atención",
            "type": "text",
            "default": "lunes a viernes, 9:00 a 18:00 h"
          },
          {
            "k": "sla_critico_horas",
            "label": "SLA prioridad crítica (horas hábiles)",
            "type": "number",
            "default": "4"
          },
          {
            "k": "sla_alto_horas",
            "label": "SLA prioridad alta (horas hábiles)",
            "type": "number",
            "default": "8"
          },
          {
            "k": "sla_normal_dias",
            "label": "SLA prioridad normal (días hábiles)",
            "type": "number",
            "default": "2"
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Cláusulas y plazos (avanzado)",
        "abierto": false,
        "campos": [
          {
            "k": "aviso_termino_dias",
            "label": "Aviso de término (días corridos)",
            "type": "number",
            "default": "30"
          },
          {
            "k": "confidencialidad_anios",
            "label": "Confidencialidad tras el término (años)",
            "type": "number",
            "default": "2"
          },
          {
            "k": "limite_responsabilidad_meses",
            "label": "Límite de responsabilidad (meses de canon)",
            "type": "number",
            "default": "3"
          },
          {
            "k": "suspension_aviso_dias",
            "label": "Aviso previo de suspensión por no pago (días corridos)",
            "type": "number",
            "default": "5"
          },
          {
            "k": "subsanacion_dias",
            "label": "Plazo de subsanación por incumplimiento (días corridos)",
            "type": "number",
            "default": "10"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Prestador (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT del representante de Tríada",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    "id": "marco-servicios",
    "nombre": "Marco de Servicios",
    "desc": "Contrato marco que rige órdenes de servicio sucesivas.",
    "file": "contrato-marco-servicios.html",
    "prefijo": "TRD-MARCO-",
    "icon": "columns",
    "computed": {
      "dateInput": "fecha",
      "money": null
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Datos del Cliente",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre",
            "type": "text",
            "required": true,
            "ph": "Comercial XYZ SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT",
            "type": "rut",
            "required": true,
            "ph": "76.123.456-7"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "ph": "Nombre y apellido"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle 123, comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "contacto@cliente.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 1234 5678"
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Datos del documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "N.º de contrato",
            "type": "text",
            "prefijo": "TRD-MARCO-",
            "ph": "0000",
            "help": "Solo el número; el prefijo TRD-MARCO- es fijo en la plantilla"
          },
          {
            "k": "fecha",
            "label": "Fecha del contrato",
            "type": "date",
            "required": true,
            "help": "Deriva día, mes y fecha larga en el documento"
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (jurisdicción)",
            "type": "text",
            "default": "Talca",
            "help": "Domicilio para efectos legales y competencia de tribunales"
          }
        ]
      },
      {
        "id": "plazos",
        "titulo": "Plazos y condiciones",
        "abierto": false,
        "campos": [
          {
            "k": "plazo_pago_dias",
            "label": "Días para pago",
            "type": "number",
            "default": "5",
            "help": "Días corridos desde la emisión del documento tributario"
          },
          {
            "k": "respuesta_dias",
            "label": "Días para responder aprobaciones",
            "type": "number",
            "default": "3",
            "help": "Días hábiles"
          },
          {
            "k": "garantia_dias",
            "label": "Días de garantía",
            "type": "number",
            "default": "30",
            "help": "Días corridos desde la entrega de cada entregable"
          },
          {
            "k": "aviso_termino_dias",
            "label": "Días de aviso de término",
            "type": "number",
            "default": "30",
            "help": "Preaviso para terminar el contrato marco sin causa"
          },
          {
            "k": "subsanacion_dias",
            "label": "Días para subsanar incumplimiento",
            "type": "number",
            "default": "10",
            "help": "Días corridos desde el requerimiento escrito"
          },
          {
            "k": "fuerza_mayor_dias",
            "label": "Días de fuerza mayor para terminar",
            "type": "number",
            "default": "30",
            "help": "Duración del evento tras la cual cualquiera puede terminar"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Prestador (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT del representante de Tríada",
            "type": "rut",
            "default": "19.807.642-2",
            "help": "RUT de Martín Jacques; aparece en comparecencia y firma"
          }
        ]
      }
    ]
  },
  {
    "id": "nda",
    "nombre": "Anexo de Confidencialidad (NDA)",
    "desc": "Anexo de confidencialidad para información sensible.",
    "file": "anexo-confidencialidad.html",
    "prefijo": "TRD-NDA-",
    "icon": "shield",
    "computed": {
      "dateInput": "fecha",
      "money": null
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Contraparte (Parte B)",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre",
            "type": "text",
            "required": true,
            "ph": "Ej: Comercial XYZ SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT",
            "type": "rut",
            "required": true,
            "ph": "76.543.210-K"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Ej: Comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "required": true,
            "ph": "Nombre completo"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle, número, comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "correo@empresa.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 ...."
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Documento",
        "abierto": true,
        "campos": [
          {
            "k": "correlativo",
            "label": "Correlativo",
            "type": "text",
            "prefijo": "TRD-NDA-",
            "ph": "0000",
            "required": true
          },
          {
            "k": "fecha",
            "label": "Fecha del acuerdo",
            "type": "date",
            "required": true,
            "help": "Deriva día, mes y fecha larga en el documento."
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          },
          {
            "k": "comuna",
            "label": "Comuna (jurisdicción)",
            "type": "text",
            "default": "Talca",
            "help": "Fija el domicilio y los tribunales competentes (cláusula 12)."
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Plazos",
        "abierto": false,
        "campos": [
          {
            "k": "confidencialidad_anios",
            "label": "Vigencia de la reserva (años)",
            "type": "number",
            "default": "3",
            "help": "Portada y cláusula 6 (Plazo); un solo valor para ambos."
          },
          {
            "k": "no_solicitacion_meses",
            "label": "No captación de personal (meses)",
            "type": "number",
            "default": "12",
            "help": "Cláusula 11; recíproca y opcional."
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Proveedor (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT del representante de Tríada",
            "type": "rut",
            "default": "19.807.642-2",
            "help": "Martín Jacques, Parte A."
          }
        ]
      }
    ]
  },
  {
    "id": "anexo-datos",
    "nombre": "Anexo de Tratamiento de Datos",
    "desc": "Anexo de datos personales (Ley 21.719 / 19.628).",
    "file": "anexo-datos-ley21719.html",
    "prefijo": "TRD-DAT-",
    "icon": "clipCheck",
    "computed": {
      "dateInput": "fecha",
      "money": null
    },
    "grupos": [
      {
        "id": "cliente",
        "titulo": "Responsable (Cliente)",
        "abierto": true,
        "campos": [
          {
            "k": "cliente_razon_social",
            "label": "Razón social / nombre del Cliente",
            "type": "text",
            "required": true,
            "ph": "Ej. Comercial XYZ SpA"
          },
          {
            "k": "cliente_rut",
            "label": "RUT del Cliente",
            "type": "rut",
            "required": true,
            "ph": "76.543.210-9"
          },
          {
            "k": "cliente_giro",
            "label": "Giro",
            "type": "text",
            "ph": "Ej. comercio al por menor"
          },
          {
            "k": "cliente_representante",
            "label": "Representante legal",
            "type": "text",
            "ph": "Nombre completo"
          },
          {
            "k": "cliente_representante_rut",
            "label": "RUT del representante",
            "type": "rut",
            "ph": "12.345.678-9"
          },
          {
            "k": "cliente_domicilio",
            "label": "Domicilio",
            "type": "text",
            "ph": "Calle, número, comuna"
          },
          {
            "k": "cliente_correo",
            "label": "Correo",
            "type": "email",
            "ph": "contacto@cliente.cl"
          },
          {
            "k": "cliente_telefono",
            "label": "Teléfono",
            "type": "tel",
            "ph": "+56 9 ..."
          }
        ]
      },
      {
        "id": "documento",
        "titulo": "Documento",
        "abierto": true,
        "campos": [
          {
            "k": "contrato_principal_ref",
            "label": "Contrato principal N.º",
            "type": "text",
            "prefijo": "TRD-",
            "ph": "ASE-0001",
            "help": "Número del contrato principal al que accede este anexo (el año 2026 va fijo en la plantilla)"
          },
          {
            "k": "fecha",
            "label": "Fecha",
            "type": "date",
            "help": "Deriva día y mes de portada y la fecha larga del cuerpo; el año está fijo en 2026 en la plantilla"
          },
          {
            "k": "ciudad",
            "label": "Ciudad",
            "type": "text",
            "default": "Talca"
          }
        ]
      },
      {
        "id": "datos",
        "titulo": "Tratamiento de datos (Ley 21.719)",
        "abierto": true,
        "campos": [
          {
            "k": "objeto_tratamiento",
            "label": "Objeto / servicios del tratamiento",
            "type": "text",
            "default": "Desarrollo y mantención de sitio web / implementación y operación de CRM / soporte",
            "help": "Servicios en cuyo marco se tratan los datos personales"
          },
          {
            "k": "dato_finalidad_1",
            "label": "Finalidad — datos de contacto de clientes",
            "type": "text",
            "default": "Gestión comercial / soporte"
          },
          {
            "k": "dato_finalidad_2",
            "label": "Finalidad — datos de contacto de trabajadores",
            "type": "text",
            "default": "Operación / accesos"
          },
          {
            "k": "brecha_notif_horas",
            "label": "Plazo de notificación de brechas (horas)",
            "type": "number",
            "default": "48",
            "help": "VALIDAR con asesoría legal el plazo que exige la Ley 21.719 / su reglamento"
          },
          {
            "k": "transferencia_internacional",
            "label": "Transferencia internacional / hosting",
            "type": "text",
            "default": "Tratamiento en Chile",
            "help": "Indicar país/proveedor si el alojamiento está fuera de Chile"
          }
        ]
      },
      {
        "id": "subencargados",
        "titulo": "Subencargados",
        "abierto": false,
        "campos": [
          {
            "k": "subencargado_1",
            "label": "Subencargado 1",
            "type": "text",
            "default": "Supabase",
            "ph": "Proveedor de hosting / BD"
          },
          {
            "k": "subencargado_1_detalle",
            "label": "Subencargado 1 — servicio / ubicación",
            "type": "text",
            "default": "Base de datos y hosting",
            "ph": "Servicio prestado / ubicación"
          },
          {
            "k": "subencargado_2",
            "label": "Subencargado 2 (opcional)",
            "type": "text",
            "ph": "Otro proveedor"
          },
          {
            "k": "subencargado_2_detalle",
            "label": "Subencargado 2 — servicio / ubicación",
            "type": "text",
            "ph": "Servicio prestado / ubicación"
          }
        ]
      },
      {
        "id": "avanzado",
        "titulo": "Categorías adicionales de datos",
        "abierto": false,
        "campos": [
          {
            "k": "dato_categoria_3",
            "label": "Categoría de datos (fila 3)",
            "type": "text",
            "ph": "Ej. datos de facturación"
          },
          {
            "k": "dato_finalidad_3",
            "label": "Finalidad (fila 3)",
            "type": "text"
          },
          {
            "k": "dato_titular_3",
            "label": "Titulares (fila 3)",
            "type": "text"
          },
          {
            "k": "dato_categoria_4",
            "label": "Categoría de datos (fila 4)",
            "type": "text"
          },
          {
            "k": "dato_finalidad_4",
            "label": "Finalidad (fila 4)",
            "type": "text"
          },
          {
            "k": "dato_titular_4",
            "label": "Titulares (fila 4)",
            "type": "text"
          }
        ]
      },
      {
        "id": "proveedor",
        "titulo": "Proveedor (Tríada)",
        "abierto": false,
        "campos": [
          {
            "k": "proveedor_representante_rut",
            "label": "RUT representante Tríada",
            "type": "rut",
            "default": "19.807.642-2"
          }
        ]
      }
    ]
  },
  {
    id: 'impulsa',
    nombre: 'Adhesión — Programa Impulsa Pyme',
    desc: 'Adhesión al programa Impulsa Pyme (6 meses, precio fijo $300.000 neto).',
    file: 'contrato-impulsa-adhesion.html',
    prefijo: 'TRD-IMP-',
    icon: 'rocket',
    computed: { dateInput: 'fecha', money: null },
    grupos: [
      { id: 'cliente', titulo: 'Datos del beneficiario', abierto: true, campos: [
        { k: 'cliente_razon_social', label: 'Razón social o nombre', type: 'text', required: true, ph: 'Ej: Panadería San José EIRL' },
        { k: 'cliente_rut', label: 'RUT', type: 'rut', required: true, ph: '76.123.456-7' },
        { k: 'cliente_giro', label: 'Giro', type: 'text', ph: 'Ej: panadería' },
        { k: 'cliente_representante', label: 'Representante legal', type: 'text', required: true },
        { k: 'cliente_representante_rut', label: 'RUT del representante', type: 'rut', required: true },
        { k: 'cliente_domicilio', label: 'Domicilio', type: 'text' },
        { k: 'cliente_correo', label: 'Correo', type: 'email' },
        { k: 'cliente_telefono', label: 'Teléfono', type: 'tel' },
      ] },
      { id: 'documento', titulo: 'Datos del contrato', abierto: true, campos: [
        { k: 'correlativo', label: 'N.º de contrato', type: 'text', prefijo: 'TRD-IMP-', default: '', ph: 'auto al emitir' },
        { k: 'fecha', label: 'Fecha de firma', type: 'date' },
        { k: 'ciudad', label: 'Ciudad de suscripción (Región del Maule)', type: 'text', default: 'Talca' },
        { k: 'cohorte', label: 'Cohorte', type: 'select', default: '1', opciones: ['1', '2'] },
      ] },
      { id: 'programa', titulo: 'Programa', abierto: true, campos: [
        { k: 'fecha_inicio_programa', label: 'Inicio del programa', type: 'text', ph: 'Ej: 1 de agosto de 2026', help: 'Los 6 meses corren desde esta fecha.' },
        { k: 'dominio_asignado', label: 'Dominio .cl del beneficiario', type: 'text', ph: 'minegocio.cl' },
        { k: 'medio_pago', label: 'Medio de pago', type: 'text', default: 'transferencia electrónica' },
        { k: 'plazo_pago_dias', label: 'Plazo de pago (días)', type: 'number', default: '5' },
      ] },
      { id: 'avanzado', titulo: 'Cláusulas', abierto: false, campos: [
        { k: 'subsanacion_dias', label: 'Subsanación por incumplimiento (días)', type: 'number', default: '10' },
        { k: 'portabilidad_dias', label: 'Plazo de portabilidad al término (días)', type: 'number', default: '15' },
      ] },
      { id: 'proveedor', titulo: 'Tríada (representante legal)', abierto: false, campos: [
        { k: 'proveedor_representante_rut', label: 'RUT de Martín Jacques', type: 'rut', default: '19.807.642-2', help: 'Precargado.' },
      ] },
    ],
  },
];
