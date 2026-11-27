-- CK001-14: Kigali's districts and the sectors inside them.
-- They change only when the government redraws boundaries, so they are loaded here
-- with the tables: every database, including production, has them after migrating.

CREATE TABLE districts (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE sectors (
  id          SERIAL PRIMARY KEY,
  district_id INT NOT NULL REFERENCES districts(id),
  name        VARCHAR(50) NOT NULL,
  -- Kicukiro and Nyarugenge are both a district and a sector, so names are unique
  -- inside a district, not across the city.
  UNIQUE (district_id, name)
);

CREATE INDEX sectors_district_id_idx ON sectors (district_id);

INSERT INTO districts (name) VALUES ('Gasabo'), ('Kicukiro'), ('Nyarugenge');

-- The 35 sectors of the City of Kigali.
INSERT INTO sectors (district_id, name)
SELECT d.id, s.name
  FROM (VALUES
    ('Gasabo', 'Bumbogo'), ('Gasabo', 'Gatsata'), ('Gasabo', 'Gikomero'),
    ('Gasabo', 'Gisozi'), ('Gasabo', 'Jabana'), ('Gasabo', 'Jali'),
    ('Gasabo', 'Kacyiru'), ('Gasabo', 'Kimihurura'), ('Gasabo', 'Kimironko'),
    ('Gasabo', 'Kinyinya'), ('Gasabo', 'Ndera'), ('Gasabo', 'Nduba'),
    ('Gasabo', 'Remera'), ('Gasabo', 'Rusororo'), ('Gasabo', 'Rutunga'),
    ('Kicukiro', 'Gahanga'), ('Kicukiro', 'Gatenga'), ('Kicukiro', 'Gikondo'),
    ('Kicukiro', 'Kagarama'), ('Kicukiro', 'Kanombe'), ('Kicukiro', 'Kicukiro'),
    ('Kicukiro', 'Kigarama'), ('Kicukiro', 'Masaka'), ('Kicukiro', 'Niboye'),
    ('Kicukiro', 'Nyarugunga'),
    ('Nyarugenge', 'Gitega'), ('Nyarugenge', 'Kanyinya'), ('Nyarugenge', 'Kigali'),
    ('Nyarugenge', 'Kimisagara'), ('Nyarugenge', 'Mageragere'), ('Nyarugenge', 'Muhima'),
    ('Nyarugenge', 'Nyakabanda'), ('Nyarugenge', 'Nyamirambo'), ('Nyarugenge', 'Nyarugenge'),
    ('Nyarugenge', 'Rwezamenyo')
  ) AS s (district, name)
  JOIN districts d ON d.name = s.district
 ORDER BY d.id, s.name;
