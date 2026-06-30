-- Migración 0040: Adaptación del catálogo UCAB con categorías iniciales finas y recodificación por categoría principal.
--
-- 1. Insertar las nuevas categorías finas (subcategorías de las categorías principales)
INSERT INTO categories (slug, label_es, label_en, parent_slug, vertical, sort) VALUES
  ('food_fresh', 'Alimentos frescos', 'Fresh food', 'food', 'general', 11),
  ('food_non_perishable', 'Alimentos no perecederos', 'Non-perishable food', 'food', 'general', 12),
  ('hygiene_infantile', 'Cuidado infantil', 'Childcare', 'hygiene', 'general', 31),
  ('hygiene_personal', 'Higiene personal', 'Personal hygiene', 'hygiene', 'general', 32),
  ('tools_extraction', 'Materiales de extracción', 'Extraction materials', 'tools', 'general', 71),
  ('other_pets', 'Mascotas', 'Pets', 'other', 'general', 95)
ON CONFLICT (slug) DO NOTHING;
--> statement-breakpoint

-- 2. Insertar las traducciones de las nuevas categorías
INSERT INTO category_translations (category_slug, locale, label) VALUES
  ('food_fresh', 'es', 'Alimentos frescos'),
  ('food_fresh', 'en', 'Fresh food'),
  ('food_non_perishable', 'es', 'Alimentos no perecederos'),
  ('food_non_perishable', 'en', 'Non-perishable food'),
  ('hygiene_infantile', 'es', 'Cuidado infantil'),
  ('hygiene_infantile', 'en', 'Childcare'),
  ('hygiene_personal', 'es', 'Higiene personal'),
  ('hygiene_personal', 'en', 'Personal hygiene'),
  ('tools_extraction', 'es', 'Materiales de extracción'),
  ('tools_extraction', 'en', 'Extraction materials'),
  ('other_pets', 'es', 'Mascotas'),
  ('other_pets', 'en', 'Pets')
ON CONFLICT (category_slug, locale) DO UPDATE SET label = EXCLUDED.label;
--> statement-breakpoint

-- 3. Actualizar los aliases de categorías para apuntar a las nuevas categorías finas
UPDATE category_aliases SET category_slug = 'food_fresh' WHERE alias_norm = 'alimentos frescos';
UPDATE category_aliases SET category_slug = 'food_non_perishable' WHERE alias_norm = 'alimentos no perecederos';
UPDATE category_aliases SET category_slug = 'hygiene_infantile' WHERE alias_norm = 'cuidado infantil';
UPDATE category_aliases SET category_slug = 'hygiene_personal' WHERE alias_norm = 'higiene personal';
UPDATE category_aliases SET category_slug = 'tools_extraction' WHERE alias_norm = 'materiales de extraccion';
UPDATE category_aliases SET category_slug = 'other_pets' WHERE alias_norm = 'mascotas';
--> statement-breakpoint

-- 4. Actualizar la asociación de categorías de los insumos existentes
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = 'cf8da6e3-7b91-52ff-8cf7-bbff50786c35';
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = 'ff483c64-894b-5d4e-bd33-5a3ddfb6f519';
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = 'd8883926-c756-5831-9ebc-8e9ed0c86318';
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = '239159d8-ebbc-571b-be4a-5286a5356571';
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = 'ef555dc7-99b3-5732-87d6-fe63cc1f4bdc';
UPDATE "supplies" SET "category_slug" = 'water' WHERE "id" = 'a2d50624-55c5-5217-be71-4ab82df5530a';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = 'a3c072a6-c293-5a82-b184-4ce3bbd1567f';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '75d56cb4-68e5-5c82-bf94-53f02b806af1';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '6d7b26ef-f12b-59d0-afb5-fb70dd5d9627';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '43ffe067-59e0-564f-b0d6-e8db88992dac';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '1d08527a-b2fd-5310-908b-6cda8e9b3188';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '8ecc3d2d-132b-531a-a191-b0ca78ef8a34';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = 'bfafe5aa-7254-5f61-a1a4-bfa69f7c29ed';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = 'e23f8b3c-8126-5d19-9c76-bea0f4c1f914';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '4b020a6c-143b-56df-b2c8-8dd4656e6706';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '18846fce-f516-575b-9deb-5c73bcaf994f';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '20ff9133-5f28-596c-ab75-aa831028e9ca';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = 'dc907f39-8356-5e09-969d-908a0dab30e5';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '8a2b2c85-ea0a-504f-8759-907acf802853';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '58460895-ff37-513f-aad0-660adccbe762';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = '85b7c3ed-6c81-55a8-8f85-0c1d9edece4d';
UPDATE "supplies" SET "category_slug" = 'food_fresh' WHERE "id" = 'd20d99b1-3199-579e-9bfe-71a25ed62025';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '5d6412bd-dbf6-575d-a265-529f31a9e2d8';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '0b4b19c7-0b3d-58ac-a50d-df3cb2c57933';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '46922fbb-3dea-5917-b8a0-92d0fb3fb788';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'cd96f63c-be76-5c10-a2d8-9f57af24ab43';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '4dfc564f-7b48-5db3-bd64-af7ef96228e5';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'ca7f89c9-f026-5bce-acaa-e73780148ba4';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '6eee7d51-5d87-5aee-9626-2b49a992d70c';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'f282be57-d92d-5a07-9b36-d965f4e26a71';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'fdeda912-eb38-5136-ba8b-4e7e8d608fc6';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'ec928f9a-05ff-5e79-a2ad-1995ec305a52';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '37d8a5c9-3e39-5fc7-bb6a-52af12998e78';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '604ecd01-fafa-5ea0-a249-c4f7b8a1be8a';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '7e236854-75d4-5976-a9a1-2580814a6688';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'e2d51bf1-5c89-5e1a-8f31-fff40a288134';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'da03b509-67f3-5f3a-a94d-828b09c30c0f';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'f947d5eb-a4a0-5c0d-9107-1756def5385d';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '73e5ec7b-770e-53fc-87c9-3933a3984311';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'edd602b4-cc86-508b-9c77-8dfdaefd80b6';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '58577f88-f481-5cc2-ae2b-082238e1d982';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '3b1d571d-4687-536e-9aed-d65a29383a72';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'd9ef4696-9326-5a4b-a7bd-b2b652a672f3';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'cb9ac124-e1dd-5ba1-8bc9-8b259e1e6ccb';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '0f0fb2ab-bb8f-5d82-ade8-9b73642e549f';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '61003964-b241-589c-9791-f94d9956fd10';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '1e04115d-105f-574b-a950-1929923c04fc';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '2581ee91-34ba-549e-aa10-ae2ad408037d';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'af69527e-ca49-5c29-8eeb-145eaef12ddd';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '07286049-6829-51f5-9cd7-decf0b340703';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = 'c3512a2b-df83-523f-a739-7c15a8abb59a';
UPDATE "supplies" SET "category_slug" = 'food_non_perishable' WHERE "id" = '9fd0b504-419d-5832-a6fe-38a97caa3f39';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '12c1eea0-c443-5c26-aac0-c6a1b415cd7a';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '31a48a0a-404b-5f9f-a3da-41771fb1f807';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '60a5835b-dbb1-5591-8a8d-cec9039c6537';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'b5993a3d-aacd-52f3-b337-911d96ae9c0a';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '862c18fe-fa9e-5485-8aa3-6ef063089dc8';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '1943ac4b-69d9-5772-8b82-13d404d92733';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'cf53e81b-b718-58f1-b710-8df3740aab6c';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '7e6d68d4-6492-5a11-9ddc-41ca05f7ab5b';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'e8bb21a8-db0a-5199-9ad7-ee76f78d150d';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'c54d1880-286c-53e2-8ad9-bfcffe163f11';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'a672ccaf-da27-5501-aa41-0ba61f87e67a';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'fbacb5dd-f349-597c-9636-0134af5227ac';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'c5ba65af-2710-511b-b3e6-70401d0e935c';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '74f426c5-0f15-50b5-834a-b407f98add88';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '6e3e3c19-0d87-5302-ba3e-de257ae26bc9';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'b5d6112a-bb0c-5572-99f0-d52bed4e2b2d';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '2af4cf8d-e1a0-5fa3-a96f-fd9df5751e5c';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'ebd5c848-0e10-5927-918c-cd87b69e0a51';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'c77249db-9df5-56c1-b52b-50454e63313c';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '831ec2b4-cade-5955-9ea0-48e3a970b4e3';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '13b5941b-d867-5f62-8527-f00cb3a26244';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'a92cbdc9-a26c-5f96-a543-1d1856261b98';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '0e70340b-11a4-587b-9826-01eaeee01c03';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = '8b625240-807f-511b-9b73-c6f1f83b7fd7';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'f157b4c4-74f9-5621-82ee-ee6b7b80de50';
UPDATE "supplies" SET "category_slug" = 'hygiene_infantile' WHERE "id" = 'bb5072a2-663a-5a38-bc6b-6aeca5d9b16a';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '99f81182-b90f-5126-83b2-0f8ded81bce3';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'eea2fc44-83dc-5661-a6fe-b862b838c8d8';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '0da51335-d0b7-5f23-8ad3-22513e4472be';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'ff00a5d4-48c1-551a-a51d-6ffbc17c21e2';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'b7e7762c-9607-5952-9f50-26af123a21cf';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'e8b85759-71c5-562e-a4b7-252e9b9ad3d7';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '5bbcccac-aa91-58bf-adde-e6328ba1cddb';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'e0529b00-6002-5bd8-9af6-081d7e74cc20';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'aee187fb-7d97-5cbc-9b11-8b663fb18bdf';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '56a10659-5091-5984-9693-c5c4037bc292';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'bf1da5cf-aa04-5874-be8b-2034c4998893';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '006ef151-1f56-50a4-b4a1-2ec4876910a1';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '082d14c6-ad19-500f-a16c-41cf6441b82e';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '69c0ee7c-2a76-5243-b3e1-53b8a6fce506';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '964344ad-0f44-5117-8c1d-b165325bdf08';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '096ef44d-99cc-56e8-9414-3e639f014500';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'c962e4f3-85e0-56a3-86ee-d81f8a5ae5e8';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'c81d321e-7963-55c0-8c8d-1c25e490cdcf';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '447e3b8a-9822-5f65-ac01-735b2f9d40d9';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '9f1efb39-b0ad-5faf-bd89-b66c59936592';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = '37370371-75e8-50ed-acaa-d5cf9ee90082';
UPDATE "supplies" SET "category_slug" = 'hygiene_personal' WHERE "id" = 'da59f68e-9a83-5dc0-8f4b-ca02f4d42a49';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '10ca8945-27f0-56cb-9c40-1041d5b12b67';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '1a4b5ce0-3fec-5f14-9542-2f71db762fb6';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '92bc03a9-9fa1-555d-92a3-ee182dd15b4c';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '8edc2906-5990-57c4-bf60-9511ab089d43';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '4ae90a8e-0f3e-56f1-a69a-c9ba7b774f00';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '8b48bd1a-8922-5835-97d8-276e240fd38f';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '4a7266a8-4cae-5a5c-a388-4d81eaff8b3d';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = 'af50da38-7979-5564-bbc4-edcdde6304a5';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '646dab31-2522-59ac-8274-5e5954b1da29';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '07e68ab0-9e31-5dc1-a56f-efb9c808d46a';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = 'bdfb9314-f298-554a-90a2-6a6d43e8f00c';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '28cfe56d-090e-5dc5-b4a9-643d129f3444';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '85c4414b-6947-5491-95bf-2b8debd409c2';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '1b1d7ca4-ccd9-573b-ae5f-ed6459ab1698';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '57e48bec-9739-50fd-b23f-fd85317b518c';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '4385dc29-c6c7-5a79-b5ce-e716c4f83560';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '7ec99b3c-f171-529f-a8f9-acb47636e63c';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '9fd09d73-e2f5-5a2f-bfe4-ee6da26cb452';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '0d6dc042-94ec-502a-bc2f-fb177d039508';
UPDATE "supplies" SET "category_slug" = 'medicines' WHERE "id" = '12d1cb5b-8d13-5b3a-a36d-640b1acae506';
UPDATE "supplies" SET "category_slug" = 'medical_equipment' WHERE "id" = '55eddac3-01b5-5084-ad41-83e6867d7940';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'b84240ba-9aa3-5d0e-834b-c51b03b70501';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '486ec855-7cfa-57ce-b11a-bc7b6c6262b3';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '397bc6b5-1201-508d-a1ae-e57d1f81e081';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '3c6284d4-02ed-5971-b76f-aa3c827d0652';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'e5b56b11-e270-559c-9070-2bac6e368605';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '2417be3e-8564-5239-96f3-17a1209b225c';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '2ccf051e-dcda-5d8e-92cf-18f633fc66e8';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'faa5f87d-ee9d-5e34-92b6-2d68895e7596';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '270ff574-5dc5-5cba-9592-d24e245e409e';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'ed78fcae-d342-5507-9478-01e7d99b112b';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '3675d0e1-2ca6-54ae-8baf-6ce95ea60b93';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'a7febe79-98ac-5c36-928e-6ffb285fb7c0';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'd532e4eb-a03a-5301-8d5e-611ffe2aa732';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '81e271a6-94e0-584e-b123-1027fcc25d66';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '2323a765-59ab-5978-81a1-ca092d3ff5f9';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'b5d49733-52cc-58e9-9a28-be9b0a22fb45';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '116f32cb-dc91-5385-9e20-a52e4623b8a5';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '82f03e4b-4df8-5954-af02-6ff4fffc48ac';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '3b28585f-7674-57bf-8057-ffadcf359760';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '5ac4dd19-06af-58ab-957c-8b0c7cfd429f';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'b1375d76-adb1-55af-b4dc-57810e61a24c';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '17028228-d48d-5da6-88eb-962d8ac8cc4a';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'a161dcd8-f3dc-5d7d-84b9-58997bc385da';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'a692e9f4-003a-5a22-8ff6-87b3d436a746';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'baa66b46-5a56-51d3-b5bb-56e3506ede93';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'e8f96ffb-ea84-5e9f-9a1d-93511e37d2f6';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'd75e5460-4d40-5a4f-9d6b-f171ebfee776';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'b4d24a0d-ec73-5c7b-9f9d-cb4d26dd5be4';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '3a544246-efae-55e0-8828-1d595dfeea57';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '76d69c45-94d7-53e0-9f3b-ce2060542d49';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = 'f2a819f6-7ded-56b6-a317-4743d106f32b';
UPDATE "supplies" SET "category_slug" = 'tools_extraction' WHERE "id" = '58130aed-52ff-59a4-a98b-aef40aac30ed';
UPDATE "supplies" SET "category_slug" = 'other_pets' WHERE "id" = 'd5a4386a-5b55-5b53-9cb4-83f8b9803f87';
UPDATE "supplies" SET "category_slug" = 'other_pets' WHERE "id" = '69fedc26-a145-5fb6-a7f6-13a7aaf4ef87';
UPDATE "supplies" SET "category_slug" = 'other_pets' WHERE "id" = 'b44d42a8-5d38-5e4b-9dbc-88675c0a9584';
UPDATE "supplies" SET "category_slug" = 'other_pets' WHERE "id" = '4cad1a94-266f-5c1a-bfed-8173c3110746';
UPDATE "supplies" SET "category_slug" = 'other_pets' WHERE "id" = 'c2ba6b64-30fd-54e8-b6e0-76397b1216bd';
--> statement-breakpoint

-- 5. Recodificar los insumos existentes para que empiecen por el código corto de su categoría principal
-- La categoría principal es la raíz (el padre del padre, etc. -> COALESCE(parent_slug, slug) dado que la jerarquía es de máximo 1 nivel).
WITH recoded AS (
  SELECT
    s.id,
    CASE COALESCE(c.parent_slug, c.slug)
      WHEN 'food' THEN 'FOD'
      WHEN 'water' THEN 'WAT'
      WHEN 'hygiene' THEN 'HYG'
      WHEN 'medical' THEN 'MED'
      WHEN 'shelter' THEN 'SHE'
      WHEN 'clothing' THEN 'CLO'
      WHEN 'tools' THEN 'TOO'
      WHEN 'other' THEN 'OTH'
      ELSE 'INS'
    END as prefix,
    ROW_NUMBER() OVER (
      PARTITION BY CASE COALESCE(c.parent_slug, c.slug)
        WHEN 'food' THEN 'FOD'
        WHEN 'water' THEN 'WAT'
        WHEN 'hygiene' THEN 'HYG'
        WHEN 'medical' THEN 'MED'
        WHEN 'shelter' THEN 'SHE'
        WHEN 'clothing' THEN 'CLO'
        WHEN 'tools' THEN 'TOO'
        WHEN 'other' THEN 'OTH'
        ELSE 'INS'
      END
      ORDER BY s.code, s.id
    ) as seq
  FROM supplies s
  JOIN categories c ON s.category_slug = c.slug
)
UPDATE supplies s
SET code = r.prefix || '-' || lpad(r.seq::text, 4, '0')
FROM recoded r
WHERE s.id = r.id;
