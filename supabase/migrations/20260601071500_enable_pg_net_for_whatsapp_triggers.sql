-- Enables outbound HTTP calls used by car-wash WhatsApp notification triggers.
create extension if not exists pg_net with schema extensions;
