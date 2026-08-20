import type { Patent } from "@/types";

export const MOCK_PATENTS: Patent[] = [
  {
    id: "pat-001", patent_number: "US11,234,567B2", title: "Neural Network Architecture for Real-Time Object Detection in Autonomous Vehicles",
    abstract: "A deep learning system employing a novel multi-scale feature pyramid network for real-time object detection in autonomous driving scenarios. The architecture achieves sub-10ms inference latency while maintaining state-of-the-art accuracy on the KITTI and nuScenes benchmarks.",
    claims: [
      "A computer-implemented method for real-time object detection comprising a multi-scale feature pyramid network that processes input images at multiple resolutions to generate feature maps at different scales, wherein the network comprises a backbone convolutional neural network, a feature pyramid module that generates at least four resolution levels of feature maps, and a detection head that produces bounding boxes and class probabilities for objects at each scale.",
      "The method of claim 1, wherein the feature pyramid module comprises a bottom-up pathway that processes feature maps from the backbone network through lateral connections and a top-down pathway that upsamples higher-level feature maps and combines them with lower-level feature maps through element-wise addition.",
      "The method of claim 1, wherein the detection head comprises a shared convolutional subnetwork applied to each level of the feature pyramid, the subnetwork comprising a classification branch that predicts class probabilities and a regression branch that predicts bounding box offsets for a set of predefined anchor boxes at each spatial location.",
      "The method of claim 3, wherein the classification branch uses focal loss to address class imbalance between foreground and background examples during training, and the regression branch uses smooth L1 loss for bounding box regression.",
      "The method of claim 1, wherein the backbone convolutional neural network is a ResNet-50 or ResNet-101 architecture with feature maps extracted from the conv3, conv4, and conv5 stages and processed through 1x1 convolutional layers to reduce channel dimensions before entering the feature pyramid module.",
      "A system for real-time object detection in autonomous vehicles, comprising: a camera configured to capture images of the vehicle's surroundings; a neural network processor configured to execute the method of claim 1 on the captured images; and a vehicle control interface configured to receive detected object information and generate navigation commands based on the detected objects.",
    ],
    inventors: ["Dr. Sarah Chen", "Prof. Michael Torres"], assignee: "AutoDrive AI Inc.", filing_date: "2023-03-15", publication_date: "2024-01-20", status: "Granted",
    cpc_classifications: ["G06V20/56", "G06N3/08", "B60W60/00"], ipc_classifications: ["G06V20/56"], citations: ["US10,456,789", "US10,789,012", "US11,001,234"], similarity_score: 0.95, metadata: {
      domain: "AI/ML", innovation_level: "High", priority_date: "2022-09-10",
      description: "TECHNICAL FIELD\n\nThe present invention relates generally to the field of computer vision and machine learning, and more particularly to neural network architectures for real-time object detection in autonomous vehicle applications.\n\nBACKGROUND\n\nAutonomous vehicles require robust, real-time perception systems to safely navigate their environment. Object detection is a critical component of such systems, as it enables the vehicle to identify and track pedestrians, other vehicles, traffic signs, and obstacles. Traditional object detection approaches based on sliding windows and hand-crafted features have been largely superseded by deep learning-based methods, which offer superior accuracy.\n\nHowever, existing deep learning-based object detection systems face significant challenges in the autonomous driving context. First, they must process high-resolution images at high frame rates to provide timely information for vehicle control. Second, they must detect objects at a wide range of scales, from large vehicles to small pedestrians. Third, they must operate reliably under varying lighting conditions, weather, and environments.\n\nMulti-scale feature pyramid networks have been proposed to address the scale variation problem, but existing implementations often suffer from high computational costs that make them unsuitable for real-time deployment. There is therefore a need for a neural network architecture that achieves both high accuracy and real-time performance for object detection in autonomous driving scenarios.\n\nSUMMARY\n\nThe present invention provides a neural network architecture for real-time object detection that employs a novel multi-scale feature pyramid network. The architecture achieves sub-10ms inference latency while maintaining state-of-the-art accuracy on autonomous driving benchmarks.\n\nIn one aspect, the invention provides a computer-implemented method for real-time object detection comprising a multi-scale feature pyramid network that processes input images at multiple resolutions to generate feature maps at different scales. The network includes a backbone convolutional neural network, a feature pyramid module that generates at least four resolution levels of feature maps, and a detection head that produces bounding boxes and class probabilities.\n\nIn another aspect, the invention provides a system for real-time object detection in autonomous vehicles, comprising a camera, a neural network processor configured to execute the method, and a vehicle control interface.\n\nDETAILED DESCRIPTION\n\nThe present invention will now be described in detail with reference to the accompanying drawings. The following description is provided to enable any person skilled in the art to make and use the invention and sets forth the best mode contemplated by the inventors.\n\nAs shown in the accompanying drawings, the neural network architecture comprises three main components: a backbone convolutional neural network, a feature pyramid module, and a detection head. The backbone network processes the input image through successive convolutional and pooling layers to generate feature maps at multiple scales. In a preferred embodiment, the backbone is a ResNet-50 architecture with feature maps extracted from the conv3, conv4, and conv5 stages.\n\nThe feature pyramid module receives feature maps from the backbone and generates a pyramid of feature maps at multiple resolutions. This is accomplished through a bottom-up pathway that processes feature maps through lateral connections and a top-down pathway that upsamples higher-level feature maps and combines them with lower-level feature maps through element-wise addition.\n\nThe detection head comprises a shared convolutional subnetwork applied to each level of the feature pyramid. The subnetwork includes a classification branch that predicts class probabilities and a regression branch that predicts bounding box offsets for a set of predefined anchor boxes at each spatial location.\n\nExperimental results demonstrate that the architecture achieves sub-10ms inference latency on a standard GPU while maintaining state-of-the-art accuracy on the KITTI and nuScenes benchmarks, with a mean average precision (mAP) of 78.3% across all object categories.",
      legal_events: [
        { date: "2023-03-15", type: "filing", description: "Application filed with USPTO" },
        { date: "2023-09-20", type: "examination", description: "First office action issued by examiner" },
        { date: "2023-12-05", type: "response", description: "Applicant response to office action filed" },
        { date: "2024-01-10", type: "allowance", description: "Notice of allowance mailed" },
        { date: "2024-01-20", type: "grant", description: "Patent granted and published" },
      ],
      patent_family: [
        { patent_number: "EP4,567,890A1", country: "EP", kind: "A1", publication_date: "2024-02-15", title: "Neural Network Architecture for Real-Time Object Detection" },
        { patent_number: "CN118,901,234A", country: "CN", kind: "A", publication_date: "2024-03-10", title: "Multi-Scale Feature Pyramid Network for Object Detection" },
        { patent_number: "JP2024-567890", country: "JP", kind: "A", publication_date: "2024-04-05", title: "Real-Time Object Detection Neural Network" },
      ],
      cited_by: ["US11,890,125B2", "US11,901,236B2", "US12,012,345B2"],
      images: [
        { url: "https://patentimages.storage.googleapis.com/aa/bb/cc/drawing_fig1.png", caption: "FIG. 1: Overall neural network architecture showing backbone, feature pyramid, and detection head", figure_number: "FIG. 1" },
        { url: "https://patentimages.storage.googleapis.com/dd/ee/ff/drawing_fig2.png", caption: "FIG. 2: Feature pyramid module with bottom-up and top-down pathways", figure_number: "FIG. 2" },
        { url: "https://patentimages.storage.googleapis.com/gg/hh/ii/drawing_fig3.png", caption: "FIG. 3: Detection head architecture with classification and regression branches", figure_number: "FIG. 3" },
      ],
    }
  },
  {
    id: "pat-002", patent_number: "US11,345,678B2", title: "CRISPR-Cas9 Gene Editing Method for Targeted Cancer Therapy",
    abstract: "An improved CRISPR-Cas9 delivery mechanism using lipid nanoparticles for precise gene editing in tumor cells. The method demonstrates 94% on-target efficiency with less than 0.1% off-target effects in preclinical trials.",
    claims: [
      "A method of targeted cancer therapy comprising delivering a CRISPR-Cas9 complex via lipid nanoparticles to a population of tumor cells in a subject in need thereof, wherein the lipid nanoparticles encapsulate a Cas9 mRNA and a guide RNA targeting an oncogene mutation.",
      "The method of claim 1, wherein the guide RNA targets a mutation selected from the group consisting of KRAS G12C, EGFR T790M, BRAF V600E, and PI3CA H1047R, and wherein the lipid nanoparticles comprise ionizable lipids, PEG-lipids, and cholesterol in a molar ratio of 50:10:40.",
      "The method of claim 1, wherein the lipid nanoparticles further comprise a targeting moiety selected from the group consisting of antibodies, nanobodies, and aptamers that specifically bind to a tumor-associated antigen expressed on the surface of the target cancer cells.",
      "The method of claim 3, wherein the targeting moiety is an anti-EGFR nanobody conjugated to the surface of the lipid nanoparticles via a PEG linker, and wherein the lipid nanoparticles have a diameter of 80-120 nm as measured by dynamic light scattering.",
      "The method of claim 1, wherein the Cas9 mRNA is a chemically modified mRNA comprising N1-methylpseudouridine substitutions, and wherein the guide RNA is a synthetic single-guide RNA (sgRNA) comprising 2'-O-methyl and phosphorothioate modifications at the 3' and 5' termini.",
      "The method of claim 1, further comprising administering a checkpoint inhibitor selected from the group consisting of anti-PD-1 antibodies, anti-PD-L1 antibodies, and anti-CTLA-4 antibodies, either concurrently or sequentially with the CRISPR-Cas9 complex.",
      "A pharmaceutical composition for targeted cancer therapy comprising: (a) lipid nanoparticles encapsulating a Cas9 mRNA and a guide RNA targeting an oncogene mutation; and (b) a pharmaceutically acceptable carrier, wherein the composition is formulated for intravenous administration.",
    ],
    inventors: ["Dr. Emily Watson", "Dr. James Liu", "Dr. Priya Sharma"], assignee: "GeneTech Therapeutics", filing_date: "2023-06-01", publication_date: "2024-03-10", status: "Granted",
    cpc_classifications: ["C12N15/113", "A61K48/00", "C12N9/22"], ipc_classifications: ["C12N15/11"], citations: ["US10,234,567", "US10,567,890"], similarity_score: 0.88, metadata: {
      domain: "Biotech", innovation_level: "High", priority_date: "2022-12-15",
      description: "TECHNICAL FIELD\n\nThe present invention relates to the field of gene editing and cancer therapy, and more particularly to CRISPR-Cas9-based methods for targeted cancer therapy using lipid nanoparticle delivery systems.\n\nBACKGROUND\n\nCRISPR-Cas9 gene editing technology has revolutionized molecular biology by enabling precise modification of genomic DNA. The technology has immense potential for cancer therapy by enabling the direct targeting and correction of oncogenic mutations in tumor cells. However, realizing this potential in a clinical setting has been hindered by the lack of safe and effective delivery systems.\n\nViral vectors, while efficient, carry risks of immunogenicity, insertional mutagenesis, and limited packaging capacity. Non-viral delivery methods such as lipid nanoparticles (LNPs) offer an attractive alternative, as they can encapsulate large nucleic acid payloads and can be functionalized with targeting moieties for cell-specific delivery.\n\nGene editing efficiency depends on multiple factors including the choice of Cas9 nuclease, guide RNA design, delivery method, and the cellular context of the target cells. There remains a need for improved CRISPR-Cas9 delivery systems that achieve high on-target editing efficiency with minimal off-target effects in cancer cells.\n\nSUMMARY\n\nThe present invention provides an improved CRISPR-Cas9 delivery mechanism using lipid nanoparticles for precise gene editing in tumor cells. The method demonstrates 94% on-target efficiency with less than 0.1% off-target effects in preclinical trials.\n\nIn one aspect, the invention provides a method of targeted cancer therapy comprising delivering a CRISPR-Cas9 complex via lipid nanoparticles that encapsulate a Cas9 mRNA and a guide RNA targeting an oncogene mutation.\n\nIn another aspect, the invention provides pharmaceutical compositions comprising the CRISPR-Cas9 complex formulated for intravenous administration.\n\nDETAILED DESCRIPTION\n\nThe present invention provides compositions and methods for CRISPR-Cas9-mediated gene editing in cancer cells using lipid nanoparticle delivery. The system comprises lipid nanoparticles encapsulating a Cas9 mRNA and one or more guide RNAs that target specific oncogenic mutations.\n\nLipid nanoparticles are prepared using a microfluidic mixing process. Ionizable lipids are used to encapsulate the nucleic acid payload and facilitate endosomal escape following cellular uptake. The lipid composition has been optimized to achieve high encapsulation efficiency, favorable pharmacokinetics, and efficient delivery to tumor tissues.\n\nThe Cas9 mRNA is synthesized using in vitro transcription with chemically modified nucleotides to enhance stability and reduce immunogenicity. The guide RNA is designed using computational tools to maximize on-target activity while minimizing off-target effects at sites with sequence similarity to the intended target.",
      legal_events: [
        { date: "2023-06-01", type: "filing", description: "Application filed with USPTO" },
        { date: "2023-10-15", type: "publication", description: "Patent application published" },
        { date: "2024-01-20", type: "examination", description: "Office action issued" },
        { date: "2024-03-10", type: "grant", description: "Patent granted" },
      ],
      patent_family: [
        { patent_number: "EP4,567,891A1", country: "EP", kind: "A1", publication_date: "2024-04-15", title: "CRISPR-Cas9 Delivery for Cancer Therapy" },
        { patent_number: "WO2024/123456A1", country: "WO", kind: "A1", publication_date: "2024-05-01", title: "Lipid Nanoparticle CRISPR Delivery" },
      ],
      cited_by: ["US11,789,014B2", "US11,890,125B2"],
      images: [
        { url: "https://patentimages.storage.googleapis.com/11/22/33/drawing_fig1.png", caption: "FIG. 1: Schematic of lipid nanoparticle encapsulating Cas9 mRNA and guide RNA", figure_number: "FIG. 1" },
        { url: "https://patentimages.storage.googleapis.com/44/55/66/drawing_fig2.png", caption: "FIG. 2: In vitro gene editing efficiency in cancer cell lines", figure_number: "FIG. 2" },
      ],
    }
  },
  {
    id: "pat-003", patent_number: "US11,456,789B2", title: "Quantum-Resistant Cryptographic Protocol for IoT Device Communication",
    abstract: "A post-quantum cryptographic protocol based on lattice-based key encapsulation mechanisms optimized for resource-constrained IoT devices. The protocol achieves NIST Level 3 security with 40% less computational overhead than existing solutions.",
    claims: ["A cryptographic communication method for IoT devices using lattice-based key encapsulation", "The method of claim 1, further comprising a lightweight key exchange protocol", "An IoT device configured to implement the protocol of claim 1"],
    inventors: ["Dr. Alex Petrov", "Dr. Maria Gonzalez"], assignee: "CryptoShield Labs", filing_date: "2023-01-20", publication_date: "2024-02-15", status: "Granted",
    cpc_classifications: ["H04L9/08", "H04L9/30", "H04W12/03"], ipc_classifications: ["H04L9/08"], citations: ["US10,345,678", "US10,678,901", "US10,901,234", "US11,012,345"], similarity_score: 0.91, metadata: { domain: "Cybersecurity", innovation_level: "High" }
  },
  {
    id: "pat-004", patent_number: "US11,567,890B2", title: "Perovskite-Silicon Tandem Solar Cell with 33.7% Efficiency",
    abstract: "A tandem solar cell architecture combining a perovskite top cell with a silicon heterojunction bottom cell, achieving a certified power conversion efficiency of 33.7%. The design incorporates a novel interlayer for optimized current matching.",
    claims: ["A tandem photovoltaic device comprising a perovskite absorber layer and a silicon heterojunction cell", "The device of claim 1, wherein the perovskite layer has a bandgap of 1.68 eV", "A method of manufacturing the tandem solar cell of claim 1"],
    inventors: ["Prof. Hiroshi Tanaka", "Dr. Lisa Müller", "Dr. Ravi Patel"], assignee: "SolarFrontier Technologies", filing_date: "2023-04-10", publication_date: "2024-04-05", status: "Published",
    cpc_classifications: ["H01L31/0687", "H01L31/078", "H02S10/00"], ipc_classifications: ["H01L31/06"], citations: ["US10,123,456", "US10,456,789"], similarity_score: 0.85, metadata: { domain: "Clean Energy", innovation_level: "High" }
  },
  {
    id: "pat-005", patent_number: "US11,678,901B2", title: "Transformer-Based Natural Language Processing for Legal Document Analysis",
    abstract: "A fine-tuned large language model architecture specifically designed for legal document analysis, including contract review, clause extraction, and risk assessment. The system achieves 97% accuracy on standard legal benchmarks.",
    claims: ["A method for automated legal document analysis using a transformer-based neural network", "The method of claim 1, further comprising clause-level risk scoring", "A computer system for implementing the method of claim 1"],
    inventors: ["Dr. Robert Kim", "Jennifer Hayes"], assignee: "LegalAI Corp.", filing_date: "2023-07-22", publication_date: "2024-05-12", status: "Published",
    cpc_classifications: ["G06F40/20", "G06N3/0455", "G06Q50/18"], ipc_classifications: ["G06F40/20"], citations: ["US10,789,012", "US11,001,234", "US11,123,456"], similarity_score: 0.92, metadata: { domain: "AI/ML", innovation_level: "Medium" }
  },
  {
    id: "pat-006", patent_number: "US11,789,012B2", title: "3nm FinFET Transistor Architecture with Gate-All-Around Design",
    abstract: "A novel gate-all-around (GAA) nanosheet transistor design for 3nm technology nodes, featuring stacked horizontal nanosheets with optimized channel width. The design achieves 25% performance improvement and 30% power reduction compared to 5nm FinFET.",
    claims: ["A semiconductor device comprising stacked horizontal nanosheet channels surrounded by a gate electrode", "The device of claim 1, wherein each nanosheet has a thickness of 5-7nm", "A method of fabricating the GAA transistor of claim 1"],
    inventors: ["Dr. Wei Zhang", "Dr. Soo-Jin Park"], assignee: "NanoChip Semiconductor", filing_date: "2023-02-28", publication_date: "2024-01-30", status: "Granted",
    cpc_classifications: ["H01L29/66795", "H01L29/78", "H01L21/8234"], ipc_classifications: ["H01L29/66"], citations: ["US10,567,890", "US10,890,123"], similarity_score: 0.87, metadata: { domain: "Semiconductor", innovation_level: "High" }
  },
  {
    id: "pat-007", patent_number: "US11,890,123B2", title: "5G mmWave Beamforming Antenna Array for Urban Small Cells",
    abstract: "A compact phased-array antenna system for 5G millimeter-wave small cell deployments in dense urban environments. The array features 256 elements with adaptive beamforming supporting 8 simultaneous beams and 120° sector coverage.",
    claims: ["A phased-array antenna system for 5G mmWave communication comprising 256 antenna elements", "The system of claim 1, wherein each element includes a phase shifter with 6-bit resolution", "A method of adaptive beamforming using the antenna array of claim 1"],
    inventors: ["Dr. Marco Rossi", "Dr. Yuki Sato", "Dr. Ahmed Hassan"], assignee: "WaveLink Communications", filing_date: "2023-05-15", publication_date: "2024-03-25", status: "Published",
    cpc_classifications: ["H01Q3/26", "H01Q21/06", "H04B7/0617"], ipc_classifications: ["H01Q3/26"], citations: ["US10,234,567", "US10,678,901", "US11,001,234"], similarity_score: 0.83, metadata: { domain: "Telecom", innovation_level: "Medium" }
  },
  {
    id: "pat-008", patent_number: "US11,901,234B2", title: "Federated Learning Framework for Privacy-Preserving Medical Imaging",
    abstract: "A federated learning architecture enabling multiple hospitals to collaboratively train deep learning models for medical image analysis without sharing patient data. The framework includes differential privacy guarantees and achieves performance within 2% of centralized training.",
    claims: ["A federated learning method for training medical imaging models across distributed healthcare institutions", "The method of claim 1, further comprising differential privacy noise injection", "A system for implementing the federated learning method of claim 1"],
    inventors: ["Dr. Anna Kowalski", "Dr. David Brown", "Prof. Lin Zhou"], assignee: "MedAI Health Systems", filing_date: "2023-08-10", publication_date: "2024-06-01", status: "Published",
    cpc_classifications: ["G06N3/098", "G16H30/40", "G06T7/00"], ipc_classifications: ["G06N3/08"], citations: ["US10,890,123", "US11,012,345", "US11,234,567"], similarity_score: 0.90, metadata: { domain: "AI/ML", innovation_level: "High" }
  },
  {
    id: "pat-009", patent_number: "US11,012,345B2", title: "Solid-State Battery with Sulfide Electrolyte for Electric Vehicles",
    abstract: "A solid-state lithium battery utilizing a halide-doped lithium argyrodite sulfide electrolyte achieving ionic conductivity of 15 mS/cm at room temperature. The battery demonstrates 1000+ cycle stability with energy density exceeding 400 Wh/kg.",
    claims: ["A solid-state battery comprising a halide-doped lithium argyrodite sulfide electrolyte", "The battery of claim 1, wherein the electrolyte has ionic conductivity exceeding 10 mS/cm", "A method of manufacturing the solid-state electrolyte of claim 1"],
    inventors: ["Dr. Kenji Yamamoto", "Dr. Sophie Laurent"], assignee: "PowerCell Energy", filing_date: "2023-03-01", publication_date: "2024-02-20", status: "Granted",
    cpc_classifications: ["H01M10/0562", "H01M10/052", "H01M4/525"], ipc_classifications: ["H01M10/056"], citations: ["US10,123,456", "US10,345,678", "US10,567,890"], similarity_score: 0.86, metadata: { domain: "Clean Energy", innovation_level: "High" }
  },
  {
    id: "pat-010", patent_number: "US11,123,456B2", title: "Graph Neural Network for Molecular Property Prediction in Drug Discovery",
    abstract: "A message-passing graph neural network architecture for predicting molecular properties relevant to drug discovery, including binding affinity, toxicity, and ADMET profiles. The model outperforms traditional QSAR methods by 35% on MoleculeNet benchmarks.",
    claims: ["A method for predicting molecular properties using a graph neural network operating on molecular graphs", "The method of claim 1, wherein the GNN uses attention-weighted message passing", "A computer system for drug candidate screening using the method of claim 1"],
    inventors: ["Dr. Rachel Green", "Dr. Thomas Anderson", "Dr. Nisha Gupta"], assignee: "PharmaML Inc.", filing_date: "2023-09-05", publication_date: "2024-06-15", status: "Published",
    cpc_classifications: ["G16C20/70", "G06N3/045", "G16B15/30"], ipc_classifications: ["G16C20/70"], citations: ["US10,456,789", "US10,789,012", "US11,001,234"], similarity_score: 0.93, metadata: { domain: "AI/ML", innovation_level: "High" }
  },
  {
    id: "pat-011", patent_number: "US11,234,568B2", title: "Microfluidic Lab-on-Chip Platform for Rapid Pathogen Detection",
    abstract: "An integrated microfluidic device combining sample preparation, nucleic acid amplification, and optical detection for point-of-care pathogen identification within 15 minutes. Compatible with respiratory, blood-borne, and waterborne pathogen panels.",
    claims: ["A microfluidic device for pathogen detection comprising integrated sample preparation and amplification chambers", "The device of claim 1, wherein amplification uses isothermal loop-mediated methods"],
    inventors: ["Dr. Catherine Park", "Dr. Oluwaseun Adeyemi"], assignee: "BioDetect Solutions", filing_date: "2023-04-20", publication_date: "2024-02-28", status: "Granted",
    cpc_classifications: ["B01L3/5027", "C12Q1/6844", "G01N33/54366"], ipc_classifications: ["B01L3/50"], citations: ["US10,234,567", "US10,567,890"], similarity_score: 0.81, metadata: { domain: "Biotech", innovation_level: "Medium" }
  },
  {
    id: "pat-012", patent_number: "US11,345,679B2", title: "Reinforcement Learning Agent for Robotic Warehouse Automation",
    abstract: "A multi-agent reinforcement learning system for coordinating autonomous mobile robots in warehouse environments. The system optimizes pick-and-place operations, achieving 40% throughput improvement over traditional path-planning algorithms.",
    claims: ["A method for coordinating multiple autonomous robots using multi-agent reinforcement learning", "The method of claim 1, wherein agents share a centralized value function for cooperation"],
    inventors: ["Dr. Kevin O'Brien", "Dr. Yumiko Tanaka"], assignee: "RoboLogistics AI", filing_date: "2023-06-15", publication_date: "2024-04-10", status: "Published",
    cpc_classifications: ["G05D1/0211", "B25J9/1697", "G06N3/092"], ipc_classifications: ["G05D1/02"], citations: ["US10,345,678", "US10,678,901", "US10,901,234"], similarity_score: 0.89, metadata: { domain: "AI/ML", innovation_level: "Medium" }
  },
  {
    id: "pat-013", patent_number: "WO2024/001234", title: "Carbon Capture Membrane Using Metal-Organic Frameworks",
    abstract: "A mixed-matrix membrane incorporating zinc-based metal-organic frameworks (MOFs) for post-combustion CO2 capture. The membrane achieves CO2/N2 selectivity of 85 with permeability of 3500 Barrer, surpassing the Robeson upper bound.",
    claims: ["A gas separation membrane comprising a polymer matrix embedded with zinc-based MOF particles", "The membrane of claim 1, wherein the MOF has pore apertures of 3.4-3.8 Angstroms"],
    inventors: ["Prof. Hans Weber", "Dr. Aisha Okonkwo", "Dr. Carlos Mendez"], assignee: "CleanAir Technologies GmbH", filing_date: "2023-07-01", publication_date: "2024-01-04", status: "Published",
    cpc_classifications: ["B01D71/028", "B01D53/228", "C07F3/06"], ipc_classifications: ["B01D71/02"], citations: ["US10,123,456", "WO2023/045678"], similarity_score: 0.78, metadata: { domain: "Clean Energy", innovation_level: "High" }
  },
  {
    id: "pat-014", patent_number: "US11,456,790B2", title: "Edge Computing Framework for Low-Latency Augmented Reality",
    abstract: "A distributed edge computing architecture for AR applications that dynamically partitions rendering workloads between device and edge nodes. Achieves consistent sub-20ms motion-to-photon latency across varying network conditions.",
    claims: ["A method for distributing augmented reality rendering workloads between a mobile device and edge servers", "The method of claim 1, further comprising predictive workload migration based on user movement patterns"],
    inventors: ["Dr. Liam Foster", "Dr. Mei-Ling Chou"], assignee: "EdgeVR Systems", filing_date: "2023-05-30", publication_date: "2024-05-20", status: "Published",
    cpc_classifications: ["G06T19/006", "G06F9/5083", "H04L67/1097"], ipc_classifications: ["G06T19/00"], citations: ["US10,456,789", "US10,789,012"], similarity_score: 0.84, metadata: { domain: "AI/ML", innovation_level: "Medium" }
  },
  {
    id: "pat-015", patent_number: "US11,567,891B2", title: "mRNA Vaccine Platform with Self-Amplifying RNA Technology",
    abstract: "A self-amplifying RNA (saRNA) vaccine platform that enables dose-sparing immunization. The saRNA construct includes an alphavirus replicase gene enabling intracellular amplification, achieving protective immunity at 1/100th the dose of conventional mRNA vaccines.",
    claims: ["A self-amplifying RNA construct for vaccine applications comprising an alphavirus replicase gene", "The construct of claim 1, formulated in ionizable lipid nanoparticles for intramuscular delivery"],
    inventors: ["Dr. Isabelle Fournier", "Dr. Raj Krishnamurthy", "Dr. Elena Volkov"], assignee: "VaxRNA Biologics", filing_date: "2023-08-20", publication_date: "2024-06-25", status: "Published",
    cpc_classifications: ["A61K39/12", "C12N15/86", "A61P31/14"], ipc_classifications: ["A61K39/12"], citations: ["US10,890,123", "US11,012,345"], similarity_score: 0.82, metadata: { domain: "Biotech", innovation_level: "High" }
  },
  {
    id: "pat-016", patent_number: "US11,678,902B2", title: "Chiplet-Based Heterogeneous Integration for High-Performance Computing",
    abstract: "A chiplet interconnect architecture using hybrid bonding technology for heterogeneous integration of compute, memory, and I/O chiplets. The system achieves 10 TB/s inter-chiplet bandwidth with 0.5 pJ/bit energy efficiency.",
    claims: ["A multi-chiplet package comprising heterogeneous dies connected via hybrid copper-to-copper bonding", "The package of claim 1, wherein the interconnect achieves bandwidth density exceeding 1 Tbps/mm"],
    inventors: ["Dr. Victor Huang", "Dr. Sandra Novak"], assignee: "ChipScale Inc.", filing_date: "2023-02-14", publication_date: "2024-03-15", status: "Granted",
    cpc_classifications: ["H01L25/0655", "H01L23/538", "H01L24/16"], ipc_classifications: ["H01L25/065"], citations: ["US10,234,567", "US10,567,890", "US10,890,123"], similarity_score: 0.86, metadata: { domain: "Semiconductor", innovation_level: "High" }
  },
  {
    id: "pat-017", patent_number: "US11,789,013B2", title: "Diffusion Model for High-Fidelity 3D Scene Generation",
    abstract: "A score-based diffusion model for generating photorealistic 3D scenes from text descriptions. The model employs a novel tri-plane neural radiance field representation enabling consistent multi-view synthesis at 1024x1024 resolution.",
    claims: ["A method for generating 3D scenes from text using a diffusion model with tri-plane neural radiance field representation", "The method of claim 1, wherein the tri-plane representation encodes geometry and appearance separately"],
    inventors: ["Dr. Yichen Wu", "Dr. Aria Patel", "Dr. Felix Hoffman"], assignee: "SceneAI Labs", filing_date: "2023-10-01", publication_date: "2024-07-10", status: "Published",
    cpc_classifications: ["G06T17/00", "G06N3/0455", "G06T15/08"], ipc_classifications: ["G06T17/00"], citations: ["US11,123,456", "US11,234,567"], similarity_score: 0.94, metadata: { domain: "AI/ML", innovation_level: "High" }
  },
  {
    id: "pat-018", patent_number: "US11,890,124B2", title: "Green Hydrogen Production via Anion Exchange Membrane Electrolysis",
    abstract: "An anion exchange membrane (AEM) electrolyzer using non-precious metal catalysts for alkaline water electrolysis. Achieves 80% system efficiency at 2 A/cm² current density with projected costs below $300/kW.",
    claims: ["An AEM electrolyzer for hydrogen production comprising a nickel-iron anode catalyst and a nickel-molybdenum cathode catalyst", "The electrolyzer of claim 1, wherein the membrane has hydroxide conductivity exceeding 100 mS/cm"],
    inventors: ["Dr. Amara Diallo", "Dr. Peter Johansson"], assignee: "HydroGen Systems", filing_date: "2023-09-15", publication_date: "2024-07-20", status: "Published",
    cpc_classifications: ["C25B1/04", "C25B9/23", "C25B11/077"], ipc_classifications: ["C25B1/04"], citations: ["US10,345,678", "US10,678,901"], similarity_score: 0.80, metadata: { domain: "Clean Energy", innovation_level: "High" }
  },
  {
    id: "pat-019", patent_number: "EP4,123,456B1", title: "Neuromorphic Computing Chip with Spiking Neural Network Architecture",
    abstract: "A neuromorphic processor implementing spiking neural networks with 1 million neuron cores. The chip achieves 100x energy efficiency improvement over GPU-based inference for event-driven sensor processing tasks.",
    claims: ["A neuromorphic processor comprising an array of spiking neuron cores with programmable synaptic connections", "The processor of claim 1, wherein each core implements leaky integrate-and-fire neuron dynamics"],
    inventors: ["Dr. Klaus Schmidt", "Dr. Tomoko Nakamura", "Dr. Ryan O'Connor"], assignee: "NeuroChip Technologies AG", filing_date: "2023-01-10", publication_date: "2024-04-15", status: "Granted",
    cpc_classifications: ["G06N3/063", "G06N3/049", "G11C11/54"], ipc_classifications: ["G06N3/063"], citations: ["US10,456,789", "EP3,987,654", "US11,001,234"], similarity_score: 0.91, metadata: { domain: "Semiconductor", innovation_level: "High" }
  },
  {
    id: "pat-020", patent_number: "US11,901,235B2", title: "Autonomous Drone Swarm Coordination Using Consensus Algorithms",
    abstract: "A decentralized coordination protocol for autonomous drone swarms based on Byzantine fault-tolerant consensus algorithms. The protocol enables collaborative mapping, search-and-rescue, and agricultural monitoring with up to 500 drones operating simultaneously.",
    claims: ["A method for coordinating a swarm of autonomous drones using a Byzantine fault-tolerant consensus protocol", "The method of claim 1, wherein drones dynamically form sub-swarms based on task requirements"],
    inventors: ["Dr. Paulo Santos", "Dr. Fiona McAllister", "Dr. Dmitri Volkov"], assignee: "SwarmTech Robotics", filing_date: "2023-11-01", publication_date: "2024-08-05", status: "Published",
    cpc_classifications: ["G05D1/104", "B64C39/024", "H04W84/18"], ipc_classifications: ["G05D1/10"], citations: ["US10,567,890", "US10,890,123", "US11,012,345"], similarity_score: 0.87, metadata: { domain: "AI/ML", innovation_level: "Medium" }
  },
  {
    id: "pat-021", patent_number: "US11,987,654B2", title: "Dual-Display Foldable Smartphone with Adaptive User Interface Rendering",
    abstract: "A foldable consumer electronic device, such as a smartphone (e.g., iPhone), featuring dual OLED displays. The device dynamically adjusts UI rendering, touch sensitivity, and haptic feedback profiles based on the hinge angle and device orientation.",
    claims: ["A foldable smartphone comprising a housing, a hinge, a dual-display assembly, and an orientation sensor", "The device of claim 1, wherein the user interface dynamically transitions from single-screen to dual-screen rendering"],
    inventors: ["Steve Jobs Jr.", "Dr. Jony Ive"], assignee: "Cupertino Tech Inc.", filing_date: "2023-10-12", publication_date: "2024-07-30", status: "Granted",
    cpc_classifications: ["H04M1/02", "G06F3/041", "H04W88/02"], ipc_classifications: ["H04M1/02"], citations: ["US10,890,123", "US11,012,345"], similarity_score: 0.96, metadata: { domain: "Consumer Tech", innovation_level: "High" }
  },
  {
    id: "pat-022", patent_number: "US11,876,543B2", title: "Haptic Feedback Interface for Touch Screen Devices",
    abstract: "A system and method for generating localized haptic sensations on touch-sensitive displays of mobile devices, smart phones, and tablet computers. Uses piezoelectric actuators to simulate physical button presses and surface textures.",
    claims: ["A touch-sensitive display system comprising an interface controller, touch sensors, and localized haptic actuators", "The system of claim 1, wherein the haptic sensations vary dynamically based on user interface elements"],
    inventors: ["Dr. Craig Federighi", "Prof. Alan Turing"], assignee: "Apple Orchard Systems", filing_date: "2023-05-18", publication_date: "2024-04-12", status: "Granted",
    cpc_classifications: ["G06F3/016", "G06F3/0488", "H04M1/724"], ipc_classifications: ["G06F3/01"], citations: ["US10,234,567", "US10,567,890"], similarity_score: 0.90, metadata: { domain: "Consumer Tech", innovation_level: "Medium" }
  },
  {
    id: "pat-023", patent_number: "US11,765,432B2", title: "Adaptive Power Management in Battery-Powered Consumer Electronics",
    abstract: "An intelligent power management controller for battery-powered devices (such as iPhones, laptops, and tablets) that dynamically scales CPU/GPU clock speeds and wireless transmission power based on battery state-of-health and user usage patterns.",
    claims: ["A power management controller for consumer electronic devices comprising a battery sensor and a dynamic scaling module", "The controller of claim 1, wherein wireless transmission power is dynamically reduced during low-power modes"],
    inventors: ["Dr. Tim Cook", "Dr. Phil Schiller"], assignee: "Cupertino Tech Inc.", filing_date: "2023-02-22", publication_date: "2024-01-15", status: "Published",
    cpc_classifications: ["G06F1/3206", "H02J7/00", "H04W52/02"], ipc_classifications: ["G06F1/32"], citations: ["US10,123,456", "US10,345,678"], similarity_score: 0.88, metadata: { domain: "Consumer Tech", innovation_level: "Medium" }
  }
];

// Helper to compile wildcard query terms into RegExps
export function compileWildcardRegexes(query: string): RegExp[] {
  const terms = query
    .split(/[\s,._\-+/\\()]+/g)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  return terms.map((t) => {
    let pattern = t.replace(/[-\/\\^$.()|[\]{}]/g, "\\$&");
    pattern = pattern.replace(/\*/g, "\\w*").replace(/\?/g, "\\w");

    const startWithWildcard = t.startsWith("*");
    const endWithWildcard = t.endsWith("*");

    let regexStr = pattern;
    if (!startWithWildcard) {
      regexStr = "\\b" + regexStr;
    }
    if (!endWithWildcard) {
      regexStr = regexStr + "\\b";
    }
    return new RegExp(regexStr, "i");
  });
}

// Search mock patents by query
export function searchMockPatents(query: string, limit = 10): Patent[] {
  if (!query.trim()) return MOCK_PATENTS.slice(0, limit);
  const q = query.trim().toLowerCase();
  
  // If the query contains wildcards, perform regex-based wildcard search
  const hasWildcard = q.includes("*") || q.includes("?");
  if (hasWildcard) {
    const regexes = compileWildcardRegexes(q);
    let scored = MOCK_PATENTS.map((p) => {
      let score = 0;
      
      regexes.forEach((regex) => {
        if (regex.test(p.patent_number)) score += 300;
        if (regex.test(p.title)) score += 100;
        if (p.abstract && regex.test(p.abstract)) score += 60;
        if (p.assignee && regex.test(p.assignee)) score += 50;
        if (p.metadata && typeof p.metadata.domain === "string" && regex.test(p.metadata.domain)) {
          score += 80;
        }
        p.inventors.forEach((inv) => {
          if (regex.test(inv)) score += 30;
        });
        p.claims.forEach((cl) => {
          if (regex.test(cl)) score += 15;
        });
        p.cpc_classifications.forEach((cpc) => {
          if (regex.test(cpc)) score += 40;
        });
        if (regex.test(p.status)) score += 20;
      });
      
      return { patent: p, score };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      return scored.slice(0, limit).map((s) => {
        let sim = 0.5 + Math.min(0.49, s.score * 0.005);
        if (s.score >= 200) sim = 0.99;
        return { ...s.patent, similarity_score: sim };
      });
    }
  }

  const qClean = q.replace(/[^a-z0-9]/g, "");

  // Try direct keyword scoring
  let scored = MOCK_PATENTS.map((p) => {
    let score = 0;
    const patNoClean = p.patent_number.toLowerCase().replace(/[^a-z0-9]/g, "");
    const patIdClean = p.id.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Exact or partial ID / Patent Number match gets maximum priority
    if (patNoClean === qClean || patIdClean === qClean) {
      score += 500;
    } else if (patNoClean.includes(qClean) || qClean.includes(patNoClean)) {
      score += 250;
    } else if (p.patent_number.toLowerCase().includes(q)) {
      score += 200;
    }

    // Check citations list
    p.citations.forEach((cit) => {
      const citClean = cit.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (citClean === qClean || cit.toLowerCase().includes(q)) {
        score += 150;
      }
    });

    // Check CPC classifications exactly
    p.cpc_classifications.forEach((cpc) => {
      const cpcClean = cpc.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cpcClean === qClean || cpc.toLowerCase().includes(q)) {
        score += 100;
      }
    });

    // Check domain (patent type/domain)
    if (p.metadata && typeof p.metadata.domain === "string" && p.metadata.domain.toLowerCase().includes(q)) {
      score += 100;
    }

    // Check status
    if (p.status.toLowerCase().includes(q)) {
      score += 40;
    }

    // General text matching
    if (p.title.toLowerCase().includes(q)) score += 50;
    if (p.abstract.toLowerCase().includes(q)) score += 30;
    if (p.assignee.toLowerCase().includes(q)) score += 20;

    p.inventors.forEach((inv) => {
      if (inv.toLowerCase().includes(q)) score += 25;
    });

    p.claims.forEach((cl) => {
      if (cl.toLowerCase().includes(q)) score += 10;
    });
    
    // Sub-word matching
    const words = q.split(/\s+/);
    words.forEach((w) => {
      if (w.length < 3) return;
      if (p.title.toLowerCase().includes(w)) score += 5;
      if (p.abstract.toLowerCase().includes(w)) score += 3;
      if (p.assignee.toLowerCase().includes(w)) score += 2;
    });
    
    return { patent: p, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  // If we found specific matches, return them sorted by score
  if (scored.length > 0) {
    return scored.slice(0, limit).map((s) => {
      // Map score to a high similarity value if it matched well (e.g. > 100 score -> 0.95+ match)
      let sim = 0.5 + Math.min(0.49, s.score * 0.005);
      if (s.score >= 200) sim = 0.99;
      return { ...s.patent, similarity_score: sim };
    });
  }

  // Smart Query Fallback
  const mappings: Record<string, string[]> = {
    iphone: ["telecom", "display", "haptic", "power management", "mobile"],
    phone: ["telecom", "display", "haptic", "power management", "mobile"],
    apple: ["display", "haptic", "power management", "mobile"],
    google: ["ai/ml", "edge computing", "federated learning"],
    tesla: ["autonomous", "solid-state battery", "clean energy"],
    samsung: ["semiconductor", "chiplet", "finfet"],
  };

  let relatedKeywords: string[] = [];
  Object.entries(mappings).forEach(([key, val]) => {
    if (q.includes(key)) relatedKeywords.push(...val);
  });

  if (relatedKeywords.length > 0) {
    scored = MOCK_PATENTS.map((p) => {
      let score = 0;
      relatedKeywords.forEach((kw) => {
        if (p.title.toLowerCase().includes(kw) || p.abstract.toLowerCase().includes(kw)) {
          score += 5;
        }
      });
      return { patent: p, score };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  }

  // Final Fallback: Return top patents if still empty
  if (scored.length === 0) {
    scored = MOCK_PATENTS.slice(0, limit).map((p, idx) => ({
      patent: p,
      score: 10 - idx,
    }));
  }

  return scored.slice(0, limit).map((s) => ({
    ...s.patent,
    similarity_score: Math.min(0.99, 0.4 + s.score * 0.04)
  }));
}

// Get patent by ID
export function getMockPatent(id: string): Patent | undefined {
  return MOCK_PATENTS.find((p) => p.id === id);
}

// Filter patents with advanced filters
export function advancedFilterPatents(filters: {
  query?: string; assignee?: string; inventor?: string; status?: string;
  date_from?: string; date_to?: string; cpc_class?: string;
}, limit = 10): Patent[] {
  let results = [...MOCK_PATENTS];
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const hasWildcard = q.includes("*") || q.includes("?");
    if (hasWildcard) {
      const regexes = compileWildcardRegexes(q);
      results = results.filter((p) =>
        regexes.every(
          (regex) =>
            regex.test(p.title) ||
            (p.abstract && regex.test(p.abstract)) ||
            regex.test(p.patent_number) ||
            (p.assignee && regex.test(p.assignee)) ||
            (p.metadata && typeof p.metadata.domain === "string" && regex.test(p.metadata.domain))
        )
      );
    } else {
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.abstract.toLowerCase().includes(q) ||
          p.patent_number.toLowerCase().includes(q) ||
          p.assignee.toLowerCase().includes(q) ||
          (p.metadata && typeof p.metadata.domain === "string" && p.metadata.domain.toLowerCase().includes(q))
      );
    }
  }
  if (filters.assignee) {
    const a = filters.assignee.toLowerCase();
    results = results.filter((p) => p.assignee.toLowerCase().includes(a));
  }
  if (filters.inventor) {
    const inv = filters.inventor.toLowerCase();
    results = results.filter((p) => p.inventors.some((i) => i.toLowerCase().includes(inv)));
  }
  if (filters.status) results = results.filter((p) => p.status.toLowerCase() === filters.status!.toLowerCase());
  if (filters.date_from) results = results.filter((p) => p.filing_date >= filters.date_from!);
  if (filters.date_to) results = results.filter((p) => p.filing_date <= filters.date_to!);
  if (filters.cpc_class) {
    const c = filters.cpc_class.toUpperCase();
    results = results.filter((p) => p.cpc_classifications.some((cls) => cls.startsWith(c)));
  }
  return results.slice(0, limit);
}
