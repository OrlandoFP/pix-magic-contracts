-- Add policies for UPDATE and DELETE on contracts table
CREATE POLICY "Anyone can update contracts" 
ON public.contracts 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete contracts" 
ON public.contracts 
FOR DELETE 
USING (true);