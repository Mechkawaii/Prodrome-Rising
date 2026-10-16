#!/bin/bash
# Assemble index.html (version web autonome) à partir de shell.html + src/*.js
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="fr">\n<meta charset="utf-8">\n'; cat shell.html; echo "<script>"; for f in core sprites data game render mdata music ui; do echo "/* --- $f --- */"; cat src/$f.js; done; echo "</script>";
  echo "<script>try{if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))var had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',function(){if(had&&!window.__rl){window.__rl=1;location.reload()}});navigator.serviceWorker.register('sw.js').catch(function(){})}catch(e){}</script>"; echo '</html>'; } > index.html
echo "index.html : $(wc -c < index.html) octets"
