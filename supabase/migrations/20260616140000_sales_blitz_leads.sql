-- Sales Blitz Leads table for Jeddah Medical campaign
CREATE TABLE IF NOT EXISTS sales_blitz_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic       text NOT NULL,
  contact      text NOT NULL DEFAULT '',
  phone        text NOT NULL DEFAULT '',
  segment      text NOT NULL DEFAULT 'general' CHECK (segment IN ('dental','skin','general')),
  area         text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('meeting_booked','silent','pending','won','lost')),
  notes        text NOT NULL DEFAULT '',
  campaign     text NOT NULL DEFAULT 'jeddah-medical-2026',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE sales_blitz_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only" ON sales_blitz_leads USING (true) WITH CHECK (true);

CREATE INDEX ON sales_blitz_leads(campaign);
CREATE INDEX ON sales_blitz_leads(status);
