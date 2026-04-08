-- =============================================================
-- Fleet Management - Seed Script
-- Clears all data except app_user, then inserts fresh seed data.
-- Run with: psql -U postgres -d FleetManagement -f seed.sql
-- =============================================================

-- ---------------------------------------------------------------
-- CLEAR (order matters — children before parents)
-- ---------------------------------------------------------------

TRUNCATE TABLE
  fleet.notification,
  fleet.vehicle_document,
  fleet.document,
  fleet.inspection,
  fleet.accident,
  fleet.fine,
  fleet.registration_record,
  fleet.insurance_policy,
  fleet.fuel_transaction,
  fleet.fuel_card,
  fleet.maintenance_item,
  fleet.maintenance_order,
  fleet.odometer_log,
  fleet.vehicle_assignment,
  fleet.vehicle,
  fleet.vendor,
  fleet.driver_license_category,
  fleet.driver,
  fleet.employee,
  fleet.dc_vehicle_model,
  fleet.dc_vehicle_make,
  fleet.dc_vehicle_category,
  fleet.dc_fuel_type,
  fleet.dc_maintenance_type,
  fleet.dc_license_category
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------
-- DICTIONARIES
-- ---------------------------------------------------------------

INSERT INTO fleet.dc_vehicle_make (name, is_active) VALUES
  ('Toyota', true), ('Volkswagen', true), ('Ford', true),
  ('BMW', true), ('Mercedes-Benz', true), ('Renault', true),
  ('Opel', true), ('Peugeot', true), ('Škoda', true), ('Hyundai', true);

INSERT INTO fleet.dc_vehicle_model (make_id, name, is_active)
SELECT m.make_id, v.name, true
FROM (VALUES
  ('Toyota',       'Corolla'),   ('Toyota',       'Yaris'),    ('Toyota',       'Hilux'),
  ('Volkswagen',   'Golf'),      ('Volkswagen',   'Passat'),   ('Volkswagen',   'Transporter'),
  ('Ford',         'Focus'),     ('Ford',         'Transit'),  ('Ford',         'Ranger'),
  ('BMW',          '3 Series'),  ('BMW',          '5 Series'), ('BMW',          'X5'),
  ('Mercedes-Benz','C-Class'),   ('Mercedes-Benz','Sprinter'), ('Mercedes-Benz','Vito'),
  ('Renault',      'Megane'),    ('Renault',      'Trafic'),   ('Renault',      'Kangoo'),
  ('Opel',         'Astra'),     ('Opel',         'Vivaro'),   ('Opel',         'Combo'),
  ('Peugeot',      '308'),       ('Peugeot',      'Boxer'),    ('Peugeot',      'Partner'),
  ('Škoda',        'Octavia'),   ('Škoda',        'Superb'),   ('Škoda',        'Fabia'),
  ('Hyundai',      'i30'),       ('Hyundai',      'Tucson'),   ('Hyundai',      'H-1')
) AS v(make_name, name)
JOIN fleet.dc_vehicle_make m ON m.name = v.make_name;

INSERT INTO fleet.dc_vehicle_category (name, description, is_active) VALUES
  ('Passenger Car',  'Standard passenger vehicles',        true),
  ('Van',            'Light commercial / cargo vans',      true),
  ('Truck',          'Heavy goods vehicles',               true),
  ('SUV',            'Sport utility vehicles',             true),
  ('Minibus',        'Passenger minibuses',                true);

INSERT INTO fleet.dc_fuel_type (code, label, is_electric, is_active) VALUES
  ('DSL',  'Diesel',   false, true),
  ('PET',  'Petrol',   false, true),
  ('LPG',  'LPG',      false, true),
  ('EL',   'Electric', true,  true),
  ('HYB',  'Hybrid',   false, true);

INSERT INTO fleet.dc_maintenance_type (name, description, is_active) VALUES
  ('Oil Change',          'Engine oil & filter replacement',       true),
  ('Tyre Replacement',    'One or more tyres replaced',            true),
  ('Brake Service',       'Brake pads / discs / fluid',            true),
  ('General Inspection',  'Periodic technical inspection',         true),
  ('Air Filter',          'Air filter replacement',                true),
  ('Transmission Service','Gearbox fluid & filter',                true),
  ('Battery Replacement', 'Vehicle battery replacement',           true),
  ('Windscreen Repair',   'Chip/crack repair or full replacement',  true);

INSERT INTO fleet.dc_license_category (code, description, is_active) VALUES
  ('B',  'Passenger cars up to 3500 kg', true),
  ('C',  'Heavy goods vehicles',         true),
  ('D',  'Buses',                        true),
  ('BE', 'B + trailer',                  true),
  ('CE', 'C + trailer',                  true);

-- ---------------------------------------------------------------
-- EMPLOYEES (100)
-- ---------------------------------------------------------------

INSERT INTO fleet.employee (first_name, last_name, department, email, phone, is_active, is_deleted, created_at)
SELECT
  fn, ln, dept,
  lower(fn) || '.' || lower(ln) || i || '@fleet.hr',
  '+385 9' || (1000000 + i * 3)::text,
  true, false,
  now() - (i || ' days')::interval
FROM generate_series(1, 100) AS i
CROSS JOIN LATERAL (VALUES (
  CASE i % 10
    WHEN 0 THEN 'Ivan'    WHEN 1 THEN 'Marko'   WHEN 2 THEN 'Ana'
    WHEN 3 THEN 'Petra'   WHEN 4 THEN 'Luka'    WHEN 5 THEN 'Sara'
    WHEN 6 THEN 'Josip'   WHEN 7 THEN 'Nina'    WHEN 8 THEN 'Tomislav'
    ELSE 'Maja' END,
  CASE i % 10
    WHEN 0 THEN 'Horvat'  WHEN 1 THEN 'Kovac'   WHEN 2 THEN 'Babic'
    WHEN 3 THEN 'Maric'   WHEN 4 THEN 'Juric'   WHEN 5 THEN 'Peric'
    WHEN 6 THEN 'Tomic'   WHEN 7 THEN 'Blazevic' WHEN 8 THEN 'Saric'
    ELSE 'Knezevic' END,
  CASE i % 5
    WHEN 0 THEN 'Operations'  WHEN 1 THEN 'Logistics'
    WHEN 2 THEN 'Maintenance' WHEN 3 THEN 'Administration'
    ELSE 'Management' END
)) AS t(fn, ln, dept);

-- ---------------------------------------------------------------
-- DRIVERS (50)
-- ---------------------------------------------------------------

INSERT INTO fleet.driver (employee_id, license_number, license_expiry, is_deleted, created_at)
SELECT
  employee_id,
  'LIC-' || lpad(row_number() OVER (ORDER BY employee_id)::text, 6, '0'),
  (current_date + ((365 + row_number() OVER (ORDER BY employee_id) * 7) || ' days')::interval)::date,
  false,
  now()
FROM fleet.employee
ORDER BY employee_id
LIMIT 50;

INSERT INTO fleet.driver_license_category (driver_id, license_category_id, obtained_date)
SELECT d.driver_id, lc.license_category_id, current_date - '2 years'::interval
FROM fleet.driver d
JOIN fleet.dc_license_category lc ON lc.code = 'B';

INSERT INTO fleet.driver_license_category (driver_id, license_category_id, obtained_date)
SELECT d.driver_id, lc.license_category_id, current_date - '1 year'::interval
FROM fleet.driver d
JOIN fleet.dc_license_category lc ON lc.code = 'C'
WHERE d.driver_id % 3 = 0;

-- ---------------------------------------------------------------
-- VENDORS (20)
-- ---------------------------------------------------------------

INSERT INTO fleet.vendor (name, contact_person, phone, email, address, is_active, is_deleted, created_at)
SELECT
  'Vendor ' || i,
  'Contact ' || i,
  '+385 1 ' || (2000000 + i * 11)::text,
  'vendor' || i || '@service.hr',
  'Ulica ' || i || ', Zagreb',
  true, false, now()
FROM generate_series(1, 20) AS i;

-- ---------------------------------------------------------------
-- VEHICLES (100)
-- ---------------------------------------------------------------

INSERT INTO fleet.vehicle (
  registration_number, vin, make_id, model_id, category_id, fuel_type_id,
  year, color, status, current_odometer_km, is_deleted, created_at
)
SELECT
  'ZG-' || lpad(i::text, 4, '0') || '-AA',
  'VIN' || lpad(i::text, 14, '0'),
  make.make_id,
  model.model_id,
  cat.category_id,
  ft.fuel_type_id,
  (2015 + (i % 10))::smallint,
  (ARRAY['White','Black','Silver','Blue','Red','Grey'])[(i % 6) + 1],
  (ARRAY['active','active','active','active','service','retired'])[(i % 6) + 1],
  10000 + i * 312,
  false,
  now() - (i || ' days')::interval
FROM generate_series(1, 100) AS i
JOIN LATERAL (
  SELECT make_id FROM fleet.dc_vehicle_make ORDER BY make_id OFFSET ((i - 1) % 10) LIMIT 1
) make ON true
JOIN LATERAL (
  SELECT model_id FROM fleet.dc_vehicle_model WHERE make_id = make.make_id ORDER BY model_id OFFSET ((i - 1) % 3) LIMIT 1
) model ON true
JOIN LATERAL (
  SELECT category_id FROM fleet.dc_vehicle_category ORDER BY category_id OFFSET ((i - 1) % 5) LIMIT 1
) cat ON true
JOIN LATERAL (
  SELECT fuel_type_id FROM fleet.dc_fuel_type ORDER BY fuel_type_id OFFSET ((i - 1) % 5) LIMIT 1
) ft ON true;

-- ---------------------------------------------------------------
-- VEHICLE ASSIGNMENTS (50 active — one per driver, each on a distinct vehicle)
-- ---------------------------------------------------------------

INSERT INTO fleet.vehicle_assignment (vehicle_id, driver_id, assigned_from, assigned_to, notes, created_at)
SELECT
  v.vehicle_id,
  d.driver_id,
  now() - '30 days'::interval,
  NULL,
  'Seed assignment',
  now()
FROM (SELECT vehicle_id, row_number() OVER (ORDER BY vehicle_id) AS rn FROM fleet.vehicle) v
JOIN (SELECT driver_id, row_number() OVER (ORDER BY driver_id) AS rn FROM fleet.driver) d
  ON v.rn = d.rn;

-- ---------------------------------------------------------------
-- ODOMETER LOGS (3 per vehicle = 300 rows)
-- ---------------------------------------------------------------

INSERT INTO fleet.odometer_log (vehicle_id, odometer_km, log_date, notes, created_at)
SELECT
  v.vehicle_id,
  v.current_odometer_km - (3 - s) * 1500,
  (current_date - ((3 - s) * 30 || ' days')::interval)::date,
  'Periodic log',
  now()
FROM fleet.vehicle v
CROSS JOIN generate_series(1, 3) AS s;

-- ---------------------------------------------------------------
-- FUEL CARDS (30)
-- ---------------------------------------------------------------

INSERT INTO fleet.fuel_card (card_number, provider, assigned_vehicle_id, valid_from, valid_to, is_active, created_at)
SELECT
  'CARD-' || lpad(i::text, 6, '0'),
  (ARRAY['INA','TIFON','OMV','BP','Shell'])[(i % 5) + 1],
  v.vehicle_id,
  current_date - '1 year'::interval,
  current_date + '1 year'::interval,
  true,
  now()
FROM generate_series(1, 30) AS i
JOIN LATERAL (
  SELECT vehicle_id FROM fleet.vehicle ORDER BY vehicle_id OFFSET (i - 1) LIMIT 1
) v ON true;

-- ---------------------------------------------------------------
-- FUEL TRANSACTIONS (200)
-- ---------------------------------------------------------------

INSERT INTO fleet.fuel_transaction (
  vehicle_id, fuel_card_id, fuel_type_id,
  posted_at, odometer_km, liters, price_per_liter, total_cost,
  station_name, is_suspicious, created_at
)
SELECT
  v.vehicle_id,
  fc.fuel_card_id,
  v.fuel_type_id,
  now() - (i || ' days')::interval,
  v.current_odometer_km - i * 50,
  round((30 + (i % 20))::numeric, 2),
  round((1.40 + (i % 10) * 0.05)::numeric, 3),
  round(((30 + (i % 20)) * (1.40 + (i % 10) * 0.05))::numeric, 2),
  'Station ' || (i % 15 + 1),
  false,
  now()
FROM generate_series(1, 200) AS i
JOIN LATERAL (
  SELECT vehicle_id, fuel_type_id, current_odometer_km FROM fleet.vehicle
  ORDER BY vehicle_id OFFSET ((i - 1) % 100) LIMIT 1
) v ON true
LEFT JOIN LATERAL (
  SELECT fuel_card_id FROM fleet.fuel_card WHERE assigned_vehicle_id = v.vehicle_id LIMIT 1
) fc ON true;

-- ---------------------------------------------------------------
-- MAINTENANCE ORDERS (80) + ITEMS (2 per order)
-- ---------------------------------------------------------------

INSERT INTO fleet.maintenance_order (
  vehicle_id, vendor_id, status, reported_at, scheduled_at, closed_at,
  odometer_km, total_cost, description, created_at
)
SELECT
  v.vehicle_id,
  vnd.vendor_id,
  status_val,
  now() - (i * 3 || ' days')::interval,
  now() - (i * 3 - 1 || ' days')::interval,
  CASE WHEN status_val = 'closed' THEN now() - (i * 3 - 2 || ' days')::interval ELSE NULL END,
  v.current_odometer_km - i * 100,
  round((200 + i * 15)::numeric, 2),
  'Maintenance order ' || i,
  now()
FROM generate_series(1, 80) AS i
JOIN LATERAL (
  SELECT vehicle_id, current_odometer_km FROM fleet.vehicle ORDER BY vehicle_id OFFSET ((i - 1) % 100) LIMIT 1
) v ON true
JOIN LATERAL (
  SELECT vendor_id FROM fleet.vendor ORDER BY vendor_id OFFSET ((i - 1) % 20) LIMIT 1
) vnd ON true
CROSS JOIN LATERAL (
  VALUES ((ARRAY['open','in_progress','closed','closed'])[(i % 4) + 1])
) AS sv(status_val);

INSERT INTO fleet.maintenance_item (order_id, maintenance_type_id, parts_cost, labor_cost, notes, created_at)
SELECT o.order_id, mt.maintenance_type_id,
  round((50 + rn * 10)::numeric, 2), round((30 + rn * 5)::numeric, 2), 'Item A', now()
FROM (SELECT order_id, row_number() OVER (ORDER BY order_id) AS rn FROM fleet.maintenance_order) o
JOIN LATERAL (
  SELECT maintenance_type_id FROM fleet.dc_maintenance_type ORDER BY maintenance_type_id OFFSET ((o.rn - 1) % 8) LIMIT 1
) mt ON true
UNION ALL
SELECT o.order_id, mt.maintenance_type_id,
  round((40 + rn * 8)::numeric, 2), round((25 + rn * 4)::numeric, 2), 'Item B', now()
FROM (SELECT order_id, row_number() OVER (ORDER BY order_id) AS rn FROM fleet.maintenance_order) o
JOIN LATERAL (
  SELECT maintenance_type_id FROM fleet.dc_maintenance_type ORDER BY maintenance_type_id OFFSET (o.rn % 8) LIMIT 1
) mt ON true;

-- ---------------------------------------------------------------
-- INSURANCE POLICIES (100)
-- ---------------------------------------------------------------

INSERT INTO fleet.insurance_policy (vehicle_id, policy_number, insurer, valid_from, valid_to, premium, created_at)
SELECT
  v.vehicle_id,
  'POL-' || lpad(v.vehicle_id::text, 6, '0'),
  (ARRAY['Croatia Osiguranje','Allianz','Generali','Uniqa','Wiener'])[(v.vehicle_id % 5) + 1],
  current_date - '6 months'::interval,
  current_date + '6 months'::interval,
  round((500 + v.vehicle_id * 3)::numeric, 2),
  now()
FROM fleet.vehicle v;

-- ---------------------------------------------------------------
-- REGISTRATION RECORDS (100)
-- ---------------------------------------------------------------

INSERT INTO fleet.registration_record (vehicle_id, registration_number, valid_from, valid_to, fee, notes, created_at)
SELECT
  v.vehicle_id,
  v.registration_number,
  current_date - '3 months'::interval,
  current_date + '9 months'::interval,
  round((300 + v.vehicle_id * 2)::numeric, 2),
  'Annual registration',
  now()
FROM fleet.vehicle v;

-- ---------------------------------------------------------------
-- FINES (60)
-- ---------------------------------------------------------------

INSERT INTO fleet.fine (vehicle_id, driver_id, occurred_at, amount, reason, paid_at, payment_method, created_at)
SELECT
  v.vehicle_id,
  d.driver_id,
  now() - (i * 5 || ' days')::interval,
  round((50 + i * 10)::numeric, 2),
  (ARRAY['Speeding','Parking violation','Red light','No seatbelt','Mobile phone use'])[(i % 5) + 1],
  CASE WHEN i % 3 != 0 THEN now() - (i * 2 || ' days')::interval ELSE NULL END,
  CASE WHEN i % 3 != 0 THEN (ARRAY['cash','bank_transfer','card'])[(i % 3) + 1] ELSE NULL END,
  now()
FROM generate_series(1, 60) AS i
JOIN LATERAL (SELECT vehicle_id FROM fleet.vehicle ORDER BY vehicle_id OFFSET ((i - 1) % 100) LIMIT 1) v ON true
JOIN LATERAL (SELECT driver_id FROM fleet.driver ORDER BY driver_id OFFSET ((i - 1) % 50) LIMIT 1) d ON true;

-- ---------------------------------------------------------------
-- ACCIDENTS (30)
-- ---------------------------------------------------------------

INSERT INTO fleet.accident (vehicle_id, driver_id, occurred_at, severity, description, damage_estimate, police_report, created_at)
SELECT
  v.vehicle_id,
  d.driver_id,
  now() - (i * 12 || ' days')::interval,
  (ARRAY['minor','minor','minor','major','total'])[(i % 5) + 1],
  'Accident description ' || i,
  round((500 + i * 200)::numeric, 2),
  CASE WHEN i % 2 = 0 THEN 'PR-' || lpad(i::text, 5, '0') ELSE NULL END,
  now()
FROM generate_series(1, 30) AS i
JOIN LATERAL (SELECT vehicle_id FROM fleet.vehicle ORDER BY vehicle_id OFFSET ((i - 1) % 100) LIMIT 1) v ON true
JOIN LATERAL (SELECT driver_id FROM fleet.driver ORDER BY driver_id OFFSET ((i - 1) % 50) LIMIT 1) d ON true;

-- ---------------------------------------------------------------
-- INSPECTIONS (100)
-- ---------------------------------------------------------------

INSERT INTO fleet.inspection (vehicle_id, inspected_at, valid_to, result, odometer_km, notes, created_at)
SELECT
  v.vehicle_id,
  (current_date - '30 days'::interval)::date,
  (current_date + '335 days'::interval)::date,
  (ARRAY['passed','passed','passed','conditional','failed'])[(v.vehicle_id % 5) + 1],
  v.current_odometer_km,
  'Annual technical inspection',
  now()
FROM fleet.vehicle v;
