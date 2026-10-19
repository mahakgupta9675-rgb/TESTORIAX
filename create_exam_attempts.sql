-- SQL Script to create exam_attempts table
CREATE TABLE public.exam_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    current_question INTEGER DEFAULT 0,
    time_remaining INTEGER,
    violations INTEGER DEFAULT 0,
    device_information JSONB,
    browser_information JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own exam attempts" ON public.exam_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam attempts" ON public.exam_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam attempts" ON public.exam_attempts
    FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger (if moddatetime extension is enabled)
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.exam_attempts
--   FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);
