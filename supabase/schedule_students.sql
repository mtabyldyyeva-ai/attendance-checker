-- Create schedule_students junction table
CREATE TABLE IF NOT EXISTS public.schedule_students (
  schedule_id uuid REFERENCES public.schedule(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (schedule_id, student_id)
);

-- Enable RLS
ALTER TABLE public.schedule_students ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.schedule_students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert access for admin" ON public.schedule_students FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
CREATE POLICY "Enable delete access for admin" ON public.schedule_students FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
