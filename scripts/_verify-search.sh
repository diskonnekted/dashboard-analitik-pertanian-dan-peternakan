cd /home/anian/htdocs/pertanian.sistemdata.id
echo "--- md5 server vs lokal ---"
md5sum assets/pages-DfmZ_jr2.js assets/index-CJSIYtL4.js assets/index-uA3DwdG_.css
echo "--- index.html merujuk ---"
grep -o "assets/index-[^\"]*" index.html
echo "--- pages chunk yg dipanggil ---"
grep -o "pages-[A-Za-z0-9_-]*\.js" assets/index-CJSIYtL4.js | head -1
