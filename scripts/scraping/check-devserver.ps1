$r = Invoke-WebRequest -Uri 'http://localhost:5173/src/components/MapWidget.tsx' -UseBasicParsing
'status: ' + $r.StatusCode
if ($r.Content -match 'Sensus Pertanian 2023 \(BPS\)') { 'popup ST2023: TERPASANG' } else { 'popup ST2023: TIDAK ADA' }
if ($r.Content -match 'fetchSt2023DesaExtra') { 'fetcher import: OK' } else { 'fetcher import: TIDAK ADA' }
$a = Invoke-WebRequest -Uri 'http://localhost:5173/src/services/api.ts' -UseBasicParsing
if ($a.Content -match 'fetchSt2023DesaExtra') { 'api.ts fetcher: OK' } else { 'api.ts fetcher: TIDAK ADA' }
