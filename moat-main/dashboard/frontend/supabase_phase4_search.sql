-- Phase 4: Enterprise Patent Search Schema & Seed Data

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.patent_search (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patent_number TEXT UNIQUE NOT NULL,
    publication_number TEXT,
    application_number TEXT,
    title TEXT NOT NULL,
    abstract TEXT,
    description TEXT,
    claims TEXT,
    inventors JSONB DEFAULT '[]'::jsonb,
    assignees JSONB DEFAULT '[]'::jsonb,
    ipc_codes JSONB DEFAULT '[]'::jsonb,
    cpc_codes JSONB DEFAULT '[]'::jsonb,
    keywords JSONB DEFAULT '[]'::jsonb,
    country TEXT,
    status TEXT,
    technology TEXT,
    filing_date DATE,
    publication_date DATE,
    grant_date DATE,
    pdf_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    legal_status JSONB DEFAULT '{}'::jsonb,
    citations INTEGER DEFAULT 0,
    fts TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(claims, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'D')
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_patent_search_number ON public.patent_search (patent_number);
CREATE INDEX IF NOT EXISTS idx_patent_search_country ON public.patent_search (country);
CREATE INDEX IF NOT EXISTS idx_patent_search_status ON public.patent_search (status);
CREATE INDEX IF NOT EXISTS idx_patent_search_filing_date ON public.patent_search (filing_date);
CREATE INDEX IF NOT EXISTS idx_patent_search_fts ON public.patent_search USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_patent_search_assignees ON public.patent_search USING GIN (assignees);
CREATE INDEX IF NOT EXISTS idx_patent_search_inventors ON public.patent_search USING GIN (inventors);

-- 3. RLS Policies
ALTER TABLE public.patent_search ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view patents" ON public.patent_search;
CREATE POLICY "Anyone can view patents"
    ON public.patent_search FOR SELECT
    USING (true);

-- 4. Seed Data (10 Mock Patents)
INSERT INTO public.patent_search (
    patent_number, title, abstract, claims, description, inventors, assignees, 
    ipc_codes, cpc_codes, keywords, country, status, technology, 
    filing_date, publication_date, grant_date, citations
) VALUES 
(
    'US10987234B2', 
    'Continuous non-invasive blood glucose monitoring system utilizing AI', 
    'A wearable device for continuously monitoring blood glucose levels using optical sensors and a neural network classifier.',
    '1. A system comprising an optical sensor... 2. The system of claim 1, further comprising a neural network...',
    'Detailed description of the neural network architecture and optical sensor calibration...',
    '["Sarah Chen", "Michael Wong"]', '["HealthTech Innovations LLC"]',
    '["A61B 5/1455", "A61B 5/00"]', '["A61B 5/14532"]', '["ai", "wearable", "glucose", "sensor"]',
    'US', 'Active', 'wearables', '2021-03-14', '2023-04-25', '2023-04-25', 47
),
(
    'EP3456789A1', 
    'Solid-state battery architecture with composite solid electrolyte', 
    'A solid-state battery featuring a novel composite solid electrolyte layer that enhances lithium-ion conductivity.',
    '1. A solid-state battery comprising a cathode, an anode, and a composite solid electrolyte... 2. The battery of claim 1 wherein the solid electrolyte comprises a sulfide-based material...',
    'The present invention relates generally to energy storage devices, and more particularly to solid-state batteries...',
    '["Kenji Tanaka", "Yuki Sato"]', '["NextGen Energy Corp"]',
    '["H01M 10/0562", "H01M 10/052"]', '["H01M 10/0562"]', '["battery", "solid-state", "electrolyte"]',
    'EP', 'Pending', 'battery', '2022-08-11', '2024-02-15', null, 12
),
(
    'US11234567B1', 
    'Autonomous drone navigation using lightweight visual transformers', 
    'An unmanned aerial vehicle system that uses lightweight visual transformers for real-time obstacle avoidance.',
    '1. An autonomous aerial vehicle comprising at least one camera and a processor... 2. The vehicle of claim 1 wherein the processor executes a visual transformer model...',
    'Drones or unmanned aerial vehicles (UAVs) require robust navigation systems...',
    '["Alice Reynolds", "Bob Smith"]', '["AeroAI Systems"]',
    '["B64C 39/02", "G05D 1/00"]', '["B64U 20/00"]', '["drone", "ai", "transformer", "navigation"]',
    'US', 'Active', 'drone', '2020-11-05', '2022-01-20', '2022-01-20', 85
),
(
    'CN110987654A', 
    'Machine learning method for optimizing data center power usage', 
    'A control system that dynamically adjusts cooling and power distribution in a data center based on predicted workloads using machine learning.',
    '1. A method for optimizing power usage comprising collecting temperature data... 2. The method of claim 1, further comprising training a reinforcement learning agent...',
    'Data centers consume massive amounts of electricity... The present disclosure solves this...',
    '["Li Wei", "Zhang Min"]', '["CloudCompute Tech Ltd"]',
    '["G06F 1/32", "H05K 7/20"]', '["G06F 1/3203"]', '["ai", "ml", "power", "optimization"]',
    'CN', 'Active', 'ai', '2019-05-22', '2020-04-10', '2021-09-05', 134
),
(
    'WO2023012345A1', 
    'Flexible image sensor for biometric authentication', 
    'A flexible image sensor array embedded in a display for high-resolution fingerprint and vein pattern recognition.',
    '1. A biometric authentication system comprising a flexible substrate... 2. The system of claim 1 wherein the image sensor detects near-infrared light...',
    'Biometric authentication on mobile devices requires... This flexible image sensor achieves...',
    '["David Kim", "John Doe"]', '["DisplayTech Industries"]',
    '["G06V 40/12", "H01L 27/146"]', '["G06V 40/136"]', '["image", "sensor", "biometric"]',
    'WO', 'Pending', 'sensor', '2022-07-30', '2023-02-09', null, 5
),
(
    'US10567890B2', 
    'Smart wearable garment with integrated physiological sensors', 
    'A smart shirt integrating conductive threads and biosensors for real-time ECG and respiration monitoring.',
    '1. A wearable garment comprising a fabric base... 2. The garment of claim 1 further comprising an ECG sensor...',
    'Continuous physiological monitoring is important for athletic performance...',
    '["Elena Rostova"]', '["FitTech Wearables"]',
    '["A61B 5/024", "A41D 1/00"]', '["A61B 5/02438"]', '["wearable", "sensor", "ecg"]',
    'US', 'Expired', 'wearables', '2015-02-14', '2016-08-18', '2019-01-10', 215
),
(
    'JP2021054321A', 
    'Fast-charging lithium-ion battery with silicon-graphene anode', 
    'A secondary battery utilizing a structured silicon-graphene composite anode to enable rapid charging without degradation.',
    '1. A lithium-ion secondary battery comprising... 2. The battery of claim 1 wherein the anode comprises a silicon-graphene composite...',
    'Electric vehicles require batteries that can charge quickly... The silicon-graphene anode...',
    '["Hiroshi Tanaka"]', '["Tokyo Energy Solutions"]',
    '["H01M 4/38", "H01M 4/587"]', '["H01M 4/386"]', '["battery", "charging", "anode"]',
    'JP', 'Active', 'battery', '2020-09-12', '2021-04-05', '2022-11-20', 62
),
(
    'US11456789B2', 
    'AI-driven drone swarm coordination for agricultural mapping', 
    'A method for coordinating multiple UAVs to map agricultural fields using distributed AI algorithms.',
    '1. A method for coordinating a drone swarm... 2. The method of claim 1 wherein each drone executes a local path planning algorithm...',
    'Precision agriculture requires detailed mapping... A single drone is inefficient...',
    '["Samantha Lee"]', '["AgriDrone Dynamics"]',
    '["G05D 1/10", "A01B 79/00"]', '["G05D 1/104"]', '["drone", "ai", "agriculture"]',
    'US', 'Active', 'drone', '2021-06-05', '2022-12-10', '2023-08-15', 31
),
(
    'EP4012345A1', 
    'Advanced machine learning for predictive maintenance of wind turbines', 
    'A predictive maintenance system that uses vibration sensors and an anomaly detection ML model for wind turbines.',
    '1. A predictive maintenance system comprising vibration sensors... 2. The system of claim 1 wherein the ML model is an autoencoder...',
    'Wind turbines are prone to mechanical failures... Early detection using machine learning...',
    '["Lars Jensen"]', '["Nordic Wind Power"]',
    '["G05B 23/02", "F03D 17/00"]', '["G05B 23/0283"]', '["ml", "sensor", "predictive"]',
    'EP', 'Pending', 'ml', '2022-11-01', '2023-05-15', null, 8
),
(
    'US10123456B2', 
    'Image processing pipeline for low-light smartphone photography', 
    'A computational photography method that merges multiple underexposed frames using a neural network to produce a well-lit image.',
    '1. A method for processing digital images... 2. The method of claim 1 comprising aligning multiple frames...',
    'Smartphone cameras struggle in low-light conditions... This image processing pipeline...',
    '["Kevin Wu", "Jessica Lin"]', '["Global Smartphone Corp"]',
    '["H04N 5/232", "G06T 5/00"]', '["H04N 5/23229"]', '["image", "ai", "photography"]',
    'US', 'Active', 'image', '2017-08-20', '2018-02-22', '2019-10-30', 402
)
ON CONFLICT (patent_number) DO NOTHING;
