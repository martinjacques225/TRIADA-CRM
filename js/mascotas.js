// js/mascotas.js — Catálogo de mascotas/asistentes y sus mensajes motivacionales
// NOTA: en la futura migración pasa a tabla `mascotas` (catálogo) + selección en perfil de usuario.

export const MASCOTAS = [
  {
    id: 'aria', nombre: 'ARIA', img: 'mascot-aria.png', color: '#8B5CF6', emoji: '💜',
    msgs: {
      bienvenida:      ['Sistemas en línea. ARIA conectada. Escaneando pipeline... 📊', 'Análisis completado. Oportunidades detectadas. ¡Vamos! ⚡', 'ARIA v3.1 activa. Protocolo de ventas iniciado. Eficiencia máxima. 💜'],
      venta:           ['Venta procesada. Comisión acumulada. Eficiencia en alza. 📈', 'Registro confirmado. Tu conversión mejora estadísticamente. 💜', 'Excelente ejecución. El sistema registra otro éxito. ⚡'],
      medalla:         ['Logro desbloqueado. Métricas en rango de élite. 🏆', 'Medalla adquirida. Rendimiento superior detectado. 💜', 'Achievement unlocked. Protocolo de celebración activado. ⚡'],
      meta:            ['Faltan pocas unidades. Calcula el siguiente movimiento. 📊', 'Optimiza agenda. Más contactos = más cierres. 💜', 'Datos sugieren: mantén el ritmo y superas la meta. ⚡'],
      llamada:         ['Llamada registrada en el sistema. ✅', 'Actividad de contacto procesada. Buen trabajo. 📞', 'Registro completado. Cada interacción suma a tus métricas. 💜'],
      lead_cargado:    ['Nuevo prospecto en el pipeline. Analiza el perfil antes de contactar. 📊', 'Lead detectado. Protocolo de seguimiento sugerido. 💜', 'Datos de prospecto cargados. Sistema listo para el siguiente paso. ⚡'],
      cita_agendada:   ['Cita agendada. Configura recordatorio. 📅', 'Reunión programada. Prepara el briefing con anticipación. 💜', 'Cita registrada en sistema. Bloqueo de agenda confirmado. ⚡'],
      cita_proxima:    ['Alerta: reunión en los próximos minutos. Prepárate. ⏰', 'Cita inminente detectada. Asegura conexión estable. 💜', '⚡ Reunión próxima. Todos los sistemas listos.'],
      cita_perdida:    ['No asistió. Activar protocolo de recuperación. 📵', 'Cliente ausente. Reagenda en las próximas 24h. 💜', 'Cita perdida. Genera seguimiento inmediato. ⚡'],
      cita_vencida:    ['Cita vencida sin resultado. Actualiza el estado del lead. 📊', 'Registro pendiente de cierre. Completa el seguimiento. 💜', 'Dato sin actualizar. Mantén el CRM limpio. ⚡'],
      record:          ['¡Nuevo récord detectado! Métricas históricas superadas. 🚀', 'Performance superior a tu mejor marca. Excelente. 💜', 'Record personal roto. El sistema no para, ni tú tampoco. ⚡🏆'],
      faltan_pocas:    ['A pocas ventas del objetivo. Intensifica el contacto. 📊', 'El dato dice: faltan muy pocas para la meta. ¡Ejecuta! 💜', 'Estadística favorable. Un empuje más y llegas. ⚡'],
      rendimiento_bajo:['Métricas por debajo del promedio. Revisa estrategia. 📉', 'Alerta de rendimiento. ¿Ajustamos el plan de acción? 💜', 'Señal de bajo flujo detectada. Tiempo de reactivar el pipeline. ⚡'],
      regreso:         ['Sistema re-iniciado. Bienvenido de vuelta. Hay mucho por hacer. 💜', 'Reactivando protocolos. Es momento de recuperar el terreno. ⚡', 'ARIA detectó tu ausencia. Ahora detecta tu retorno. Vamos. 📊'],
      jornada_exitosa: ['Jornada con resultados positivos. Métricas saludables. 🌟', 'Cierre del día: rendimiento por encima del promedio. 💜', 'Jornada analizada: éxito. Mañana replicamos. ⚡📊'],
      ver_agenda:      ['Escaneando agenda del día. Preparando cronograma óptimo. 📅', 'Citas del día en pantalla. Ordena por prioridad antes de salir. 📊', 'Protocolo matutino: revisar agenda, confirmar citas, ejecutar. ⚡'],
      ver_leads:       ['Pipeline abierto. Prioriza los leads más calientes. 📊', 'ARIA sugiere: contacta primero los leads con más de 72h sin actividad. ⚡', 'Leads cargados. Filtra por temperatura antes de iniciar contacto. 💜'],
      ver_dashboard:   ['Analizando métricas... KPIs disponibles para revisión. 📊', 'Panel de control activo. Los números no mienten — escúchalos. 💜', 'Dashboard cargado. Identifica el cuello de botella y corrige. ⚡'],
      ver_ventas:      ['Registro de ventas actualizado. Calcula el delta vs. meta. 📊', 'Historial de cierres disponible. La tendencia dice todo. 💜', 'Vista de ventas activa. ¿Vas por la meta o ya la superaste? ⚡'],
      ver_config:      ['Configuración del sistema. Personaliza para máxima eficiencia. 💜', 'Parámetros del perfil. Un CRM bien configurado rinde más. 📊', 'Ajustando variables del sistema. Pequeños cambios, grandes resultados. ⚡'],
      tip_comercial:   ['Estadística: el 80% de ventas se cierra en el 5to contacto. ¿Ya llegaste? 📊', 'El prospecto que dice "lo pienso" tiene 72h de temperatura. Actúa ahora. ⚡', 'Tip ARIA: confirmar la cita 2h antes reduce inasistencias en un 40%. 💜', 'Dato clave: los leads respondidos en menos de 5 minutos cierran 3x más. 📊', 'Patrón detectado: el mejor horario de llamada es entre 10-11am y 4-6pm. ⚡'],
      sin_resultados:  ['Sin registros que coincidan. Ajusta los filtros. 📊', 'Búsqueda sin resultados. El dato puede estar en otro rango. 💜', 'ARIA no encuentra coincidencias. Revisa los parámetros de búsqueda. ⚡']
    }
  },
  {
    id: 'titan', nombre: 'TITAN', img: 'mascot-titan.png', color: '#DC2626', emoji: '⚔️',
    msgs: {
      bienvenida:      ['¡LEVÁNTATE! ¡HOY ES DÍA DE CONQUISTA! 💪', '¡Los campeones no descansan, ATACAN! ¡A la cancha! 🏆', '¡TITAN contigo! ¡Hoy no hay derrota posible! ⚔️'],
      venta:           ['¡ESO ES! ¡CAMPEÓN APLASTA OTRO OBJETIVO! 🏆', '¡VICTORIA! ¡Nadie te para! ¡SIGUIENTE! 💪', '¡BRUTAL! ¡Eso se llama dominar el mercado! 🔥'],
      medalla:         ['¡¡¡MEDALLA DE GUERRERO!!! ¡TE LA GANASTE EN BATALLA! 🏆', '¡EL CINTURÓN ES TUYO! ¡NADIE TE LO QUITA! ⚔️', '¡LEYENDA! ¡HOY ENTRASTE AL OLIMPO DE LAS VENTAS! 💪'],
      meta:            ['¡NO TE DETENGAS! ¡ESTÁS A UN PASO! 💪🔥', '¡LOS CAMPEONES NO CALCULAN, ATACAN! ¡VE POR ESA VENTA! ⚔️', '¡FALTA POCO! ¡EMPUJA! ¡LOS GUERREROS NO SE RINDEN! 🏆'],
      llamada:         ['¡BIEN! ¡CADA LLAMADA ES UN GOLPE AL MERCADO! 📞', '¡LLAMA! ¡LLAMA! ¡EL DINERO NO LLEGA SOLO! 💪', '¡ASESOR EN CAMPO DE BATALLA! ¡SIGUE MARCANDO! 🔥'],
      lead_cargado:    ['¡NUEVO OBJETIVO EN EL RADAR! ¡ATÁCALO! ⚔️', '¡PROSPECTO A LA VISTA! ¡LOS CAMPEONES NO DEJAN ESCAPAR! 💪', '¡LEAD CARGADO! ¡CONTACTA INMEDIATAMENTE! 🔥'],
      cita_agendada:   ['¡CITA AGENDADA! ¡PREPARA TU MEJOR PRESENTACIÓN! 🏆', '¡REUNIÓN CONFIRMADA! ¡VAS A CERRAR ESA VENTA! ⚔️', '¡ESO ES ACTUAR COMO CAMPEÓN! ¡A PREPARARSE! 💪'],
      cita_proxima:    ['¡PREPÁRATE! ¡LA BATALLA EMPIEZA EN MINUTOS! ⚔️', '¡ALERTA DE REUNIÓN! ¡LOS CAMPEONES LLEGAN LISTOS! 🏆', '¡ATENCIÓN! ¡TU PRÓXIMA VICTORIA ESTÁ A MINUTOS! 💪'],
      cita_perdida:    ['¡RECUPERA ESE LEAD! ¡LOS GUERREROS NO DEJAN CAER PRISIONEROS! ⚔️', '¡REACCIONA! ¡REAGENDA HOY MISMO! ¡LOS CAMPEONES PERSISTEN! 💪', '¡EL JUEGO NO TERMINÓ! ¡VUELVE A LA CARGA! 🔥'],
      cita_vencida:    ['¡PENDIENTE SIN RESOLVER! ¡LOS CAMPEONES TERMINAN LO QUE EMPIEZAN! ⚔️', '¡ACTUALIZA ESE LEAD! ¡LOS GUERREROS NO DEJAN RASTROS! 💪', '¡CIERRA O REAGENDA! ¡PERO ACTÚA! 🔥'],
      record:          ['¡¡¡NUEVO RÉCORD!!! ¡ERES EL REY DEL MERCADO! 🏆👑', '¡HISTORIA HECHA! ¡NADIE TE DETIENE! ⚔️', '¡IMPARABLE! ¡ASÍ SE HACE! ¡EL OLIMPO TE ESPERA! 💪🔥'],
      faltan_pocas:    ['¡A NADA! ¡EMPUJA! ¡LOS CAMPEONES NO PARAN CUANDO ESTÁN TAN CERCA! ⚔️', '¡UN ESFUERZO MÁS! ¡LA META ES TUYA! 💪', '¡FALTA POCO! ¡CONVIERTE COMO CAMPEÓN! 🔥🏆'],
      rendimiento_bajo:['¡REACCIONA! ¡LOS GUERREROS SE LEVANTAN! ⚔️', '¡EL MERCADO NO ESPERA! ¡INTENSIFICA EL ATAQUE! 💪', '¡BASTA DE EXCUSAS! ¡HOY LO RECUPERAMOS! 🔥'],
      regreso:         ['¡DE VUELTA AL CAMPO DE BATALLA! ¡YA ERA HORA! ⚔️', '¡EL CAMPEÓN REGRESA! ¡EL MERCADO LO SABE! 💪🏆', '¡BIENVENIDO DE VUELTA, GUERRERO! ¡A RECUPERAR LO PERDIDO! 🔥'],
      jornada_exitosa: ['¡JORNADA DE CAMPEÓN COMPLETADA! ¡ASÍ SE HACE! 🏆', '¡VICTORIA DEL DÍA! ¡MAÑANA VOLVEMOS MÁS FUERTES! ⚔️', '¡JORNADA EXITOSA! ¡LOS CAMPEONES DESCANSAN PARA VOLVER! 💪'],
      ver_agenda:      ['¡LA ARENA DEL DÍA! ¡CUÁNTAS BATALLAS HAY HOY! ⚔️', '¡AGENDA ABIERTA! ¡NINGUNA CITA PASA SIN CIERRE! 💪', '¡EL CAMPO DE BATALLA DEL DÍA ESTÁ AQUÍ! ¡PREPÁRATE! 🔥'],
      ver_leads:       ['¡LISTA DE OBJETIVOS! ¡NINGUNO ESCAPA ESTA SEMANA! ⚔️', '¡PROSPECTOS EN EL RADAR! ¡LOS CAMPEONES NO LOS DEJAN ENFRIAR! 💪', '¡ATACA ESA LISTA! ¡EL PRIMERO EN LLAMAR GANA! 🔥'],
      ver_dashboard:   ['¡EL MARCADOR DE LA GUERRA! ¿ESTÁS GANANDO O PERDIENDO? 🏆', '¡REVISA LOS NÚMEROS! ¡LOS CAMPEONES MIDEN SU BATALLA! ⚔️', '¡EL SCOREBOARD ES TUYO! ¡CÓMO VAN LAS VICTORIAS! 💪'],
      ver_ventas:      ['¡TUS VICTORIAS DOCUMENTADAS! ¡LA HISTORIA DE UN CAMPEÓN! 🏆', '¡CADA VENTA ES UNA MEDALLA! ¿CUÁNTAS LLEVAS HOY? ⚔️', '¡EL LIBRO DE CONQUISTAS! ¡AGREGA UNA MÁS HOY! 💪'],
      ver_config:      ['¡AFILA TUS ARMAS! ¡UN CAMPEÓN CALIBRA SU EQUIPO! ⚔️', '¡CONFIGURACIÓN = PREPARACIÓN! ¡EL GUERRERO LISTO GANA! 💪', '¡TUS HERRAMIENTAS LISTAS! ¡AHORA AL CAMPO! 🔥'],
      tip_comercial:   ['¡OYE! ¿CUÁNTOS LEADS TIENES SIN CONTACTAR? ¡NINGUNO DEBERÍA SOBREVIVIR EL DÍA! ⚔️', '¡LA SEGUNDA LLAMADA CIERRA MÁS QUE LA PRIMERA! ¡LLAMA DE NUEVO! 🔥', '¡EL VENDEDOR QUE LLAMA A LAS 8AM APLASTA AL QUE ESPERA! ¡MADRUGA! 💪', '¡CONFIRMA TUS CITAS! ¡UN RECORDATORIO HOY EVITA UN NO-SHOW MAÑANA! ⚔️', '¡EL QUE NO SIGUE, PIERDE! ¡FOLLOW-UP O MUERTE! 🏆'],
      sin_resultados:  ['¡NADA! ¡CAMBIA LA ESTRATEGIA! ¡LOS GUERREROS ADAPTAN! ⚔️', '¡SIN RESULTADOS NO ES DERROTA! ¡ES SEÑAL DE CAMBIAR EL ATAQUE! 💪', '¡VACÍO! ¡RECARGA Y BUSCA DIFERENTE! 🔥']
    }
  },
  {
    id: 'zen', nombre: 'ZEN', img: 'mascot-zen.png', color: '#0EA5E9', emoji: '🔵',
    msgs: {
      bienvenida:      ['Sistema iniciado. Procede con estrategia.', 'ZEN conectado. Claridad mental = ventas efectivas.', 'Bienvenido. Respira. Hoy con datos, no con impulso.'],
      venta:           ['Transacción registrada. Comisión acumulada correctamente.', 'Objetivo cumplido. Continúa el proceso.', 'Resultado positivo. El método funciona. Sigue.'],
      medalla:         ['Logro obtenido. La disciplina tiene recompensa.', 'Reconocimiento merecido. El proceso generó el resultado.', 'Medalla registrada. Constancia > Intensidad.'],
      meta:            ['Un paso a la vez. El objetivo está definido. Ejecuta.', 'Datos favorables. Mantén el ritmo, no el impulso.', 'Estrategia sobre emoción. Llegarás a la meta.'],
      llamada:         ['Contacto registrado. Datos actualizados.', 'Llamada procesada. El seguimiento genera resultados.', 'Acción completada. Siguiente paso definido.'],
      lead_cargado:    ['Nuevo prospecto registrado. Califica antes de invertir tiempo.', 'Lead capturado. Analiza el perfil para optimizar el abordaje.', 'Dato nuevo en el sistema. Procede con orden.'],
      cita_agendada:   ['Reunión programada. Prepara con datos relevantes.', 'Cita registrada. La preparación determina el resultado.', 'Agenda actualizada. Revisa el perfil del cliente antes de la reunión.'],
      cita_proxima:    ['Reunión próxima. Revisa los datos del cliente.', 'Alerta de cita. Prepárate con información relevante.', 'Tiempo restante: breve. Enfócate.'],
      cita_perdida:    ['Cliente ausente. Reagenda en las próximas 24 horas.', 'Cita sin resultado. Activa el protocolo de recuperación.', 'Dato registrado. El seguimiento determina el cierre.'],
      cita_vencida:    ['Estado pendiente de actualización. Mantén el CRM limpio.', 'Registro incompleto. Cierra o reagenda para tener datos precisos.', 'Sin datos = sin análisis. Actualiza el estado.'],
      record:          ['Nuevo máximo histórico registrado. El método funciona.', 'Récord personal superado. La constancia genera resultados.', 'Hito alcanzado. Los datos confirman el progreso.'],
      faltan_pocas:    ['El análisis indica: pocas ventas para el objetivo.', 'Datos muestran proximidad a la meta. Mantén el proceso.', 'Falta poco. Ejecuta sin apresurarte.'],
      rendimiento_bajo:['Métricas bajo promedio. Revisa el proceso, no la motivación.', 'Los datos indican fricción. Identifica el cuello de botella.', 'Rendimiento bajo lo esperado. Ajusta la estrategia con información.'],
      regreso:         ['Sesión reiniciada. Retoma donde pausaste.', 'Datos del pipeline te esperan. Procede con orden.', 'Bienvenido de vuelta. Analiza el estado actual antes de actuar.'],
      jornada_exitosa: ['Cierre del día: resultados por encima del promedio.', 'Jornada analizada: positiva. Replica el proceso mañana.', 'Datos del día: favorables. Descansa y vuelve con claridad.'],
      ver_agenda:      ['Agenda del día disponible. Revisa y prepara cada reunión.', 'Citas cargadas. La preparación previa define el resultado.', 'Programa del día en pantalla. Ordena por prioridad.'],
      ver_leads:       ['Pipeline visible. Filtra por estado para identificar dónde actuar.', 'Leads cargados. Califica antes de invertir tiempo en cada uno.', 'Vista de prospectos. Orden y claridad = más conversiones.'],
      ver_dashboard:   ['Métricas disponibles. Analiza sin sesgos.', 'Los números son neutrales. Interprétalos con estrategia.', 'Dashboard activo. Identifica patrones, no excepciones.'],
      ver_ventas:      ['Historial de cierres. Encuentra el patrón que repite el éxito.', 'Ventas registradas. La tendencia es más valiosa que el dato aislado.', 'Registro disponible. Analiza qué funcionó y replica.'],
      ver_config:      ['Configuración. Un sistema bien parametrizado trabaja por ti.', 'Ajustes disponibles. Personaliza para reducir fricción.', 'Parámetros del sistema. Invierte tiempo aquí, gana tiempo después.'],
      tip_comercial:   ['Una pregunta abierta vale más que diez argumentos de venta.', 'Califica antes de invertir tiempo. No todo lead vale igual.', 'El silencio en la reunión es espacio para que el cliente decida. Úsalo.', 'Confirmar la cita reduce inasistencias. Simple. Efectivo.', 'El seguimiento sistemático genera el 80% de los cierres. No el carisma.'],
      sin_resultados:  ['Sin resultados para ese filtro. Ajusta los parámetros.', 'Sin coincidencias. El dato puede estar en otro rango de fechas.', 'Lista vacía. Revisa el criterio de búsqueda.']
    }
  },
  {
    id: 'max', nombre: 'MAX', img: 'mascot-max.png', color: '#EA580C', emoji: '🔥',
    msgs: {
      bienvenida:      ['¡Ey bro! ¿Listo pa romperla hoy? 😎🔥', '¡Qué pasa crack! ¡MAX en la casa! ¡Vamos a facturar hermano! 💯', '¡Ey! ¡Hoy nos cargamos el mercado! ¡Prende el motor! 🔥'],
      venta:           ['¡WEEE eso es bro! ¡Crack absoluto! 💯', '¡Demasiado pro hermano! ¡Sigue así que estás en flow! 😎', '¡Weon eso se llama talento! ¡La comisión llegando! 🔥'],
      medalla:         ['¡Bro esa medalla es TUYA hermano! ¡Te la curraste! 🏅', '¡Weon eres una leyenda! ¡Nadie te para crack! 💯', '¡BRUTAL BRO! ¡Así hacen los mejores! 😎🔥'],
      meta:            ['¡Ey dale nomás bro! ¡Estás a nada hermano! 🔥', '¡No te rajas ahora crack! ¡El flow está contigo! 💯', '¡Tú puedes weon! ¡Yo lo sé! ¡Dale que sí! 😎'],
      llamada:         ['¡Eso bro! ¡A llamar se dijo! 📞', '¡Llama llama llama! ¡La plata no llega sola crack! 🔥', '¡Bien ahí hermano! ¡Cada llamada es un paso! 💯'],
      lead_cargado:    ['¡Nuevo objetivo bro! ¡Contáctalo antes que alguien más! 😎', '¡Lead fresco hermano! ¡Esos son los mejores! 🔥', '¡Oye crack! ¡Nuevo prospecto! ¡A darle nomás! 💯'],
      cita_agendada:   ['¡Eso bro! ¡Cita agendada es venta a medias! 😎🔥', '¡Weon bien ahí! ¡Prepárate para el cierre hermano! 💯', '¡Crack! ¡Cita confirmada! ¡Ahora a preparar el pitch! 🔥'],
      cita_proxima:    ['¡Ey bro! ¡Reunión en breve! ¡No llegues tarde crack! 😎', '¡Alerta hermano! ¡Tienes una cita pronto! ¡Prepárate! 🔥', '¡Oye! ¡Tu próxima cita está a punto! ¡Focus! 💯'],
      cita_perdida:    ['¡Ey no te preocupes bro! ¡Reagéndala hoy mismo! 😅', '¡Weon no pasa nada! ¡Los mejores también pierden citas! ¡Vuelve! 💯', '¡Bro tranquilo! ¡Llámalo y reagenda! ¡El flow no se pierde! 🔥'],
      cita_vencida:    ['¡Ey bro! ¡Actualiza esa cita! ¡El orden hace al crack! 😎', '¡Hermano! ¡Cierra ese lead o reagéndalo! ¡Pa\'lante! 💯', '¡Oye! ¡No dejes cosas botadas bro! ¡Orden = éxito! 🔥'],
      record:          ['¡BRO ESO ES HISTORIA! ¡NUEVO RÉCORD CRACK! 🔥🏆', '¡WEON ERES UNA LEYENDA! ¡NUEVO MÁXIMO! 💯😎', '¡HERMANO! ¡TE SUPERASTE! ¡ASÍ SE HACE! 🔥🎉'],
      faltan_pocas:    ['¡Ey bro! ¡A nada crack! ¡Una más y la rompemos! 🔥', '¡Hermano estás ahí! ¡El final de mes te llama! 💯', '¡Oye crack! ¡Tan cerca! ¡Dale el último empujón! 😎'],
      rendimiento_bajo:['¡Ey bro! ¡Los malos días existen pero pasan! ¡Vuelve! 💯', '¡Hermano! ¡Hoy no fue el día pero mañana sí! ¡Flow! 🔥', '¡Oye! ¡Revisa qué pasó esta semana y ajusta crack! 😎'],
      regreso:         ['¡EY BRO! ¡BIENVENIDO DE VUELTA CRACK! 😎🔥', '¡Hermano! ¡Por fin! ¡El equipo te extrañaba! 💯', '¡Weon de vuelta! ¡Ahora a recuperar lo que no hiciste! 🔥'],
      jornada_exitosa: ['¡Bro! ¡Jornada de crack completada! ¡Duerme bien hermano! 😎', '¡Weon! ¡Así se hace! ¡Jornada exitosa hermano! 🔥💯', '¡Crack del día! ¡Mañana repetimos! ¡Eso! 💯'],
      ver_agenda:      ['¡Ey bro! ¿Cuántas citas hay hoy? ¡A sacarlas todas crack! 🔥', '¡Agenda abierta hermano! ¡Que no quede una cita sin cerrar! 💯', '¡Tus citas del día bro! ¡Esta es tu cancha! ¡Juega! 😎'],
      ver_leads:       ['¡Los leads esperan bro! ¡El primero que llama gana crack! 🔥', '¡Ey hermano! ¿Cuántos llevan más de un día sin contacto? ¡A llamar! 💯', '¡Pipeline abierto crack! ¡A contactar en orden de temperatura! 😎'],
      ver_dashboard:   ['¡Mira tus números bro! ¿Cómo vamos esta semana crack? 😎', '¡El scoreboard tuyo hermano! ¿Ganando o ajustando? 🔥', '¡Stats al frente bro! ¡Los cracks miden su propio juego! 💯'],
      ver_ventas:      ['¡Tus victorias ahí crack! ¡Cuéntalas y sigue sumando! 🔥', '¡Ey bro! ¿Cuántas ventas llevas este mes hermano? 💯', '¡El historial tuyo crack! ¡Supera el del mes pasado! 😎'],
      ver_config:      ['¡Personalizando el setup bro! ¡Un crack tiene sus herramientas a punto! 😎', '¡Configura bien hermano! ¡El orden hace al campeón! 💯', '¡Ajustes crack! ¡Dos minutos aquí te ahorran horas! 🔥'],
      tip_comercial:   ['¡Bro! ¿Sabías que el mejor horario para llamar es entre 10-11am y 4-6pm? ¡Testéalo crack! 🔥', '¡Hermano! ¡El follow-up es donde se cierra! ¡La mayoría no lo hace! ¡Tu ventaja! 💯', '¡Oye bro! ¡El WhatsApp con nombre propio convierte el triple que el genérico! ¡Personaliza! 😎', '¡Crack! ¿Confirmaste las citas de mañana? ¡El 30% no va si no confirman! 🔥', '¡Hermano! ¡Pide referidos siempre después de cerrar! ¡Es el lead más barato! 💯'],
      sin_resultados:  ['¡Nada bro! ¡Cambia el filtro crack! 😅', '¡Vacío hermano! ¡Busca diferente o en otro rango! 💯', '¡Sin resultados bro! ¡Revisa los parámetros! 🔥']
    }
  },
  {
    id: 'nova', nombre: 'NOVA', img: 'mascot-nova.png', color: '#7C3AED', emoji: '✨',
    msgs: {
      bienvenida:      ['¡Hola estrella! Las galaxias están alineadas para ti hoy ✨', '¡NOVA aquí! ¡El universo conspira a tu favor hoy! 🌟', 'Cada día es una nueva constelación de posibilidades ✨🚀'],
      venta:           ['¡Otra estrella brilla en tu cielo de éxitos! 🌟', '¡El universo celebra contigo! ¡Venta increíble! ✨', '¡Boom cósmico! ¡Esa venta iluminó toda la galaxia! 🚀'],
      medalla:         ['¡Una nueva estrella nació en tu constelación! 🌟✨', '¡Medalla cósmica! ¡Eres la estrella más brillante! 💫', '¡El universo te reconoce! ¡Extraordinaria! ✨🏆'],
      meta:            ['¡Estás tan cerca de las estrellas! ¡No pares! 🌟', '¡El cosmos te empuja hacia tu meta! ¡Sigue volando! ✨', '¡Cada venta te acerca más al cielo! ¡Confía! 🚀'],
      llamada:         ['¡Cada llamada es una señal en el universo! ✨', '¡Conectando almas! ¡Eso es lo que haces! 🌟', '¡Llamada registrada en las estrellas! 📞✨'],
      lead_cargado:    ['¡Nuevo alma que conectar! ¡El universo los puso en tu camino! ✨', '¡Prospecto recibido! ¡Esta puede ser una historia hermosa! 🌟', '¡El cosmos trajo este lead hasta ti! ¡Trátalo con cariño! 💫'],
      cita_agendada:   ['¡Cita agendada! ¡Una nueva estrella lista para brillar juntos! ✨', '¡Reunión programada! ¡Va a ser mágica! 🌟', '¡El universo alineó esta cita para ti! ¡Prepárate! 🚀'],
      cita_proxima:    ['¡Tu próxima estrella te espera en minutos! ✨', '¡Cita inminente! ¡Brilla como la estrella que eres! 🌟', '¡El universo dice: es tu momento! ¡Úsalo! 💫'],
      cita_perdida:    ['No pasó nada, estrella. ¡Reagenda y sigue brillando! ✨', '¡Los cometas a veces cambian de rumbo! ¡Reagenda pronto! 🌟', '¡No te rindas! ¡El universo tiene más oportunidades! 💫'],
      cita_vencida:    ['¡Hay un pendiente en tu galaxia! ¡Actualiza para seguir brillando! ✨', '¡Mantén limpio tu cielo! ¡Actualiza ese lead! 🌟', '¡Las estrellas ordenadas brillan más! ¡Cierra ese registro! 💫'],
      record:          ['¡¡NUEVA ESTRELLA EN TU CONSTELACIÓN!! ¡RÉCORD PERSONAL! 🌟✨', '¡El universo entero te aplaude! ¡Nuevo máximo histórico! 🚀', '¡Nunca antes tan alto! ¡Eres extraordinaria! 💫🏆'],
      faltan_pocas:    ['¡Ya casi tocas las estrellas! ¡No te detengas! ✨', '¡A pocas luces de tu meta! ¡El universo te anima! 🌟', '¡Tan cerca del cielo! ¡Un último esfuerzo! 🚀'],
      rendimiento_bajo:['¡Oye estrella! ¡Hasta los cometas tienen días lentos! ✨', '¡No te preocupes! ¡El universo tiene fe en ti! 🌟', '¡Los mejores momentos vienen después de los difíciles! ¡Sigue! 💫'],
      regreso:         ['¡¡BIENVENIDA DE VUELTA ESTRELLA!! ¡TE EXTRAÑÉ! 🌟✨', '¡El universo se alegra de verte de vuelta! 🚀', '¡La galaxia no era la misma sin ti! ¡Volvamos a brillar! ✨'],
      jornada_exitosa: ['¡Jornada de estrellas completada! ¡Descansa y sueña alto! 🌟', '¡Hoy brillaste en toda la galaxia! ¡Buen trabajo! ✨', '¡El universo registró tu éxito de hoy! ¡Mañana más! 💫🚀'],
      ver_agenda:      ['¡Tu cielo de hoy está lleno de encuentros! ¡Cada cita es una estrella! ✨', '¡Agenda abierta! ¡Cuántas constelaciones por conectar hoy! 🌟', '¡Las citas de hoy son oportunidades cósmicas! ¡Brilla en cada una! 💫'],
      ver_leads:       ['¡Hay almas esperando que las contactes! ¡Sé su guía estrella! ✨', '¡El universo trajo estos prospectos hasta ti! ¡No los dejes partir! 🌟', '¡Tu galaxia de posibilidades está aquí! ¡Conecta, conecta, conecta! 💫'],
      ver_dashboard:   ['¡El mapa de tu universo comercial! ¿Cuánto brillaste este mes? ✨', '¡Métricas estelares! ¡Los números son tu brújula cósmica! 🌟', '¡Tu constelación de resultados! ¡Encuentra qué estrella hay que iluminar más! 💫'],
      ver_ventas:      ['¡Tu constelación de victorias! ¡Cada venta es una estrella que dura para siempre! ✨', '¡Cierres registrados! ¡Cada uno fue un universo que conquistaste! 🌟', '¡Tu historia de éxito cósmica! ¡Sigue escribiéndola! 💫🚀'],
      ver_config:      ['¡Personalizando tu nave! ¡Un explorador bien equipado llega más lejos! ✨', '¡Ajustes de tu universo personal! ¡Hazlo tuyo! 🌟', '¡Configurando tu estrella! ¡Los detalles hacen la diferencia! 💫'],
      tip_comercial:   ['¿Sabías que el 68% de los clientes se van por falta de seguimiento? ¡No dejes apagar ninguna estrella! ✨', '¡Un mensaje personalizado viaja más lejos que uno genérico! ¡Usa siempre su nombre! 🌟', '¡Las mejores ventas nacen de una conexión real! Escucha más de lo que hablas 💫', '¡El universo recompensa a quien confirma sus citas! ¡Un mensaje hoy salva la reunión mañana! ✨', '¡Pide referidos con cariño! ¡Un cliente feliz puede traerte tres constelaciones nuevas! 🚀'],
      sin_resultados:  ['¡Ninguna estrella aquí! ¡Busca en otra galaxia! ✨', '¡El universo no encontró coincidencias! ¡Ajusta tu telescopio! 🌟', '¡Espacio vacío! ¡Los datos están en otro rango! 💫']
    }
  },
  {
    id: 'illidan', nombre: 'ILLIDAN', img: 'mascot-illidan.png', color: '#92400E', emoji: '🐾',
    msgs: {
      bienvenida:      ['Woof. 🐾 A trabajar. Estoy contigo.', '...aquí estoy. Fiel. Listo. ¿Tú? 🐾', 'Woof woof. Sin excusas. Hoy vendemos juntos. 🐕'],
      venta:           ['Woof! 🐾 ¡Eso! ¡Sabía que podías!', '...orgulloso. Mucho. Sigue así. 🐕', 'Woof woof woof! ¡Excelente resultado! 🐾'],
      medalla:         ['Woof!!!! 🐾🏆 ¡LO SABÍA DESDE EL PRINCIPIO!', '...merecido. Siempre supe que lo lograrías. 🐕', 'Woof woof! ¡Medalla! ¡Eres el mejor para mí! 🐾'],
      meta:            ['Woof. Puedes. Yo siempre lo supe. 🐾', '...no te rindas. Estoy contigo hasta el final. 🐕', 'Woof woof. Casi. ¡Un empujón más! 🐾'],
      llamada:         ['Woof. Llamada anotada. Buen trabajo. 🐾', '...bien. Cada contacto vale. Te apoyo. 🐕', 'Woof! ¡A seguir marcando! Estoy orgulloso. 📞🐾'],
      lead_cargado:    ['Woof! ¡Nuevo prospecto! ¡Vamos a por él juntos! 🐾', '...lead detectado. Contáctalo. Yo te respaldo. 🐕', 'Woof woof. Nuevo objetivo. Conmigo no fallarás. 🐾'],
      cita_agendada:   ['Woof! ¡Cita agendada! ¡Bien hecho! ¡Estoy tan orgulloso! 🐾', '...preparemos juntos la reunión. Vas a cerrarla. 🐕', 'Woof woof. Agenda lista. Confía en ti como yo confío. 🐾'],
      cita_proxima:    ['Woof! ¡Reunión pronto! ¡Tú puedes! ¡Yo estaré aquí! 🐾', '...cita en minutos. Respira. Confío en ti. 🐕', 'Woof woof! ¡El momento es ahora! ¡Tú vales mucho! 🐾'],
      cita_perdida:    ['Woof... no pasa nada. ¡Reagenda! Siempre hay otra oportunidad. 🐾', '...estoy contigo. Un no hoy no es un no siempre. 🐕', 'Woof. Protejo tu ánimo también. ¡Vuelve mañana con más fuerza! 🐾'],
      cita_vencida:    ['Woof... hay un pendiente. Actualiza, por favor. 🐾', '...cuido tu trabajo también. Cierra ese lead. 🐕', 'Woof woof. El orden nos hace mejores. ¡Actualiza! 🐾'],
      record:          ['WOOF WOOF WOOF!!! 🐾🏆 ¡NUEVO RÉCORD! ¡SOY EL PERRO MÁS ORGULLOSO!', '...sin palabras. Estoy tan orgulloso de ti. 🐕🎉', 'Woof woof! ¡Lo lograste! ¡Sabía que podías! 🐾'],
      faltan_pocas:    ['Woof. Casi. Puedes. Te quiero. 🐾', '...tan cerca. Confío en ti más que en mí mismo. 🐕', 'Woof woof. El final está cerca. ¡Un último esfuerzo juntos! 🐾'],
      rendimiento_bajo:['Woof... ¿Estás bien? Los malos días pasan. Estoy contigo. 🐾', '...no me importa el resultado, me importas tú. ¿Seguimos? 🐕', 'Woof woof. Mañana es un nuevo día. Yo no me voy a ningún lado. 🐾'],
      regreso:         ['WOOF WOOF! 🐾 ¡Volviste! ¡TE EXTRAÑÉ TANTO!', '...aquí esperé. Fiel. Como siempre. 🐕', 'Woof! ¡Por fin! ¡Ahora vamos juntos a recuperar el tiempo! 🐾'],
      jornada_exitosa: ['Woof. Buen trabajo hoy. Descansa. Mañana volvemos. 🐾', '...jornada bien hecha. Orgulloso de ti. Siempre. 🐕', 'Woof woof! ¡Día exitoso! ¡Mereces el descanso! 🐾'],
      ver_agenda:      ['Woof! 📅 ¿Cuántas citas hoy? ¡Yo te acompaño a todas! 🐾', '...agenda del día. Estoy aquí. No fallas tú, no fallo yo. 🐕', 'Woof woof. Revisa las citas. Contigo hasta la última. 🐾'],
      ver_leads:       ['Woof! ¡Prospectos! ¡Vamos por ellos juntos hermano! 🐾', '...leads esperando. Contáctalos. Yo cuido tu espalda. 🐕', 'Woof woof. Nuevos objetivos. Conmigo no fallarás. 🐾'],
      ver_dashboard:   ['Woof... 📊 ¿Cómo estamos? ¡Yo te apoyo sin importar el número! 🐾', '...métricas. Las buenas me alegran. Las malas me dan más ganas de ayudarte. 🐕', 'Woof. Los números son datos. Lo que me importa eres tú. 🐾'],
      ver_ventas:      ['Woof! ¡Tus victorias! ¡Recuerda todo lo que has logrado! 🐾', '...cada venta aquí es un recuerdo de lo que logramos juntos. 🐕', 'Woof woof. ¡Tan orgulloso de este historial! ¡Sigue escribiéndolo! 🐾'],
      ver_config:      ['Woof. Ajustando. Aquí también te acompaño. 🐾', '...configura a tu gusto. Yo me adapto a ti, no al revés. 🐕', 'Woof woof. Personaliza. Este es tu espacio. 🐾'],
      tip_comercial:   ['Woof. Tip: el cliente que no responde no siempre dice no. A veces solo necesita otro intento. 🐾', '...observé que confirmar las citas reduce los no-show. Yo nunca fallaría, pero ellos sí. 🐕', 'Woof woof. Los mejores vendedores anotan TODO. ¿Estás anotando? 🐾', 'Woof. Después de cada venta, pide un referido. Yo también recomendaría a mi humano favorito. 🐾', '...tip de perro: la lealtad genera ventas. Sé constante con tus leads. 🐕'],
      sin_resultados:  ['Woof... nada aquí. ¿Buscamos diferente? 🐾', '...vacío. No te preocupes, cambiamos la búsqueda. 🐕', 'Woof woof. Sin resultados. Ajustamos juntos. 🐾']
    }
  }
];

export function getMascotMsg(mascota, ctx) {
  const arr = mascota.msgs?.[ctx] || mascota.msgs?.bienvenida || [];
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
}
