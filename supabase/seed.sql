-- Catálogos base (mismo contenido que src/data/crops.ts y public/data/basins.json)

insert into public.basins (id, name, short_name, description, sustainable_quota_ha, center, zoom) values
  ('daule', 'Cuenca Baja del Guayas – Daule', 'Daule',
   'Zona arrocera y cañera del bajo Guayas, con esteros comunitarios aguas abajo.', 600,
   st_point(-79.985, -1.865)::geography, 13),
  ('santa-elena', 'Canal Trasvase – Santa Elena', 'Santa Elena',
   'Área semiárida abastecida por el trasvase Chongón–Sube y Baja.', 430,
   st_point(-80.585, -2.235)::geography, 13)
on conflict (id) do nothing;

insert into public.crops (id, name, root_depth_m, p_depletion, stages) values
  ('rice', 'Arroz', 0.5, 0.2, '[{"stage_name":"Inicial","kc_value":1.05,"duration_days":30},{"stage_name":"Desarrollo","kc_value":1.12,"duration_days":30},{"stage_name":"Media","kc_value":1.2,"duration_days":60},{"stage_name":"Final","kc_value":0.9,"duration_days":30}]'),
  ('sugarcane', 'Caña de azúcar', 1.2, 0.65, '[{"stage_name":"Inicial","kc_value":0.4,"duration_days":35},{"stage_name":"Desarrollo","kc_value":0.82,"duration_days":60},{"stage_name":"Media","kc_value":1.25,"duration_days":190},{"stage_name":"Final","kc_value":0.75,"duration_days":120}]'),
  ('banana', 'Banano', 0.6, 0.35, '[{"stage_name":"Inicial","kc_value":0.5,"duration_days":120},{"stage_name":"Desarrollo","kc_value":0.8,"duration_days":90},{"stage_name":"Media","kc_value":1.1,"duration_days":120},{"stage_name":"Final","kc_value":1.0,"duration_days":60}]'),
  ('cacao', 'Cacao', 0.8, 0.3, '[{"stage_name":"Inicial","kc_value":1.0,"duration_days":365},{"stage_name":"Media","kc_value":1.05,"duration_days":365},{"stage_name":"Final","kc_value":1.05,"duration_days":365}]'),
  ('maize', 'Maíz', 1.0, 0.55, '[{"stage_name":"Inicial","kc_value":0.3,"duration_days":20},{"stage_name":"Desarrollo","kc_value":0.75,"duration_days":35},{"stage_name":"Media","kc_value":1.2,"duration_days":40},{"stage_name":"Final","kc_value":0.6,"duration_days":30}]'),
  ('mango', 'Mango', 1.2, 0.5, '[{"stage_name":"Inicial","kc_value":0.6,"duration_days":60},{"stage_name":"Media","kc_value":0.75,"duration_days":180},{"stage_name":"Final","kc_value":0.65,"duration_days":125}]')
on conflict (id) do nothing;

insert into public.soil_types (id, name, theta_fc, theta_wp) values
  ('sand', 'Arenoso', 0.12, 0.04),
  ('loam', 'Franco', 0.27, 0.12),
  ('clay_loam', 'Franco arcilloso', 0.34, 0.20),
  ('clay', 'Arcilloso', 0.40, 0.25)
on conflict (id) do nothing;
