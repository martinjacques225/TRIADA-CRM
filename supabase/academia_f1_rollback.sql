-- ═══════════════════════════════════════════════════════════════════════════
-- ACADEMIA TRÍADA · F1 · ROLLBACK  (revierte academia_f1.sql por completo)
-- Aditivo ⇒ el rollback solo borra lo que F1 creó. NO toca ninguna tabla previa
-- del CRM. Úsalo solo si hay que dar marcha atrás; borra datos de aspirantes de
-- prueba (en producción con datos reales, exporta antes).
-- ═══════════════════════════════════════════════════════════════════════════

-- Funciones RPC / helper
drop function if exists public.academia_revelar_rut(uuid);
drop function if exists public.academia_ingesta_eventos(text,jsonb);
drop function if exists public.academia_me(text);
drop function if exists public.academia_registrar_aspirante(text,text,text,text,text,uuid,boolean,text,text);
drop function if exists public.academia_bootstrap();
drop function if exists public.academia_mi_reclutador_id();

-- Tablas públicas (cascade limpia triggers/policies/índices/FKs)
drop table if exists public.academia_evaluaciones      cascade;
drop table if exists public.academia_email_outbox       cascade;
drop table if exists public.academia_eventos            cascade;
drop table if exists public.academia_progreso_modulos   cascade;
drop table if exists public.academia_consentimientos    cascade;
drop table if exists public.academia_inscripciones      cascade;
drop table if exists public.academia_sesiones           cascade;
drop table if exists public.academia_aspirantes         cascade;
drop table if exists public.academia_programa_modulos   cascade;
drop table if exists public.academia_programas          cascade;
drop table if exists public.academia_modulos            cascade;
drop table if exists public.academia_reclutadores       cascade;

-- Schema confidencial del RUT
drop table  if exists academia.aspirante_rut cascade;
drop schema if exists academia cascade;

-- Correlativo del aspirante
delete from public.correlativos where tipo = 'ASP';

-- (No se borran filas de `actividad`: el log de auditoría es inmutable por diseño.)
