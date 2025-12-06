from pydantic import BaseModel
from typing import List
import random
import math

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    safety_preference: float = 1.0 

class SafetyFeature(BaseModel):
    type: str # 'cctv', 'police', 'light'
    lat: float
    lon: float
    description: str

class RouteResponse(BaseModel):
    path_coords: List[List[float]]
    total_length: float
    risk_score: float
    warnings: List[str]
    safety_features: List[SafetyFeature] = [] # New: Return map markers

class SafetySimulator:
    """
    Since we don't have real-time police data yet,
    this class simulates 'Safe Zones' for the demo.
    """
    
    @staticmethod
    def generate_features_along_route(path: List[List[float]]) -> List[SafetyFeature]:
        features = []
        # Every ~10 points, maybe add a camera
        step = max(1, len(path) // 5) 
        
        for i in range(0, len(path), step):
            if random.random() > 0.3: # 70% chance of feature
                coord = path[i]
                
                # Randomly pick a safety feature
                f_type = random.choice(['cctv', 'light', 'police'])
                
                if f_type == 'cctv':
                    desc = "Smart City Camera (FaceID)"
                elif f_type == 'light':
                    desc = "LED Street Light (High Visibility)"
                else: 
                    desc = "Police Petrol Station"
                    
                features.append(SafetyFeature(
                    type=f_type,
                    lat=coord[0],
                    lon=coord[1],
                    description=desc
                ))
        return features
