#!/bin/bash
# Assemble index.html (version web autonome) à partir de shell.html + src/*.js
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n'; cat shell.html; echo "<script>"; for f in core sprites data game render ui; do echo "/* --- $f --- */"; cat src/$f.js; done; echo "</script>";
  echo "<script>try{if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){})}catch(e){}</script>"; echo '</html>'; } > index.html
echo "index.html : $(wc -c < index.html) octets"
