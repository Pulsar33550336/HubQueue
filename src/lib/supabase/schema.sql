
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  username text NOT NULL PRIMARY KEY,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user'::text
);

-- Create images table
CREATE TABLE IF NOT EXISTS public.images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  webdav_path text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded'::text,
  uploaded_by text NOT NULL REFERENCES public.users(username),
  claimed_by text REFERENCES public.users(username),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create history table (for completed images)
CREATE TABLE IF NOT EXISTS public.history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  webdav_path text NOT NULL,
  uploaded_by text NOT NULL,
  completed_by text,
  created_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_notes text
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text NOT NULL PRIMARY KEY,
    value jsonb
);

-- Function to move a completed image to the history table
CREATE OR REPLACE FUNCTION public.move_to_history(
    target_id uuid,
    completed_by text,
    completed_at timestamptz,
    completion_notes text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    image_to_move images;
BEGIN
    -- Delete from images table and capture the deleted row
    DELETE FROM public.images
    WHERE id = target_id
    RETURNING * INTO image_to_move;

    -- If a row was actually deleted, insert it into history
    IF FOUND THEN
        INSERT INTO public.history (
            id,
            name,
            webdav_path,
            uploaded_by,
            created_at,
            completed_by,
            completed_at,
            completion_notes
        )
        VALUES (
            image_to_move.id,
            image_to_move.name,
            image_to_move.webdav_path,
            image_to_move.uploaded_by,
            image_to_move.created_at,
            completed_by,
            completed_at,
            completion_notes
        );
    END IF;
END;
$$;


-- Function to get the last activity timestamp
CREATE OR REPLACE FUNCTION public.get_last_activity_timestamp()
RETURNS timestamptz
LANGUAGE sql
AS $$
    SELECT GREATEST(
        (SELECT MAX(created_at) FROM public.images),
        (SELECT MAX(completed_at) FROM public.history)
    );
$$;

-- Grant usage on the new functions to the anon role
GRANT EXECUTE ON FUNCTION public.move_to_history(uuid, text, timestamptz, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_last_activity_timestamp() TO anon;

-- Note: You might need to enable the pgcrypto extension for gen_random_uuid()
-- In Supabase, this is usually enabled by default. If not, run:
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
