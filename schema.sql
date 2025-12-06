-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;

-- 1. NODES: Intersections and graph vertices
CREATE TABLE nodes (
    id BIGINT PRIMARY KEY,
    osm_id BIGINT,
    lon FLOAT,
    lat FLOAT,
    geom GEOMETRY(Point, 4326) -- WGS84 coordinates
);
CREATE INDEX idx_nodes_geom ON nodes USING GIST(geom);

-- 2. EDGES: Road segments (The Graph)
CREATE TABLE edges (
    id BIGINT PRIMARY KEY,
    osm_id BIGINT,
    source_node BIGINT REFERENCES nodes(id),
    target_node BIGINT REFERENCES nodes(id),
    
    -- Physical attributes
    length_meters FLOAT NOT NULL,
    max_speed INT,
    road_type VARCHAR(50), -- residential, primary, pedestrian
    
    -- Dynamic Risk Attributes (Updating regularly)
    lighting_score FLOAT DEFAULT 0.5, -- 0 (Dark) to 1 (Bright)
    crime_density FLOAT DEFAULT 0.0,  -- 0 (Safe) to 1 (Dangerous)
    traffic_density FLOAT DEFAULT 0.0,
    
    -- Calculated Costs
    cost_time FLOAT, -- length / speed
    cost_safety FLOAT, -- The "RiskScore" weight
    
    geom GEOMETRY(LineString, 4326)
);
CREATE INDEX idx_edges_geom ON edges USING GIST(geom);
CREATE INDEX idx_edges_source ON edges(source_node);
CREATE INDEX idx_edges_target ON edges(target_node);

-- 3. RISK EVENTS: Raw data methodology
CREATE TABLE risk_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'theft', 'assault', 'accident', 'dark_spot'
    severity INT CHECK (severity BETWEEN 1 AND 10),
    event_time TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(50), -- 'police_api', 'user_report', 'sensor'
    confirmed BOOLEAN DEFAULT FALSE,
    geom GEOMETRY(Point, 4326)
);
CREATE INDEX idx_risk_events_geom ON risk_events USING GIST(geom);
CREATE INDEX idx_risk_events_time ON risk_events(event_time);

-- 4. USER REVIEWS / ZONES
CREATE TABLE safety_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    risk_level INT, -- 1=Safe, 5=Dangerous
    description TEXT,
    geom GEOMETRY(Polygon, 4326)
);
