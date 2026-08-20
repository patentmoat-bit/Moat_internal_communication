def get_ceo_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "Innovation ROI", "value": "320%", "trend": "+12.4%", "trendDirection": "up", "description": "YoY Return on R&D Spend"},
            {"id": "w2", "type": "kpi", "title": "Portfolio Value", "value": "$84.2M", "trend": "+5.4%", "trendDirection": "up", "description": "Estimated Intangible Asset Value"},
            {"id": "w3", "type": "kpi", "title": "Pipeline Risk", "value": "Low", "trend": "-2.1%", "trendDirection": "down", "description": "Prior Art Collision Exposure"},
            {"id": "w4", "type": "kpi", "title": "Licensing Revenue", "value": "$12.4M", "trend": "+18%", "trendDirection": "up", "description": "Active Licensing Agreements"},
        ],
        "charts": [
            {
                "id": "c1", "type": "area", "title": "Innovation Growth Velocity", 
                "data": [
                    {"name": "Jan", "Patents": 12, "TradeSecrets": 4, "Publications": 8},
                    {"name": "Feb", "Patents": 15, "TradeSecrets": 5, "Publications": 10},
                    {"name": "Mar", "Patents": 18, "TradeSecrets": 6, "Publications": 15},
                    {"name": "Apr", "Patents": 24, "TradeSecrets": 8, "Publications": 12},
                    {"name": "May", "Patents": 30, "TradeSecrets": 12, "Publications": 20},
                    {"name": "Jun", "Patents": 42, "TradeSecrets": 15, "Publications": 25},
                ]
            },
            {
                "id": "c2", "type": "bar", "title": "Competitor Threat Heatmap", 
                "data": [
                    {"name": "Acme Corp", "value": 85, "fill": "#ef4444"}, 
                    {"name": "Globex", "value": 62, "fill": "#f59e0b"}, 
                    {"name": "Initech", "value": 45, "fill": "#3b82f6"},
                    {"name": "Soylent", "value": 30, "fill": "#10b981"},
                    {"name": "Massive", "value": 15, "fill": "#6b7280"}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "High Threat: Acme Corp", "description": "Acme Corp filed 3 patents heavily overlapping our Core AI Routing engine. FTO analysis recommended.", "severity": "high"},
            {"id": "i2", "title": "Licensing Opportunity Detected", "description": "Globex is utilizing technology similar to our expired '882 family. Licensing team should investigate.", "severity": "medium"},
            {"id": "i3", "title": "White Space: Quantum Encryption", "description": "Quantum encryption domain has extremely low patent density globally but high projected market value.", "severity": "low"},
            {"id": "i4", "title": "Portfolio Milestone", "description": "We have successfully surpassed 500 granted US patents this quarter.", "severity": "low"}
        ],
        "aiRecommendations": [
            "Accelerate provisional filing on 'Neural Routing' project before Acme Corp gains priority.",
            "Review licensing terms for the legacy European telecommunications portfolio.",
            "Allocate 15% more R&D budget to the Quantum Encryption team based on white space metrics."
        ]
    }

def get_cto_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "Engineering Signals", "value": "124", "trend": "+24", "trendDirection": "up", "description": "Potential inventions detected in Git"},
            {"id": "w2", "type": "kpi", "title": "Architecture Novelty", "value": "88%", "trend": "+4.2%", "trendDirection": "up", "description": "Unique structural components globally"},
            {"id": "w3", "type": "kpi", "title": "Repository Coverage", "value": "92%", "trend": "Stable", "trendDirection": "flat", "description": "Git repos monitored by AI"},
            {"id": "w4", "type": "kpi", "title": "Draft Conversion", "value": "34%", "trend": "+5%", "trendDirection": "up", "description": "Signals converted to Drafts"},
        ],
        "charts": [
            {
                "id": "c1", "type": "radar", "title": "Innovation Clusters", 
                "data": [
                    {"subject": "Distributed AI", "A": 140, "fullMark": 150},
                    {"subject": "Edge Cloud", "A": 120, "fullMark": 150},
                    {"subject": "Zero Trust Security", "A": 86, "fullMark": 150},
                    {"subject": "Vector Data", "A": 130, "fullMark": 150},
                    {"subject": "UX Frameworks", "A": 65, "fullMark": 150},
                    {"subject": "IoT Sensors", "A": 45, "fullMark": 150},
                ]
            },
            {
                "id": "c2", "type": "line", "title": "Technical Novelty Detection Rate", 
                "data": [
                    {"name": "W1", "value": 5}, {"name": "W2", "value": 8}, {"name": "W3", "value": 15}, 
                    {"name": "W4", "value": 12}, {"name": "W5", "value": 24}, {"name": "W6", "value": 31}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "Hidden Invention Detected", "description": "Team Alpha's pull request on 'Distributed Vector Caching' shows 95% novelty score against prior art.", "severity": "high"},
            {"id": "i2", "title": "Architecture Shift", "description": "Significant drift towards Edge Cloud components detected in latest sprint deliverables.", "severity": "medium"},
            {"id": "i3", "title": "Stale Repository", "description": "The 'Legacy-Auth' repository has 0 innovation signals generated in the last 12 months.", "severity": "low"}
        ],
        "aiRecommendations": [
            "Extract the 'Distributed Vector Caching' module into a formal invention disclosure immediately.",
            "Schedule an architecture review for the Edge Cloud shift to ensure IP capture.",
            "Archive 'Legacy-Auth' to focus monitoring compute on active clusters."
        ]
    }

def get_cio_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "AI Transformation", "value": "A-", "trend": "+1", "trendDirection": "up", "description": "Enterprise AI adoption index"},
            {"id": "w2", "type": "kpi", "title": "Tech Debt Risk", "value": "12%", "trend": "-3%", "trendDirection": "down", "description": "Legacy system dependency"},
            {"id": "w3", "type": "kpi", "title": "Active Projects", "value": "45", "trend": "+8", "trendDirection": "up", "description": "Initiatives tracked enterprise-wide"},
            {"id": "w4", "type": "kpi", "title": "Cross-Team Collab", "value": "78%", "trend": "+12%", "trendDirection": "up", "description": "Projects with multiple departments"},
        ],
        "charts": [
            {
                "id": "c1", "type": "area", "title": "Enterprise Innovation Map", 
                "data": [
                    {"name": "Q1", "Engineering": 40, "Research": 24, "Product": 15},
                    {"name": "Q2", "Engineering": 45, "Research": 30, "Product": 20},
                    {"name": "Q3", "Engineering": 60, "Research": 45, "Product": 35},
                    {"name": "Q4", "Engineering": 85, "Research": 60, "Product": 50},
                ]
            },
            {
                "id": "c2", "type": "bar", "title": "Technology Adoption by Department", 
                "data": [
                    {"name": "Data Eng", "value": 95}, {"name": "Core Platform", "value": 85}, 
                    {"name": "Mobile", "value": 65}, {"name": "Marketing IT", "value": 30}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "Department Innovation Gap", "description": "Marketing IT shows 0 technical disclosures and low AI adoption this quarter.", "severity": "high"},
            {"id": "i2", "title": "Infrastructure Bottleneck", "description": "Legacy CI/CD pipelines are slowing down patentable deployments by 14 days on average.", "severity": "medium"},
            {"id": "i3", "title": "Cross-Team Synergy", "description": "Data Eng and Core Platform are co-developing highly novel algorithms. Strong synergy detected.", "severity": "low"}
        ],
        "aiRecommendations": [
            "Scale 'Internal RAG Tool' enterprise-wide based on high engineering usage.",
            "Audit Marketing IT workflows for potential automation and intelligence upgrades.",
            "Upgrade Legacy CI/CD to cloud-native to accelerate deployment of patentable assets."
        ]
    }

def get_legal_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "Filing Risk", "value": "Moderate", "trend": "Stable", "trendDirection": "flat", "description": "Average 103 obviousness risk"},
            {"id": "w2", "type": "kpi", "title": "Patentability Index", "value": "76/100", "trend": "+12", "trendDirection": "up", "description": "Statutory criteria compliance across drafts"},
            {"id": "w3", "type": "kpi", "title": "Pending Drafts", "value": "14", "trend": "+3", "trendDirection": "up", "description": "Awaiting attorney review"},
            {"id": "w4", "type": "kpi", "title": "Citation Risk", "value": "Low", "trend": "-5%", "trendDirection": "down", "description": "Likelihood of examiner rejection"},
        ],
        "charts": [
            {
                "id": "c1", "type": "bar", "title": "Prior Art Risk Density", 
                "data": [
                    {"name": "101 Risk", "value": 5, "fill": "#3b82f6"}, 
                    {"name": "102 Risk", "value": 14, "fill": "#f59e0b"}, 
                    {"name": "103 Risk", "value": 34, "fill": "#ef4444"}, 
                    {"name": "112 Risk", "value": 8, "fill": "#10b981"}
                ]
            },
            {
                "id": "c2", "type": "line", "title": "Draft Progress Velocity", 
                "data": [
                    {"name": "Mon", "value": 2}, {"name": "Tue", "value": 5}, {"name": "Wed", "value": 4}, 
                    {"name": "Thu", "value": 8}, {"name": "Fri", "value": 11}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "Critical Claim Collision", "description": "Draft #44 (Data Sync) has 85% claim overlap with US Patent 10,234,444 (Google).", "severity": "high"},
            {"id": "i2", "title": "Enablement Weakness", "description": "Draft #32 lacks sufficient architectural details to pass 112 written description requirements.", "severity": "medium"},
            {"id": "i3", "title": "Strong Novelty Detected", "description": "Draft #48 (Vector Compression) passed all semantic searches with 0 close prior art matches.", "severity": "low"}
        ],
        "aiRecommendations": [
            "Narrow Claim 1 in Draft #44 to specify 'asynchronous multi-thread syncing' to avoid US 10,234,444.",
            "Request inventor interview for Draft #32 to flush out hardware implementation details.",
            "Fast-track Draft #48 for provisional filing this week due to high novelty."
        ]
    }

def get_research_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "Conversion Rate", "value": "18%", "trend": "+2.5%", "trendDirection": "up", "description": "Research paper to patent filing"},
            {"id": "w2", "type": "kpi", "title": "Commercial Potential", "value": "High", "trend": "Up", "trendDirection": "up", "description": "Market alignment score"},
            {"id": "w3", "type": "kpi", "title": "Publications Scanned", "value": "452", "trend": "+120", "trendDirection": "up", "description": "Internal papers analyzed via AI"},
            {"id": "w4", "type": "kpi", "title": "White Space Match", "value": "6", "trend": "+1", "trendDirection": "up", "description": "Research overlapping white space"},
        ],
        "charts": [
            {
                "id": "c1", "type": "area", "title": "Publication to Filing Trajectory", 
                "data": [
                    {"name": "2020", "Publications": 100, "Filings": 5},
                    {"name": "2021", "Publications": 120, "Filings": 10},
                    {"name": "2022", "Publications": 150, "Filings": 15},
                    {"name": "2023", "Publications": 200, "Filings": 25},
                    {"name": "2024", "Publications": 250, "Filings": 45},
                ]
            },
            {
                "id": "c2", "type": "bar", "title": "Domain Momentum", 
                "data": [
                    {"name": "Polymers", "value": 85}, {"name": "Batteries", "value": 65}, 
                    {"name": "Solar", "value": 45}, {"name": "Graphene", "value": 20}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "Premature Disclosure Risk", "description": "Team Beta is preparing to publish 'Paper X' at IEEE next month. No provisional filed.", "severity": "high"},
            {"id": "i2", "title": "Commercial Breakthrough", "description": "Polymer formulation experiment #44 matches current EV market demand perfectly.", "severity": "low"},
            {"id": "i3", "title": "Domain Cooling", "description": "Graphene research outputs have dropped 40% YoY with low patentability scores.", "severity": "medium"}
        ],
        "aiRecommendations": [
            "DELAY publication of 'Paper X' until a provisional patent is filed to preserve rights.",
            "Setup commercialization task force for Polymer experiment #44.",
            "Pivot Graphene research budget towards high-momentum Battery domains."
        ]
    }

def get_product_dashboard():
    return {
        "widgets": [
            {"id": "w1", "type": "kpi", "title": "Feature Novelty", "value": "89%", "trend": "+5%", "trendDirection": "up", "description": "Unique UX/UI paradigms detected"},
            {"id": "w2", "type": "kpi", "title": "Competitor Coverage", "value": "42%", "trend": "-2%", "trendDirection": "down", "description": "Feature overlap with rivals"},
            {"id": "w3", "type": "kpi", "title": "Product Risk", "value": "Low", "trend": "Stable", "trendDirection": "flat", "description": "Infringement risk on roadmap"},
            {"id": "w4", "type": "kpi", "title": "Design Patents", "value": "8", "trend": "+2", "trendDirection": "up", "description": "UX interfaces protected"},
        ],
        "charts": [
            {
                "id": "c1", "type": "radar", "title": "Competitive Product Mapping", 
                "data": [
                    {"subject": "Checkout UX", "A": 120, "fullMark": 150},
                    {"subject": "Search Algorithm", "A": 98, "fullMark": 150},
                    {"subject": "Data Viz", "A": 140, "fullMark": 150},
                    {"subject": "Mobile Auth", "A": 70, "fullMark": 150},
                    {"subject": "Onboarding", "A": 85, "fullMark": 150},
                ]
            },
            {
                "id": "c2", "type": "bar", "title": "Feature Novelty Breakdown", 
                "data": [
                    {"name": "High Novelty", "value": 45, "fill": "#10b981"}, 
                    {"name": "Medium Novelty", "value": 30, "fill": "#f59e0b"}, 
                    {"name": "Commoditized", "value": 25, "fill": "#6b7280"}
                ]
            }
        ],
        "insights": [
            {"id": "i1", "title": "High UX Novelty", "description": "The new 'Swipe-to-Pay' gesture in v4.0 is highly novel compared to current competitor apps.", "severity": "low"},
            {"id": "i2", "title": "Competitor Mimicry", "description": "Competitor X just launched a search filtering UI identical to our unpatented v3.2 release.", "severity": "high"},
            {"id": "i3", "title": "FTO Clearance Needed", "description": "The upcoming 'AR Onboarding' feature requires Freedom-to-Operate clearance before Q4 launch.", "severity": "medium"}
        ],
        "aiRecommendations": [
            "File a design patent immediately for the 'Swipe-to-Pay' interface.",
            "Initiate FTO search for the AR Onboarding module.",
            "Review Competitor X's release for potential copyright or trade dress violations."
        ]
    }

def get_default_dashboard():
    return {
        "widgets": [],
        "charts": [],
        "insights": [],
        "aiRecommendations": []
    }

def get_dashboard_for_role(role: str) -> dict:
    match role:
        case "ceo":
            return get_ceo_dashboard()
        case "cto":
            return get_cto_dashboard()
        case "cio":
            return get_cio_dashboard()
        case "patent_counsel" | "legal":
            return get_legal_dashboard()
        case "research_lead" | "research":
            return get_research_dashboard()
        case "product_manager" | "product":
            return get_product_dashboard()
        case _:
            return get_default_dashboard()
