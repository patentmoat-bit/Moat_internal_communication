export function generateMockSearchResults(query: string, options: any = {}) {
  const resultsCount = options.resultsCount || 8;
  const basePatents = [
    {
      patent_number: "US20250063036A1",
      title: "Blockchain Cybersecurity Platform with Smart Contract Assurance and Audit Certification",
      assignee: "Halborn Inc",
      inventors: ["Steven Walbroehl", "Robert Behnke"],
      filing_date: "2023-08-15",
      publication_date: "2025-01-10",
      status: "Active",
      abstract: "A certificate authority on a blockchain cybersecurity platform that audits smart-contract source in a dev environment, issues a post-audit certificate, and then verifies the deployed bytecode matches what was audited.",
      ipc_codes: ["H04L 9/32", "G06F 21/57"],
      cpc_codes: ["H04L 9/3239", "G06F 21/577"],
      jurisdiction: "US",
      citations: 12,
      ai_match_score: 99,
      relevance_reason: "Direct match to blockchain assurance and cybersecurity"
    },
    {
      patent_number: "CN115277184A",
      title: "Risk Handling System for Cyber Security Attacks Using AI-Driven Threat Detection",
      assignee: "Darktrace Holdings Limited",
      inventors: ["Emily Orton", "Jack Stockdale", "Matthew Dunn"],
      filing_date: "2022-03-10",
      publication_date: "2022-10-28",
      status: "Active",
      abstract: "A cyber threat detection system that uses machine learning to model normal network behavior and identify anomalous activities indicative of cyber attacks. The system applies unsupervised learning to autonomously respond to and handle cyber security risks in real-time.",
      ipc_codes: ["H04L 29/06", "G06N 20/00"],
      cpc_codes: ["H04L 63/1425", "G06N 20/00"],
      jurisdiction: "CN",
      citations: 28,
      ai_match_score: 98,
      relevance_reason: "Direct match: risk handling, cyber security attacks, CN jurisdiction"
    },
    {
      patent_number: "CN116074078A",
      title: "Cybersecurity Risk Assessment and Automated Response System for Enterprise Networks",
      assignee: "Darktrace Holdings Limited",
      inventors: ["Poppy Gustafsson", "Andrew France"],
      filing_date: "2022-08-22",
      publication_date: "2023-05-19",
      status: "Active",
      abstract: "An enterprise cybersecurity system for assessing and mitigating network security risks. Uses probabilistic threat modelling and automated countermeasures to neutralize attacks, reducing human response time to cyber incidents.",
      ipc_codes: ["H04L 9/40", "G06F 21/55"],
      cpc_codes: ["H04L 63/1441", "G06F 21/552"],
      jurisdiction: "CN",
      citations: 19,
      ai_match_score: 96,
      relevance_reason: "Cyber security risk assessment, CN, Darktrace assignee"
    },
    {
      patent_number: "CN114500108A",
      title: "Network Intrusion Detection and Attack Prevention Method Based on Deep Learning",
      assignee: "Huawei Technologies Co., Ltd.",
      inventors: ["Li Wei", "Zhang Ming", "Wang Fang"],
      filing_date: "2021-12-01",
      publication_date: "2022-05-13",
      status: "Active",
      abstract: "A deep learning-based intrusion detection system that identifies and prevents network cyber attacks in real-time. The system classifies attack patterns using convolutional neural networks and triggers automated risk handling protocols.",
      ipc_codes: ["H04L 29/06", "G06N 3/04"],
      cpc_codes: ["H04L 63/1425", "G06N 3/0442"],
      jurisdiction: "CN",
      citations: 45,
      ai_match_score: 94,
      relevance_reason: "Cyber attack detection, risk handling, CN, Huawei"
    },
    {
      patent_number: "CN113794731A",
      title: "Zero-Trust Security Architecture with Adaptive Risk Scoring for Cyber Threat Mitigation",
      assignee: "Alibaba Group Holding Limited",
      inventors: ["Chen Jian", "Liu Yang", "Zhao Lei"],
      filing_date: "2021-09-15",
      publication_date: "2021-12-14",
      status: "Active",
      abstract: "A zero-trust network security system with adaptive risk scoring that continuously evaluates user and device trustworthiness. The system implements dynamic access controls and automated threat mitigation for cyber security attacks.",
      ipc_codes: ["H04L 9/40", "G06F 21/60"],
      cpc_codes: ["H04L 63/102", "G06F 21/604"],
      jurisdiction: "CN",
      citations: 33,
      ai_match_score: 91,
      relevance_reason: "Risk scoring, cyber threat, CN jurisdiction, zero-trust security"
    },
    {
      patent_number: "US11801234B2",
      title: "Continuous Glucose Monitoring System with Machine Learning Calibration",
      assignee: "DexCom, Inc.",
      inventors: ["John Smith", "Sarah Johnson", "Michael Chen"],
      filing_date: "2021-06-15",
      publication_date: "2023-11-28",
      grant_date: "2023-11-28",
      status: "Active",
      abstract: "A system and method for continuous glucose monitoring using machine learning algorithms to calibrate sensor data and improve accuracy of blood glucose measurements over extended wear periods.",
      ipc_codes: ["A61B 5/145", "G06N 20/00"],
      cpc_codes: ["A61B 5/14532", "A61B 2560/0223"],
      jurisdiction: "US",
      citations: 42,
      ai_match_score: 97,
      relevance_reason: "Direct match to continuous monitoring and ML calibration"
    },
    {
      patent_number: "US11789123B2",
      title: "Wearable Drug Delivery Patch with IoT-Enabled Compliance Monitoring",
      assignee: "Medtronic MiniMed, Inc.",
      inventors: ["Emily Davis", "Robert Wilson", "Priya Patel"],
      filing_date: "2020-11-03",
      publication_date: "2023-07-18",
      grant_date: "2023-07-18",
      status: "Active",
      abstract: "An IoT-enabled wearable drug delivery system that monitors patient compliance, dosage history, and physiological responses through integrated sensors and cloud-based analytics.",
      ipc_codes: ["A61M 5/142", "G16H 20/17"],
      cpc_codes: ["A61M 5/14276", "A61M 2205/8206"],
      jurisdiction: "US",
      citations: 28,
      ai_match_score: 92,
      relevance_reason: "Related to wearable drug delivery with IoT features"
    },
    {
      patent_number: "US11678945B2",
      title: "Blockchain-Based Medical Record System with Patient-Controlled Access",
      assignee: "Mayo Clinic",
      inventors: ["David Thompson", "Lisa Garcia", "James Lee"],
      filing_date: "2021-02-20",
      publication_date: "2023-05-09",
      status: "Active",
      abstract: "A decentralized medical record system leveraging blockchain technology to provide patients with granular control over access to their health records while maintaining an immutable audit trail.",
      ipc_codes: ["G16H 10/60", "H04L 9/06"],
      cpc_codes: ["G16H 10/60", "H04L 2209/38"],
      jurisdiction: "US",
      citations: 35,
      ai_match_score: 88,
      relevance_reason: "Healthcare data management with blockchain"
    },
    {
      patent_number: "US11654321B2",
      title: "AI-Powered Diagnostic Imaging System for Early Detection of Retinopathy",
      assignee: "Google Health",
      inventors: ["Alex Wang", "Rachel Kim", "Thomas Mueller"],
      filing_date: "2021-08-12",
      publication_date: "2023-09-20",
      status: "Active",
      abstract: "An artificial intelligence system for analyzing retinal scans to detect early signs of diabetic retinopathy and other ocular conditions using deep convolutional neural networks.",
      ipc_codes: ["G06T 7/00", "A61B 3/12"],
      cpc_codes: ["G06T 2207/30041", "A61B 3/1241"],
      jurisdiction: "US",
      citations: 19,
      ai_match_score: 85,
      relevance_reason: "AI-powered medical imaging and diagnostics"
    },
    {
      patent_number: "US11567890B2",
      title: "Smart Inhaler with Dose Tracking and Environmental Monitoring",
      assignee: "AstraZeneca AB",
      inventors: ["Andrew Brown", "Maria Lopez", "Kevin Taylor"],
      filing_date: "2020-05-18",
      publication_date: "2022-12-06",
      grant_date: "2023-01-17",
      status: "Active",
      abstract: "A connected inhaler device that tracks medication usage, monitors environmental triggers, and provides personalized asthma management recommendations through a mobile application.",
      ipc_codes: ["A61M 15/00", "G16H 20/13"],
      cpc_codes: ["A61M 15/0086", "A61M 2205/3306"],
      jurisdiction: "US",
      citations: 15,
      ai_match_score: 82,
      relevance_reason: "Connected medical device with compliance tracking"
    },
    {
      patent_number: "US11890123B2",
      title: "Implantable Neural Interface with Wireless Power Transfer",
      assignee: "Neuralink Corp.",
      inventors: ["Elon Musk", "Max Hodak", "Josephine Thomas"],
      filing_date: "2022-01-10",
      publication_date: "2023-10-31",
      status: "Active",
      abstract: "A high-bandwidth implantable neural interface system utilizing wireless power transfer and bidirectional data communication for brain-computer interface applications.",
      ipc_codes: ["A61N 1/36", "H02J 50/10"],
      cpc_codes: ["A61N 1/36025", "H02J 50/10"],
      jurisdiction: "US",
      citations: 51,
      ai_match_score: 79,
      relevance_reason: "Neural interface with wireless technology"
    },
    {
      patent_number: "US11523456B2",
      title: "Personalized Cancer Vaccine Using Neoantigen Prediction",
      assignee: "BioNTech SE",
      inventors: ["Ugur Sahin", "Oezlem Tuereci", "Karin Koester"],
      filing_date: "2020-09-28",
      publication_date: "2023-03-14",
      grant_date: "2023-03-14",
      status: "Active",
      abstract: "Methods and compositions for generating personalized cancer vaccines by predicting tumor-specific neoantigens using machine learning algorithms and mRNA vaccine technology.",
      ipc_codes: ["A61K 39/00", "G16B 20/20"],
      cpc_codes: ["A61K 2039/5158", "G16B 20/20"],
      jurisdiction: "US",
      citations: 67,
      ai_match_score: 76,
      relevance_reason: "Personalized medicine with ML neoantigen prediction"
    },
    {
      patent_number: "US11878901B2",
      title: "Edge Computing Platform for Real-Time Patient Monitoring in ICU",
      assignee: "Philips Healthcare",
      inventors: ["Hans van der Berg", "Sophie Martin", "Carlos Rivera"],
      filing_date: "2021-04-05",
      publication_date: "2023-08-15",
      grant_date: "2023-08-15",
      status: "Active",
      abstract: "An edge computing platform deployed in intensive care units that processes patient monitoring data locally for real-time alerts while maintaining synchronized records with central hospital systems.",
      ipc_codes: ["G16H 40/63", "G06F 9/50"],
      cpc_codes: ["G16H 40/63", "G06F 2209/5019"],
      jurisdiction: "US",
      citations: 23,
      ai_match_score: 90,
      relevance_reason: "Edge computing for real-time healthcare monitoring"
    },
    {
      patent_number: "US11765432B2",
      title: "Method for Predicting Drug-Drug Interactions Using Graph Neural Networks",
      assignee: "IBM Research",
      inventors: ["William Zhang", "Anita Sharma", "Franz Weber"],
      filing_date: "2021-11-22",
      publication_date: "2023-06-27",
      status: "Active",
      abstract: "A graph neural network approach for predicting adverse drug-drug interactions by modeling molecular structures and biological pathways as heterogeneous graphs.",
      ipc_codes: ["G16C 20/70", "G06N 3/04"],
      cpc_codes: ["G16C 20/70", "G06N 3/042"],
      jurisdiction: "US",
      citations: 31,
      ai_match_score: 87,
      relevance_reason: "AI-driven drug interaction prediction"
    },
    {
      patent_number: "US11887654B2",
      title: "Robotic Surgical System with Haptic Feedback and AI Guidance",
      assignee: "Intuitive Surgical, Inc.",
      inventors: ["Mark Johnson", "Patricia Lee", "Kenji Nakamura"],
      filing_date: "2022-03-18",
      publication_date: "2024-01-09",
      status: "Active",
      abstract: "A robotic surgical system incorporating haptic feedback mechanisms and AI-driven guidance to enhance precision and reduce tissue damage during minimally invasive procedures.",
      ipc_codes: ["A61B 34/30", "A61B 34/20"],
      cpc_codes: ["A61B 2034/301", "A61B 2034/2065"],
      jurisdiction: "US",
      citations: 44,
      ai_match_score: 93,
      relevance_reason: "Robotic surgery with AI guidance and haptics"
    },
  ];

  let filteredPatents = basePatents;
  if (query && query.trim().length > 0) {
    const lowerQuery = query.toLowerCase();
    const queryTerms = lowerQuery.split(/\s+/).filter(term => term.length > 3);
    
    const scoredPatents = basePatents.map(p => {
      const text = (p.title + " " + p.abstract + " " + (p.relevance_reason || "")).toLowerCase();
      let score = 0;
      
      // Exact full query match gets massive boost
      if (text.includes(lowerQuery)) score += 100;
      
      // Count individual term matches
      let matchedTerms = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) {
          score += 10;
          matchedTerms++;
        }
      }
      
      // Boost if it matches domain-specific keywords for cybersecurity
      const isCyberQuery = queryTerms.some(t => ["cyber", "security", "cybersecurity", "risk", "attack", "blockchain"].includes(t));
      const hasCyberContent = ["cyber", "security", "blockchain", "attack", "threat", "intrusion"].some(t => text.includes(t));
      if (isCyberQuery && hasCyberContent) score += 50;
      
      // Penalize medical patents if it's clearly a cybersecurity query
      const hasMedicalContent = ["glucose", "medical", "drug", "retino", "inhaler", "neural", "cancer", "surgical", "health"].some(t => text.includes(t));
      if (isCyberQuery && hasMedicalContent) score -= 100;

      return { patent: p, score, matchedTerms };
    });

    // Require either a very high score (domain match) or at least 40% of terms matching
    const matches = scoredPatents
      .filter(p => p.score > 0 && (p.score >= 50 || p.matchedTerms >= Math.max(1, Math.ceil(queryTerms.length * 0.4))))
      .sort((a, b) => b.score - a.score)
      .map(p => p.patent);
      
    if (matches.length > 0) {
      filteredPatents = matches;
    } else {
      // If no good matches, return empty so it doesn't default to showing all basePatents
      filteredPatents = [];
    }
  }

  const results = filteredPatents.slice(0, resultsCount).map((p, idx) => ({
    ...p,
    ai_match_score: Math.max(70, p.ai_match_score - idx * 2),
    relevance_reason: query ? `Matched based on: ${query.split(" ").slice(0, 3).join(", ")}` : "Top result for query",
  }));

  return {
    query_interpretation: `Patent search for "${query}"`,
    key_concepts: query.split(" ").filter((w: string) => w.length > 3),
    suggested_ipc_codes: ["A61B 5/00", "G16H 50/00", "G06N 20/00"],
    results,
    search_stats: {
      total_found: results.length * 47 + 12,
      search_time_ms: Math.floor(Math.random() * 300 + 200),
      ai_model: "mock-v1",
    },
  };
}
