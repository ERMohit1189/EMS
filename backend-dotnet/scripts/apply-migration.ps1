param(
  [string]$Server = "ASUS\SQLEXPRESS",
  [string]$Database = "eoms_db",
  [string]$User = "sa",
  [string]$Password = "admin@1234",
  [string]$Script = "migrations\InitialCreate.sql"
)

Write-Host "Applying SQL script $Script to $Server/$Database"
$sqlcmd = "sqlcmd -S $Server -U $User -P $Password -i $Script"
Write-Host $sqlcmd
Invoke-Expression $sqlcmd

Write-Host "Done."