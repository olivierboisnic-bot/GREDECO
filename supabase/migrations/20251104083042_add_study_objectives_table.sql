/*
  # Add Study Objectives Table

  1. New Tables
    - `study_objectives`
      - `id` (uuid, primary key)
      - `quotation_id` (uuid, foreign key to quotations)
      - `name` (text) - Name of the objective (e.g., "Anti-aging efficacy")
      - `timepoints` (text[]) - Array of timepoints for this objective (e.g., ["T0", "T28", "T56"])
      - `service_ids` (uuid[]) - Array of service IDs associated with this objective
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `study_objectives` table
    - Add policy for public read access (for now)

  3. Changes
    - Allows storing multiple objectives per quotation
    - Each objective can have different timepoints
    - Services are linked to specific objectives for precise calculation
*/

-- Create study_objectives table
CREATE TABLE IF NOT EXISTS study_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  timepoints text[] DEFAULT ARRAY['T0', 'T28'],
  service_ids uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE study_objectives ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Allow public read access to study objectives"
  ON study_objectives
  FOR SELECT
  TO public
  USING (true);

-- Create policy for insert access
CREATE POLICY "Allow public insert access to study objectives"
  ON study_objectives
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for update access
CREATE POLICY "Allow public update access to study objectives"
  ON study_objectives
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policy for delete access
CREATE POLICY "Allow public delete access to study objectives"
  ON study_objectives
  FOR DELETE
  TO public
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_study_objectives_quotation_id ON study_objectives(quotation_id);