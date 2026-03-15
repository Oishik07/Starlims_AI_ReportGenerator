INSERT INTO sample (id, created_date, lab_technician, processed_date, sample_name, status) VALUES
(1, '2026-02-06', 'Dr Roy', NULL, 'Blood_001', 'PENDING'),
(2, '2026-02-09', 'Dr Sen', NULL, 'Urine_002', 'PENDING'),
(3, '2026-02-11', 'Dr Das', '2026-02-19', 'Saliva_003', 'PROCESSED'),
(4, '2026-02-01', 'Dr Roy', '2026-02-03', 'Plasma_004', 'PROCESSED'),
(5, '2026-01-27', 'Dr Sen', NULL, 'Serum_005', 'PENDING'),
(6, '2026-02-16', 'Dr Das', NULL, 'Blood_006', 'IN_PROGRESS'),
(7, '2026-01-22', 'Dr Roy', '2026-01-24', 'Urine_007', 'PROCESSED'),
(8, '2026-02-03', 'Dr Sen', NULL, 'Saliva_008', 'PENDING'),
(9, '2026-02-13', 'Dr Das', '2026-02-20', 'Plasma_009', 'PROCESSED'),
(10, '2026-01-12', 'Dr Roy', NULL, 'Serum_010', 'PENDING'),
(11, '2026-02-18', 'Dr Sen', NULL, 'Blood_011', 'IN_PROGRESS'),
(12, '2026-02-05', 'Dr Das', '2026-02-07', 'Urine_012', 'PROCESSED'),
(13, '2026-02-03', 'Dr Roy', NULL, 'Saliva_013', 'PENDING'),
(14, '2026-02-14', 'Dr Sen', '2026-02-15', 'Plasma_014', 'PROCESSED'),
(15, '2026-02-10', 'Dr Das', NULL, 'Serum_015', 'PENDING'),
(16, '2026-02-08', 'Dr Roy', '2026-02-17', 'Blood_016', 'PROCESSED'),
(17, '2026-02-12', 'Dr Sen', NULL, 'Urine_017', 'IN_PROGRESS'),
(18, '2026-02-04', 'Dr Das', NULL, 'Saliva_018', 'PENDING'),
(19, '2026-02-15', 'Dr Roy', '2026-02-18', 'Plasma_019', 'PROCESSED');




INSERT INTO inventory (inventory_id, expiry_date, last_updated, quantity_ml, storage_location, storage_temperature, sample_id) VALUES
(1, '2026-09-01', '2026-03-01', 5.5, 'Freezer A1', '-20C', 21),
(2, '2026-06-02', '2026-03-02', 3.2, 'Rack B1', '4C', 22),
(3, '2026-12-03', '2026-03-03', 4.0, 'Freezer A2', '-80C', 23),
(4, '2026-07-04', '2026-03-04', 2.5, 'Rack C1', 'Room', 24),
(5, '2026-08-05', '2026-03-05', 6.1, 'Freezer A3', '-20C', 25),
(6, '2026-09-06', '2026-03-06', 3.8, 'Rack B2', '4C', 26),
(7, '2026-10-07', '2026-03-07', 2.0, 'Freezer A1', '-80C', 27),
(8, '2026-11-08', '2026-03-08', 4.7, 'Rack C2', 'Room', 28),
(9, '2026-12-09', '2026-03-09', 5.0, 'Freezer A2', '-20C', 29),
(10, '2026-07-10', '2026-03-10', 3.3, 'Rack B3', '4C', 30);



INSERT INTO result (result_id, reference_range, result_status, result_value, test_type, unit, verified_by, verified_date, sample_id) VALUES
(1, '70-120', 'NORMAL', '110', 'Glucose', 'mg/dL', 'Dr Sen', '2026-03-05', 23),
(2, 'Normal', 'ABNORMAL', 'Low', 'CBC', '-', 'Dr Roy', '2026-03-06', 25),
(3, 'Negative', 'NORMAL', 'Negative', 'PCR', '-', 'Dr Das', '2026-03-08', 27),
(4, '<200', 'ABNORMAL', '220', 'Cholesterol', 'mg/dL', 'Dr Roy', '2026-03-12', 30);



