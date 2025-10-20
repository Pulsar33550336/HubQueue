-- Create the 'images' table
CREATE TABLE public.images (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    webdav_path character varying NOT NULL,
    status character varying NOT NULL,
    uploaded_by character varying NOT NULL,
    claimed_by character varying,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz,
    CONSTRAINT images_pkey PRIMARY KEY (id)
);

-- Create the 'history' table
CREATE TABLE public.history (
    id uuid NOT NULL,
    name character varying NOT NULL,
    webdav_path character varying NOT NULL,
    status character varying NOT NULL,
    uploaded_by character varying NOT NULL,
    claimed_by character varying,
    created_at timestamptz NOT NULL,
    claimed_at timestamptz,
    completed_by character varying,
    completed_at timestamptz,
    completion_notes text,
    CONSTRAINT history_pkey PRIMARY KEY (id)
);

-- Create the 'users' table
CREATE TABLE public.users (
    username character varying NOT NULL,
    password_hash character varying NOT NULL,
    role character varying NOT NULL DEFAULT 'user'::character varying,
    CONSTRAINT users_pkey PRIMARY KEY (username)
);

-- Create the 'system_settings' table
CREATE TABLE public.system_settings (
    key character varying NOT NULL,
    value jsonb,
    CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

-- Create the function to move a record from 'images' to 'history'
CREATE OR REPLACE FUNCTION public.move_to_history(
    p_id uuid,
    p_completed_by character varying,
    p_completed_at timestamptz,
    p_completion_notes text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Move the record from images to history
    INSERT INTO public.history (
        id, name, webdav_path, status, uploaded_by, claimed_by, created_at, claimed_at,
        completed_by, completed_at, completion_notes
    )
    SELECT
        id, name, webdav_path, 'completed', uploaded_by, claimed_by, created_at, claimed_at,
        p_completed_by, p_completed_at, p_completion_notes
    FROM public.images
    WHERE id = p_id;

    -- Delete the record from images
    DELETE FROM public.images
    WHERE id = p_id;
END;
$$;

-- Create the function to get the last activity timestamp
CREATE OR REPLACE FUNCTION public.get_last_activity_timestamp()
RETURNS timestamptz
LANGUAGE sql
AS $$
    SELECT GREATEST(
        (SELECT MAX(created_at) FROM public.images),
        (SELECT MAX(completed_at) FROM public.history)
    );
$$;

-- Grant permissions on the tables
GRANT ALL ON TABLE public.images TO service_role;
GRANT ALL ON TABLE public.history TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.system_settings TO service_role;

-- Grant execute permission on the functions
GRANT EXECUTE ON FUNCTION public.move_to_history(uuid, character varying, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_last_activity_timestamp() TO service_role;
