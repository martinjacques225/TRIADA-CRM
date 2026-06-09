// services/medal.service.js
// Contrato público del sistema de medallas/niveles. Implementación pura en js/utils.js.
// Regla: 1 medalla por cada 4 ventas/semana · 1 nivel por cada 5 medallas.
// Contrato: calcMedallasSemanales, calcTotalMedallas, calcNivel
import { calcMedallasSemanales, calcTotalMedallas, calcNivel } from '../js/utils.js';

export { calcMedallasSemanales, calcTotalMedallas, calcNivel };

export const MedalService = { calcMedallasSemanales, calcTotalMedallas, calcNivel };
export default MedalService;
