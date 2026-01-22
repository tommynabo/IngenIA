-- Add plan_interval column to licenses table to track subscription type (month/year)
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS plan_interval text;
