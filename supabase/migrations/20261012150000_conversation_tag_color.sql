-- Colour of a conversation tag (one of the palette ids in src/lib/callTags.ts); null = the tag's default.
alter table public.conversation_tag_rules add column if not exists color text;
