-- AI Proctoring Schema

-- Create the proctoring_sessions table
CREATE TABLE IF NOT EXISTS public.proctoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL,
    user_id UUID NOT NULL,
    test_id UUID NOT NULL,
    camera_enabled BOOLEAN DEFAULT false,
    microphone_enabled BOOLEAN DEFAULT false,
    security_score INTEGER DEFAULT 100,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookups by attempt_id
CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_attempt_id ON public.proctoring_sessions(attempt_id);

-- Create the proctoring_events table
CREATE TABLE IF NOT EXISTS public.proctoring_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.proctoring_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- e.g., 'face_missing', 'multiple_faces', 'camera_disconnected', 'snapshot'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_proctoring_events_session_id ON public.proctoring_events(session_id);

-- Create Storage Bucket for Snapshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam_snapshots', 'exam_snapshots', false) 
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for exam_snapshots
-- Allow authenticated users to upload snapshots (candidates)
CREATE POLICY "Allow candidates to upload snapshots" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'exam_snapshots');

-- Allow authenticated users to read snapshots (creators reviewing)
CREATE POLICY "Allow authenticated users to read snapshots" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'exam_snapshots');
