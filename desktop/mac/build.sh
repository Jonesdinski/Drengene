#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build/Lejrbalet\ Sync.app/Contents/MacOS
swiftc -swift-version 5 FlockReader.swift ParserChecks.swift -o build/parser-checks
build/parser-checks
for arch in arm64 x86_64; do
  swiftc -parse-as-library -swift-version 5 -target "${arch}-apple-macos13.0" -O FlockReader.swift main.swift -o "build/LejrbaletSync-${arch}" -framework AppKit -framework Security -framework ServiceManagement -framework Carbon
 done
lipo -create build/LejrbaletSync-arm64 build/LejrbaletSync-x86_64 -output 'build/Lejrbalet Sync.app/Contents/MacOS/LejrbaletSync'
cp Info.plist 'build/Lejrbalet Sync.app/Contents/Info.plist'
codesign --force --deep --sign - 'build/Lejrbalet Sync.app'
codesign --verify --deep --strict 'build/Lejrbalet Sync.app'
# Verify a real AppKit launch and close-to-background lifecycle without uploading data.
'build/Lejrbalet Sync.app/Contents/MacOS/LejrbaletSync' --smoke-test
mkdir -p build/dmg
cp -R 'build/Lejrbalet Sync.app' build/dmg/
ln -s /Applications build/dmg/Programmer
hdiutil create -volname 'Lejrbalet Sync' -srcfolder build/dmg -ov -format UDZO build/LejrbaletSync-Mac.dmg
