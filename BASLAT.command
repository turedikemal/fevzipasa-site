#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  node server.mjs --sync
else
  echo "Node.js bulunamadı. index.html dosyasını açıyorum."
  open index.html
fi
