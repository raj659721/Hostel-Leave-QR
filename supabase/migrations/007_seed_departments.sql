INSERT INTO public.departments (name, description)
VALUES
  ('CSE', 'Computer Science and Engineering'),
  ('ECE', 'Electronics and Communication Engineering'),
  ('ME', 'Mechanical Engineering'),
  ('CE', 'Civil Engineering'),
  ('EEE', 'Electrical and Electronics Engineering'),
  ('IT', 'Information Technology'),
  ('Other', 'Other Department')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = now();
