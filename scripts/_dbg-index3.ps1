$lines = [System.IO.File]::ReadAllLines('I:\pertanian\pertanian-2\src\pages\index.tsx')
for ($i = 1; $i -le $lines.Count; $i++) { '{0,4}: {1}' -f $i, $lines[$i - 1] }
