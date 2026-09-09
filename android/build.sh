#!/bin/sh
# Сборка APK. Требует: /tmp/asdk/sdk, /tmp/glibc/root, /tmp/ecj.jar
set -e
cd "$(dirname "$0")"

LD=/tmp/glibc/root/usr/lib64/ld-linux-x86-64.so.2
LP=/tmp/glibc/root/usr/lib/x86_64-linux-gnu
BT=/tmp/asdk/sdk/build-tools/34.0.0
AJ=/tmp/asdk/sdk/platforms/android-34/android.jar
OUT=/tmp/apkout

rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/gen"

$LD --library-path $LP $BT/aapt2 compile --dir res -o "$OUT/res.zip"
$LD --library-path $LP $BT/aapt2 link -o "$OUT/base.apk" -I $AJ \
    --manifest AndroidManifest.xml "$OUT/res.zip" --java "$OUT/gen" \
    --min-sdk-version 24 --target-sdk-version 34

java -jar /tmp/ecj.jar -source 8 -target 8 -nowarn -proc:none \
    -bootclasspath $AJ -classpath $AJ -d "$OUT/classes" \
    $(find src "$OUT/gen" -name "*.java")

$BT/d8 --release --min-api 24 --lib $AJ --output "$OUT" \
    $(find "$OUT/classes" -name "*.class")

cd "$OUT"
python3 - <<'PY'
import zipfile, shutil
shutil.copy('base.apk', 'tmp.apk')
zin = zipfile.ZipFile('tmp.apk')
zout = zipfile.ZipFile('unsigned.apk', 'w', zipfile.ZIP_DEFLATED)
for it in zin.infolist():
    zout.writestr(it, zin.read(it.filename))
zout.write('classes.dex', 'classes.dex')
zout.close(); zin.close()
PY

$LD --library-path $LP $BT/zipalign -p -f 4 unsigned.apk aligned.apk
KS="$(cd "$(dirname "$0")" && pwd)"
$BT/apksigner sign --ks /app/webapp/android/gs.keystore --ks-key-alias gs \
    --ks-pass pass:globalstroy2026 --key-pass pass:globalstroy2026 \
    --min-sdk-version 24 --out signed.apk aligned.apk

$BT/apksigner verify --print-certs signed.apk | head -2
cp signed.apk /app/webapp/public/app/stroykontrol.apk
echo "APK готов: public/app/stroykontrol.apk"
