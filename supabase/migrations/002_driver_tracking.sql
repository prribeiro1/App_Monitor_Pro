-- Driver Tracking Tables for Real-Time Location
-- This migration creates the necessary tables for driver location tracking

-- Table to store current driver location (snapshot every minute as fallback)
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION, -- Direction in degrees (0-360)
    speed DOUBLE PRECISION, -- Speed in km/h
    accuracy DOUBLE PRECISION, -- GPS accuracy in meters
    is_tracking_active BOOLEAN DEFAULT true,
    route_id TEXT, -- Optional: which route is being navigated
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_driver_locations_user_id ON driver_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_updated_at ON driver_locations(updated_at);

-- Enable RLS
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers can insert/update their own location
CREATE POLICY "drivers_insert_own_location" ON driver_locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "drivers_update_own_location" ON driver_locations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "drivers_select_own_location" ON driver_locations
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Anyone can read driver locations (for parents to track)
-- This is intentionally public for the tracking page
CREATE POLICY "public_read_active_tracking" ON driver_locations
    FOR SELECT USING (is_tracking_active = true);

-- Table to store tracking share links (for parents)
CREATE TABLE IF NOT EXISTS tracking_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_code TEXT UNIQUE NOT NULL, -- Short code like "ABC123"
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by share code
CREATE INDEX IF NOT EXISTS idx_tracking_links_share_code ON tracking_links(share_code);

-- Enable RLS
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

-- Policy: Drivers manage their own links
CREATE POLICY "drivers_manage_own_links" ON tracking_links
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Anyone can read active links (to validate share codes)
CREATE POLICY "public_read_active_links" ON tracking_links
    FOR SELECT USING (is_active = true);

-- Function to generate short share code
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for driver_locations (for Broadcast)
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
