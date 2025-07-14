-- Add Minato AI Video Intelligence feature tables
-- This migration adds tables for video surveillance, analysis, alerts, and reporting

-- Table for storing video streams/sources
CREATE TABLE IF NOT EXISTS video_intelligence_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stream_type TEXT NOT NULL DEFAULT 'camera' CHECK (stream_type IN ('camera', 'upload', 'rtsp', 'file')),
  stream_url TEXT, -- For RTSP streams or file URLs
  stream_config JSONB DEFAULT '{}', -- Configuration for stream (resolution, fps, etc.)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  location TEXT, -- Physical location description
  zone_definitions JSONB DEFAULT '[]', -- Defined danger zones, restricted areas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_analysis_at TIMESTAMP WITH TIME ZONE,
  
  -- Create index for user lookups
  CONSTRAINT fk_video_stream_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing video analysis results
CREATE TABLE IF NOT EXISTS video_intelligence_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_file_path TEXT, -- Path to analyzed video file
  frame_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('child_safety', 'fall_detection', 'intrusion_detection', 'behavior_analysis', 'general_surveillance')),
  
  -- Analysis results
  detected_objects JSONB DEFAULT '[]', -- Objects detected in frame
  detected_people JSONB DEFAULT '[]', -- People detected with basic info
  danger_zones_violated JSONB DEFAULT '[]', -- Which zones were violated
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0 to 1.0
  
  -- AI Analysis
  scene_description TEXT, -- AI description of the scene
  threat_analysis TEXT, -- Specific threat analysis
  recommended_actions JSONB DEFAULT '[]', -- Recommended actions
  
  -- Frame data
  frame_data JSONB, -- Base64 encoded frame or reference
  frame_metadata JSONB DEFAULT '{}', -- Frame technical metadata
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_video_analysis_stream FOREIGN KEY (stream_id) REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_analysis_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing alerts and notifications
CREATE TABLE IF NOT EXISTS video_intelligence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES video_intelligence_analysis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical_danger', 'intruder_alert', 'fall_detected', 'child_safety', 'behavior_anomaly', 'zone_violation')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  alert_data JSONB DEFAULT '{}', -- Additional alert data
  
  -- Response tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification settings
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_methods JSONB DEFAULT '[]', -- ['push', 'email', 'sms', 'voice']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_video_alert_stream FOREIGN KEY (stream_id) REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_alert_analysis FOREIGN KEY (analysis_id) REFERENCES video_intelligence_analysis(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_alert_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table for storing video intelligence reports
CREATE TABLE IF NOT EXISTS video_intelligence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES video_intelligence_streams(id) ON DELETE CASCADE,
  
  report_type TEXT NOT NULL CHECK (report_type IN ('daily_summary', 'incident_report', 'safety_analysis', 'custom_report')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Report data
  report_data JSONB NOT NULL DEFAULT '{}',
  analysis_period_start TIMESTAMP WITH TIME ZONE,
  analysis_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  total_alerts INTEGER DEFAULT 0,
  critical_alerts INTEGER DEFAULT 0,
  incidents_detected INTEGER DEFAULT 0,
  
  -- Report generation
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by TEXT DEFAULT 'system',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_video_report_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_video_report_stream FOREIGN KEY (stream_id) REFERENCES video_intelligence_streams(id) ON DELETE CASCADE
);

-- Table for storing video intelligence settings
CREATE TABLE IF NOT EXISTS video_intelligence_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- General settings
  enabled BOOLEAN DEFAULT TRUE,
  analysis_sensitivity TEXT DEFAULT 'medium' CHECK (analysis_sensitivity IN ('low', 'medium', 'high')),
  
  -- Alert settings
  alert_preferences JSONB DEFAULT '{}', -- User preferences for alerts
  notification_methods JSONB DEFAULT '["push"]', -- Default notification methods
  quiet_hours JSONB DEFAULT '{}', -- Quiet hours configuration
  
  -- Analysis settings
  analysis_types JSONB DEFAULT '["child_safety", "fall_detection", "intrusion_detection"]', -- Enabled analysis types
  frame_analysis_interval INTEGER DEFAULT 5, -- Seconds between frame analysis
  
  -- Voice intervention settings
  voice_intervention_enabled BOOLEAN DEFAULT TRUE,
  voice_intervention_messages JSONB DEFAULT '{}', -- Custom voice messages
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one settings record per user
  UNIQUE(user_id),
  CONSTRAINT fk_video_settings_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_streams_user_id ON video_intelligence_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_video_streams_status ON video_intelligence_streams(status);

CREATE INDEX IF NOT EXISTS idx_video_analysis_stream_id ON video_intelligence_analysis(stream_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_user_id ON video_intelligence_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_timestamp ON video_intelligence_analysis(frame_timestamp);
CREATE INDEX IF NOT EXISTS idx_video_analysis_risk_level ON video_intelligence_analysis(risk_level);

CREATE INDEX IF NOT EXISTS idx_video_alerts_user_id ON video_intelligence_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_video_alerts_stream_id ON video_intelligence_alerts(stream_id);
CREATE INDEX IF NOT EXISTS idx_video_alerts_status ON video_intelligence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_video_alerts_priority ON video_intelligence_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_video_alerts_created_at ON video_intelligence_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_video_reports_user_id ON video_intelligence_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_video_reports_stream_id ON video_intelligence_reports(stream_id);
CREATE INDEX IF NOT EXISTS idx_video_reports_generated_at ON video_intelligence_reports(generated_at);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE video_intelligence_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_intelligence_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_intelligence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_intelligence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_intelligence_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_intelligence_streams
CREATE POLICY "Users can view their own video streams" ON video_intelligence_streams
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video streams" ON video_intelligence_streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video streams" ON video_intelligence_streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video streams" ON video_intelligence_streams
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for video_intelligence_analysis
CREATE POLICY "Users can view their own video analysis" ON video_intelligence_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video analysis" ON video_intelligence_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for video_intelligence_alerts
CREATE POLICY "Users can view their own video alerts" ON video_intelligence_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video alerts" ON video_intelligence_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video alerts" ON video_intelligence_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for video_intelligence_reports
CREATE POLICY "Users can view their own video reports" ON video_intelligence_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video reports" ON video_intelligence_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video reports" ON video_intelligence_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for video_intelligence_settings
CREATE POLICY "Users can view their own video settings" ON video_intelligence_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video settings" ON video_intelligence_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video settings" ON video_intelligence_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_video_intelligence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamps
CREATE TRIGGER update_video_intelligence_streams_updated_at
  BEFORE UPDATE ON video_intelligence_streams
  FOR EACH ROW EXECUTE FUNCTION update_video_intelligence_updated_at();

CREATE TRIGGER update_video_intelligence_alerts_updated_at
  BEFORE UPDATE ON video_intelligence_alerts
  FOR EACH ROW EXECUTE FUNCTION update_video_intelligence_updated_at();

CREATE TRIGGER update_video_intelligence_settings_updated_at
  BEFORE UPDATE ON video_intelligence_settings
  FOR EACH ROW EXECUTE FUNCTION update_video_intelligence_updated_at();

-- Create a function to initialize default settings for new users
CREATE OR REPLACE FUNCTION initialize_video_intelligence_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO video_intelligence_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize settings when user is created
CREATE TRIGGER initialize_user_video_intelligence_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_video_intelligence_settings(); 