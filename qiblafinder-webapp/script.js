document.addEventListener('DOMContentLoaded', function() {
    // Elemente auswählen
    const qiblaArrow = document.getElementById('qibla-arrow');
    const qiblaDegree = document.getElementById('qibla-degree');
    const coordinates = document.getElementById('coordinates');
    const currentTime = document.getElementById('current-time');
    const magneticAlert = document.getElementById('magnetic-alert');

    // Debugging
    console.log("Qibla Finder wird initialisiert...");

    // Aktuelle Zeit anzeigen und aktualisieren
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        currentTime.textContent = `${hours}:${minutes}`;
    }
    updateTime();
    setInterval(updateTime, 60000);

    // Qibla-Richtung berechnen (präzise Formel)
    function calculateQiblaDirection(latitude, longitude) {
        const meccaLat = 21.3891;  // Breitengrad der Kaaba
        const meccaLng = 39.8579;  // Längengrad der Kaaba
        
        // Umrechnung in Radiant
        const phiK = meccaLat * Math.PI / 180.0;
        const lambdaK = meccaLng * Math.PI / 180.0;
        const phi = latitude * Math.PI / 180.0;
        const lambda = longitude * Math.PI / 180.0;
        
        // Qibla-Winkel berechnen
        const psi = 180.0 / Math.PI * Math.atan2(
            Math.sin(lambdaK - lambda),
            Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda)
        );
        
        return (psi + 360.0) % 360.0;
    }

    // Kompassfunktionalität mit verbesserter Handhabung
    let currentHeading = 0;
    let qiblaDirection = 131.5; // Standardwert falls Standort nicht verfügbar
    let isMagneticDisturbance = false;
    let isCompassActive = false;

    function handleOrientation(event) {
        // Heading auf verschiedene Weisen ermitteln (Browser-Kompatibilität)
        const getHeading = () => {
            if (event.webkitCompassHeading !== undefined) {
                isMagneticDisturbance = event.webkitCompassAccuracy > 0;
                return event.webkitCompassHeading;
            }
            if (event.alpha !== null) {
                return (360 - event.alpha) % 360;
            }
            return null;
        };

        const heading = getHeading();
        if (heading === null) return;

        currentHeading = heading;
        
        // Winkelberechnung mit Offset für Kaaba-Position (135°)
        const angle = (currentHeading - qiblaDirection + 360 + 45) % 360;
        
        // Pfeilbewegung (glatter Übergang)
        qiblaArrow.style.transform = `translate(-50%, -50%) rotate(${-angle}deg)`;
        
        // Farbwechsel bei richtiger Ausrichtung
        const arrowPath = qiblaArrow.querySelector('path');
        const accuracyThreshold = 15; // Grad-Toleranz
        const isCorrectDirection = Math.abs(angle - 180) < accuracyThreshold || 
                                 Math.abs(angle - 180) > (360 - accuracyThreshold);
        
        arrowPath.setAttribute('fill', isCorrectDirection ? '#388e3c' : '#d32f2f');
        
        // Magnetische Störung anzeigen
        magneticAlert.style.display = isMagneticDisturbance ? 'flex' : 'none';
        
        if (!isCompassActive) {
            console.log("Kompass funktioniert! Aktuelle Ausrichtung:", currentHeading.toFixed(1) + '°');
            isCompassActive = true;
        }
    }

    // Standortabfrage mit Fehlerbehandlung
    function getLocation() {
        if (!navigator.geolocation) {
            coordinates.textContent = 'Geolocation wird nicht unterstützt';
            return;
        }

        console.log("Versuche Standort zu ermitteln...");
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Qibla-Richtung berechnen
                qiblaDirection = calculateQiblaDirection(lat, lng);
                qiblaDegree.textContent = `Qibla: ${qiblaDirection.toFixed(1)}°`;
                coordinates.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
                console.log("Standort ermittelt. Qibla:", qiblaDirection.toFixed(1) + '°');
                
                // Kompass aktivieren
                setupCompass();
            },
            (error) => {
                console.error('Standortfehler:', error.message);
                coordinates.textContent = 'Standort konnte nicht ermittelt';
                qiblaDegree.textContent = `Qibla: ${qiblaDirection.toFixed(1)}°`;
                
                // Trotzdem Kompass versuchen
                setupCompass();
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Kompass einrichten (mit Berechtigungsabfrage)
    function setupCompass() {
        if (!window.DeviceOrientationEvent) {
            console.log("DeviceOrientation wird nicht unterstützt");
            return;
        }

        // iOS 13+ Berechtigungsanfrage
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        console.log("Kompass-Berechtigung erteilt");
                    } else {
                        console.log("Kompass-Berechtigung verweigert");
                        magneticAlert.textContent = "Kompass-Zugriff wurde blockiert. Bitte Berechtigungen überprüfen.";
                        magneticAlert.style.display = 'flex';
                    }
                })
                .catch(console.error);
        } else {
            // Standard-Browser
            window.addEventListener('deviceorientation', handleOrientation);
            console.log("Kompass-Ereignis hinzugefügt");
        }
    }

    // Initialisierung
    getLocation();

    // Tab-Wechsel im Footer
    const navButtons = document.querySelectorAll('nav button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            console.log("Tab gewechselt zu:", this.textContent.trim());
        });
    });

    // Bildlade-Fehler abfangen
    document.querySelectorAll('img').forEach(img => {
        img.onerror = function() {
            console.error('Bild konnte nicht geladen werden:', this.src);
            // Fallback für Kaaba-Bild
            if (this.alt.includes('Kaaba')) {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzJlN2QzMiIgZD0iTTEyIDJMNCA3djEwbDggNSA4LTVWN0wxMiAyem0wIDIuNUwxOCA3djEwbC02IDMuNUw2IDE3VjdsNi0yLjV6Ii8+PC9zdmc+';
            }
        };
    });

    // Initialisierungsbestätigung
    console.log("App initialisierung abgeschlossen");
});