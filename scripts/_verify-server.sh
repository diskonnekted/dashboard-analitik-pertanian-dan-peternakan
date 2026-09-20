cd /home/anian/htdocs/pertanian.sistemdata.id
echo "--- md5 server ---"
md5sum assets/recommendations-rAqn1Uqy.js assets/index-C-0PIe3M.js
echo "--- index.html merujuk ---"
grep -o "assets/index-[^\"]*\.js" index.html
echo "--- chunk recommendations yg dipanggil index ---"
grep -o "recommendations-[A-Za-z0-9_-]*\.js" assets/index-C-0PIe3M.js | head -2
echo "--- semua bundle index/recommendations di server ---"
ls assets/ | grep -E "^(recommendations|index)-" | head -10
