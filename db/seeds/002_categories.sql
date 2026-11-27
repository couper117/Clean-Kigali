-- CK001-17: the problem types residents choose from. Existing names are kept.
INSERT INTO categories (name, description) VALUES
  ('Illegal dumping', 'Waste left on the roadside, in a field or by a river'),
  ('Overflowing bin', 'A public or shared bin that is full and spilling'),
  ('Blocked drain', 'A drain or gutter blocked by waste, flooding the road'),
  ('Missed collection', 'Household waste was not collected on the planned day'),
  ('Burning waste', 'Waste being burned in the open'),
  ('Dirty public toilet', 'A public toilet that is unclean or out of order')
ON CONFLICT ((lower(name))) DO NOTHING;
