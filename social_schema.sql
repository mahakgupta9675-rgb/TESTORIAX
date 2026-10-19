-- 1. Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(follower_id, following_id),
    CONSTRAINT follows_no_self_follow CHECK (follower_id != following_id)
);

-- 2. Create notifications table (if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Follows RLS Policies
DROP POLICY IF EXISTS "Allow select for all" ON public.follows;
CREATE POLICY "Allow select for all" ON public.follows
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow insert for own user" ON public.follows;
CREATE POLICY "Allow insert for own user" ON public.follows
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Allow delete for own user" ON public.follows;
CREATE POLICY "Allow delete for own user" ON public.follows
    FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 5. Notifications RLS Policies
DROP POLICY IF EXISTS "Allow select for own notifications" ON public.notifications;
CREATE POLICY "Allow select for own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update for own notifications" ON public.notifications;
CREATE POLICY "Allow update for own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.notifications;
CREATE POLICY "Allow insert for authenticated" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Helper Function: notify_followers_on_publish
CREATE OR REPLACE FUNCTION public.notify_followers_on_publish()
RETURNS TRIGGER AS $$
DECLARE
    creator_name TEXT;
    follower_record RECORD;
BEGIN
    -- Only trigger if status changed to 'published' and it is public
    IF NEW.status = 'published' AND OLD.status != 'published' AND NEW.visibility = 'public' THEN
        -- Get creator's name
        SELECT full_name INTO creator_name FROM public.profiles WHERE id = NEW.creator_id;
        IF creator_name IS NULL THEN
            creator_name := 'A creator';
        END IF;

        -- Loop through all followers and create a notification
        FOR follower_record IN SELECT follower_id FROM public.follows WHERE following_id = NEW.creator_id LOOP
            INSERT INTO public.notifications (user_id, type, title, message, reference_id)
            VALUES (
                follower_record.follower_id,
                'new_test',
                creator_name || ' published a new test: ' || NEW.title,
                NEW.description,
                NEW.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create Trigger for tests table
DROP TRIGGER IF EXISTS trigger_notify_followers ON public.tests;
CREATE TRIGGER trigger_notify_followers
    AFTER UPDATE ON public.tests
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_followers_on_publish();
