#!/bin/zsh
# usage: ./render.sh fig-703-1 720   (name, css height)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
NAME=$1
H=$2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1200,$H --screenshot="$DIR/$NAME.png" "file://$DIR/$NAME.html" 2>/dev/null
echo "rendered $NAME.png"
