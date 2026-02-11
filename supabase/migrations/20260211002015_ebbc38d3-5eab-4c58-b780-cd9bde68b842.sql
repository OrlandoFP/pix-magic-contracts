
-- Create table for blocked (lotado) dates per guide
CREATE TABLE public.blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_name TEXT NOT NULL,
  blocked_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT 'lotado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(guide_name, blocked_date)
);

-- Enable RLS
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- Public policies (matches app pattern - no auth)
CREATE POLICY "Anyone can view blocked dates"
ON public.blocked_dates FOR SELECT USING (true);

CREATE POLICY "Anyone can create blocked dates"
ON public.blocked_dates FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete blocked dates"
ON public.blocked_dates FOR DELETE USING (true);
