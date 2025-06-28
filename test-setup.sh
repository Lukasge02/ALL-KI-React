#!/bin/bash
# 🧪 ALL-KI SETUP TEST
# Speichere als: test-setup.sh

echo "🚀 ALL-KI Setup-Test wird gestartet..."
echo "======================================"

# 1. Node.js Version prüfen
echo "📦 Node.js Version:"
node --version

# 2. Dependencies prüfen
echo ""
echo "🔍 Package.json gefunden:"
if [ -f "package.json" ]; then
    echo "✅ package.json existiert"
else
    echo "❌ package.json fehlt"
fi

# 3. Umgebungsvariablen prüfen
echo ""
echo "🌍 Environment Variables:"
if [ -f ".env" ]; then
    echo "✅ .env Datei existiert"
    echo "MONGODB_URI: $(grep -q MONGODB_URI .env && echo '✅ Gefunden' || echo '❌ Fehlt')"
    echo "OPENAI_API_KEY: $(grep -q OPENAI_API_KEY .env && echo '✅ Gefunden' || echo '❌ Fehlt')"
else
    echo "❌ .env Datei fehlt"
fi

# 4. Verzeichnisstruktur prüfen  
echo ""
echo "📁 Verzeichnisstruktur:"
echo "src/models/: $([ -d "src/models" ] && echo '✅' || echo '❌')"
echo "src/routes/: $([ -d "src/routes" ] && echo '✅' || echo '❌')"
echo "public/css/: $([ -d "public/css" ] && echo '✅' || echo '❌')"

# 5. Wichtige Dateien prüfen
echo ""
echo "📄 Wichtige Dateien:"
echo "server.js: $([ -f "server.js" ] && echo '✅' || echo '❌')"
echo "src/models/Widget.js: $([ -f "src/models/Widget.js" ] && echo '✅' || echo '❌ ERSTELLEN')"
echo "src/models/Profile.js: $([ -f "src/models/Profile.js" ] && echo '✅' || echo '❌ ERSTELLEN')"
echo "public/css/dashboard.css: $([ -f "public/css/dashboard.css" ] && echo '✅' || echo '❌')"

# 6. Dependencies installieren
echo ""
echo "🔧 Dependencies installieren..."
npm install

# 7. Server-Test (kurz)
echo ""
echo "🖥️  Server-Test (5 Sekunden)..."
timeout 5 npm run dev > server-test.log 2>&1 &
sleep 6

if grep -q "MongoDB erfolgreich verbunden" server-test.log; then
    echo "✅ MongoDB Verbindung erfolgreich"
elif grep -q "Fallback-Modus aktiv" server-test.log; then
    echo "⚠️  MongoDB nicht verbunden - Fallback-Modus"
else
    echo "❌ Server-Start fehlgeschlagen"
fi

# 8. Ergebnis
echo ""
echo "🎯 SETUP STATUS:"
echo "======================================"
if [ -f "src/models/Widget.js" ] && [ -f "src/models/Profile.js" ]; then
    echo "✅ Models: Vollständig"
else
    echo "❌ Models: Unvollständig - Erstelle Widget.js und Profile.js"
fi

if [ -f ".env" ]; then
    echo "✅ Environment: Konfiguriert"
else
    echo "❌ Environment: .env Datei erstellen"
fi

echo ""
echo "🚀 NÄCHSTE SCHRITTE:"
echo "1. Models erstellen (falls ❌)"
echo "2. npm run dev"
echo "3. http://localhost:3000/dashboard"

# Cleanup
rm -f server-test.log