param([Parameter(Mandatory=$true)][string]$Pattern, [Parameter(Mandatory=$true)][string]$File, [int]$First = 40)
Select-String -Path $File -Pattern $Pattern | Select-Object -First $First | ForEach-Object { '{0}: {1}' -f $_.LineNumber, $_.Line.Trim() }
