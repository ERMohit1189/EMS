SELECT 'app_settings' as table_name, COUNT(*) as row_count FROM app_settings
UNION ALL SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL SELECT 'daily_allowances', COUNT(*) FROM daily_allowances
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'designations', COUNT(*) FROM designations
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'export_headers', COUNT(*) FROM export_headers
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'payment_masters', COUNT(*) FROM payment_masters
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL SELECT 'salary_structures', COUNT(*) FROM salary_structures
UNION ALL SELECT 'sites', COUNT(*) FROM sites
UNION ALL SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL SELECT 'teams', COUNT(*) FROM teams
UNION ALL SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL SELECT 'zones', COUNT(*) FROM zones
ORDER BY table_name;
