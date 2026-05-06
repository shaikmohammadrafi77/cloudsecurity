$ports = @(3000, 5000)
$procIds = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports } |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($procId in $procIds) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
}

Remove-Item -LiteralPath "frontend/.next/dev/lock" -Force -ErrorAction SilentlyContinue
