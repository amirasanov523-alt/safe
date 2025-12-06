import math
from typing import Dict, List, Optional
from dataclasses import dataclass
from pydantic import BaseModel

# --- API Models ---
class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    safety_preference: float = 1.0  # 0.0 (Fastest) to 5.0 (Safest)

class RouteResponse(BaseModel):
    path_coords: List[List[float]] # [[lat, lon], ...]
    total_length: float
    risk_score: float
    warnings: List[str]

# --- Core Logic ---
@dataclass
class RoadSegment:
    id: int
    length_meters: float
    road_type: str 
    lighting_level: float 
    crime_count_near: int
    has_surveillance: bool
    
class RiskModel:
    def __init__(self):
        self.weights = {
            'lighting': 0.4,
            'crime': 0.5,
            'road_type': 0.1
        }
        self.road_type_risk = {
            'primary': 0.2,
            'residential': 0.4,
            'park': 0.6,
            'alley': 0.9
        }

    def normalize(self, value: float, min_v: float, max_v: float) -> float:
        return max(0.0, min(1.0, (value - min_v) / (max_v - min_v)))

    def calculate_segment_risk(self, segment: RoadSegment) -> float:
        lighting_risk = 1.0 - segment.lighting_level
        crime_risk = self.normalize(segment.crime_count_near, 0, 10)
        type_risk = self.road_type_risk.get(segment.road_type, 0.5)
        cam_modifier = 0.8 if segment.has_surveillance else 1.0
        
        raw_score = (
            (lighting_risk * self.weights['lighting']) +
            (crime_risk * self.weights['crime']) +
            (type_risk * self.weights['road_type'])
        ) * cam_modifier
        return round(raw_score * 100, 2)
