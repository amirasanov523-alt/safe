// Map State
let map;
let startMarker = null;
let endMarker = null;
let routeLine = null;

// Initialize Map
function initMap() {
    // Center on Bishkek, Kyrgyzstan
    // Base Layers
    // Base Layers
    // 1. HD Navigation (CartoDB Voyager) - Clean, fast, sharp
    const voyagerLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 20,
        detectRetina: false // Turned off due to loading issues (black tiles)
    });

    // 2. Dark Mode (CartoDB Dark Matter)
    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 20,
        detectRetina: false
    });

    // Initialize Map with HD Navigation by default
    map = L.map('map', {
        center: [42.8746, 74.5698],
        zoom: 13,
        zoomControl: false, // We'll add it in a better spot if needed, or keep default
        layers: [voyagerLayer]
    });

    // Layer Control
    const baseMaps = {
        "HD Navigation (Clear)": voyagerLayer,
        "Dark Mode (Night)": darkLayer
    };

    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map); // Move zoom to bottom right so it doesn't overlap controls

    // Click Handlers
    map.on('click', handleMapClick);
}

function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (!startMarker) {
        // Set Start
        startMarker = createMarker(lat, lng, 'Start');
        updateUI('start-loc', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, true);
    } else if (!endMarker) {
        // Set End
        endMarker = createMarker(lat, lng, 'End', true); // Red color
        updateUI('end-loc', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, true);

        // Enable Button
        document.getElementById('build-route-btn').disabled = false;
    } else {
        // Reset if both exist
        resetMap();
        startMarker = createMarker(lat, lng, 'Start');
        updateUI('start-loc', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, true);
    }
}

function createMarker(lat, lng, title, isDest = false) {
    const color = isDest ? '#ff4757' : '#00f0ff';
    const markerHtml = `
        <div style="
            background-color: ${color};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 0 10px ${color};
        "></div>
    `;

    const icon = L.divIcon({
        className: 'custom-marker',
        html: markerHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    return L.marker([lat, lng], { icon: icon }).addTo(map);
}

function updateUI(id, text, active = false) {
    const el = document.getElementById(id);
    el.innerText = text;
    if (active) el.classList.add('active');
    else el.classList.remove('active');
}

function resetMap() {
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (routeLine) map.removeLayer(routeLine);
    startMarker = null;
    endMarker = null;
    routeLine = null;
    updateUI('end-loc', 'Click on Map');
    document.getElementById('build-route-btn').disabled = true;
    document.getElementById('route-stats').classList.add('hidden');
}

// API Call
async function buildRoute() {
    if (!startMarker || !endMarker) return;

    const btn = document.getElementById('build-route-btn');
    btn.innerText = "Calculating...";
    btn.disabled = true;

    const payload = {
        start_lat: startMarker.getLatLng().lat,
        start_lon: startMarker.getLatLng().lng,
        end_lat: endMarker.getLatLng().lat,
        end_lon: endMarker.getLatLng().lng,
        safety_preference: parseFloat(document.getElementById('risk-slider').value)
    };

    try {
        const response = await fetch('/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Draw Route
        drawPolyline(data.path_coords);

        // Draw Safety Features
        drawSafetyFeatures(data.safety_features);

        // Show Stats
        document.getElementById('stat-dist').innerText = (data.total_length / 1000).toFixed(2) + ' km';
        document.getElementById('stat-risk').innerText = data.risk_score.toFixed(1);
        document.getElementById('route-stats').classList.remove('hidden');

    } catch (e) {
        alert("Error: " + e);
        console.error(e);
    } finally {
        btn.innerText = "Build Safe Route";
        btn.disabled = false;
    }
}

function drawPolyline(coords) {
    if (routeLine) map.removeLayer(routeLine);

    // Leaflet expects [lat, lng], ensure order
    routeLine = L.polyline(coords, {
        color: '#00f0ff',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10', // Dashed line for effect
        lineCap: 'round'
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
}

function drawSafetyFeatures(features) {
    if (!features) return;

    features.forEach(f => {
        let color = '#00ff00'; // Default Green (Safe)
        if (f.type === 'cctv') color = '#00f0ff'; // Cyan
        if (f.type === 'light') color = '#ffd700'; // Gold

        const iconHtml = `
            <div style="
                background-color: ${color};
                width: 8px;
                height: 8px;
                border-radius: 50%;
                box-shadow: 0 0 8px ${color};
            "></div>
        `;

        const icon = L.divIcon({
            className: 'safety-icon',
            html: iconHtml,
            iconSize: [10, 10]
        });

        L.marker([f.lat, f.lon], { icon: icon })
            .bindPopup(`<b>${f.description}</b>`)
            .addTo(map);
    });
}

// Geolocation
// Geolocation
function locateUser() {
    const btn = document.getElementById('locate-btn');
    const originalText = btn.innerHTML;

    btn.innerHTML = '⌛ Finding...';
    btn.disabled = true;

    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy; // Accuracy in meters

            // Fly to location
            map.flyTo([lat, lng], 15);

            // Remove old accuracy circle if exists
            if (window.userAccuracyCircle) {
                map.removeLayer(window.userAccuracyCircle);
            }

            // Draw Accuracy Circle
            window.userAccuracyCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#00f0ff',
                fillColor: '#00f0ff',
                fillOpacity: 0.15,
                weight: 1
            }).addTo(map);

            // Add Marker
            L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: '<div style="background-color: #00f0ff; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #00f0ff;"></div>',
                    iconSize: [20, 20]
                })
            }).addTo(map)
                .bindPopup(`<b>You are approximately here</b><br>Accuracy: within ${Math.round(accuracy)} meters`)
                .openPopup();

            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        (err) => {
            console.warn(`ERROR(${err.code}): ${err.message}`);
            let msg = "Unable to retrieve your location.";

            if (err.code === 1) { // PERMISSION_DENIED
                msg = "Permission denied. Please allow location access in your browser settings.";
            } else if (err.code === 2) { // POSITION_UNAVAILABLE
                msg = "Location unavailable. Ensure your OS location services are on.";
            } else if (err.code === 3) { // TIMEOUT
                msg = "Location request timed out. Please try again.";
            }

            alert(msg);
            btn.innerHTML = originalText;
            btn.disabled = false;
        },
        options
    );
}

// Event Listeners
document.addEventListener('DOMContentLoaded', initMap);
document.getElementById('build-route-btn').addEventListener('click', buildRoute);
document.getElementById('locate-btn').addEventListener('click', locateUser);
