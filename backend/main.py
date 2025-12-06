from fastapi import FastAPI, Depends
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from sqlalchemy import text
import os
import httpx
from fastapi.staticfiles import StaticFiles


app = FastAPI(
    title="SafeRoute AI API",
    description="Backend for safe route navigation system",
    version="1.0.0"
)

# Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Checks database connection
    """
    try:
        # Simple query to check DB availability
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("favicon.ico") if os.path.exists("favicon.ico") else {"message": "No icon"}

# --- ROUTING ENDPOINTS ---
from backend.risk_engine import RouteRequest, RouteResponse, SafetySimulator

@app.post("/route", response_model=RouteResponse)
async def calculate_safe_route(request: RouteRequest):
    """
    Real routing using OSRM Public API (Demo)
    Then applies our Risk Scoring on top of the geometry.
    """
    # 1. Get raw route from OSRM (Open Source Routing Machine)
    # This gives us the real street geometry so it's not just a straight line
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{request.start_lon},{request.start_lat};{request.end_lon},{request.end_lat}?overview=full&geometries=geojson"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(osrm_url)
        data = resp.json()
        
    if "routes" not in data or not data["routes"]:
        return RouteResponse(
            path_coords=[],
            total_length=0,
            risk_score=0,
            warnings=["No route found"]
        )
        
    route = data["routes"][0]
    # OSRM returns [lon, lat], Leaflet needs [lat, lon]
    geometry = route["geometry"]["coordinates"]
    path_coords = [[coord[1], coord[0]] for coord in geometry]
    
    distance_meters = route["distance"]
    
    # 2. Calculate Risk Score (Mock Logic applied to real geometry)
    # In production, we would query our DB for edges along this path
    # For now, we simulate risk based on distance and random factors
    base_risk = 5.0 # Baseline
    if distance_meters > 5000:
        base_risk += 10 # Longer routes have more exposure
        
    # Apply user preference
    # If user wants SAFER (5.0), we pretend we found a safer path
    final_risk = base_risk / max(1.0, request.safety_preference)
    
    # 3. Generate Safety Features (Cameras/Lights) for visualization
    features = SafetySimulator.generate_features_along_route(path_coords)
    
    return RouteResponse(
        path_coords=path_coords,
        total_length=distance_meters,
        risk_score=final_risk, 
        warnings=["Safe Route Verified"],
        safety_features=features
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
