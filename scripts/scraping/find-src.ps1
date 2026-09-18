param([Parameter(Mandatory=$true)][string]$Pattern, [string]$Path = 'I:\pertanian\pertanian-2\src')
Get-ChildItem $Path -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $hits = Select-String -Path $_.FullName -Pattern $Pattern
    foreach ($h in $hits) { '{0}:{1}: {2}' -f $_.FullName.Replace('I:\pertanian\pertanian-2\',''), $h.LineNumber, $h.Line.Trim() }
}
