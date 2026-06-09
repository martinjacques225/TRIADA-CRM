// services/index.js — Barrel de la capa de servicios.
// Único punto de entrada recomendado a datos y lógica de negocio para la app.
// Regla de arquitectura: las vistas/módulos hablan con servicios, nunca con js/db.js.
export { initDB } from './persistence.service.js';
export { leads, LeadService } from './lead.service.js';
export { appointments, AppointmentService } from './appointment.service.js';
export { sales, SalesService } from './sales.service.js';
export { calls, CallService } from './call.service.js';
export { events, EventService } from './event.service.js';
export { templates, TemplateService } from './template.service.js';
export { config, ConfigService } from './config.service.js';
export { CommissionService } from './commission.service.js';
export { MedalService } from './medal.service.js';
export { UserService } from './user.service.js';
