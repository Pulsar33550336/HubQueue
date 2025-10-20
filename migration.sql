-- This migration script converts timestamp columns from a numeric type (like bigint, assuming milliseconds) to TIMESTAMPTZ.

-- Alter 'images' table
-- We cast the numeric value to double precision before dividing to avoid integer division issues.
ALTER TABLE images ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING to_timestamp(("createdAt"::double precision) / 1000);
ALTER TABLE images ALTER COLUMN "claimedAt" TYPE TIMESTAMPTZ USING to_timestamp(("claimedAt"::double precision) / 1000);

-- Alter 'history' table
ALTER TABLE history ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING to_timestamp(("createdAt"::double precision) / 1000);
ALTER TABLE history ALTER COLUMN "claimedAt" TYPE TIMESTAMPTZ USING to_timestamp(("claimedAt"::double precision) / 1000);
ALTER TABLE history ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ USING to_timestamp(("completedAt"::double precision) / 1000);
