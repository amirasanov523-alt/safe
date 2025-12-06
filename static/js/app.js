// Map State
let map;
let startMarker = null;
let endMarker = null;
let routeLine = null;

// Initialize Map
function initMap() {
    // Center on Bishkek, Kyrgyzstan
    map = L.map('map').setView([42.8746, 74.5698], 13);

    // Dark Matter Tiles (Premium Look, Free)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

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

// Event Listeners
document.addEventListener('DOMContentLoaded', initMap);
document.getElementById('build-route-btn').addEventListener('click', buildRoute);
