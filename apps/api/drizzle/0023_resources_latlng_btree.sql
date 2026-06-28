-- Migration 0023: B-tree index on (latitude, longitude) for bounding-box scans.
-- Speeds up: WHERE latitude BETWEEN minLat AND maxLat AND longitude BETWEEN minLng AND maxLng
CREATE INDEX IF NOT EXISTS resources_latlng ON resources (latitude, longitude);
