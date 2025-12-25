@echo off
echo Running attendance table migration...
echo.

psql "postgresql://neondb_owner:npg_6Q3eRmWfkFds@ep-rough-rain-ahrvhny5-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -f add_attendance_unique_constraint.sql

echo.
echo Migration complete!
pause
