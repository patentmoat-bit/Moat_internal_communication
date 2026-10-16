// MOAT Design Studio Types and Data Models

export interface DrawingElement {
  id: string;
  type: "rectangle" | "rounded-rect" | "circle" | "ellipse" | "diamond" | "triangle" | "polygon" | "line" | "arrow" | "connector" | "text" | "callout" | "reference-numeral";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  refNumber?: string;
  subText?: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
  textVAlign?: "top" | "middle" | "bottom";
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  points?: Array<{ x: number; y: number }>;
  locked?: boolean;
  visible?: boolean;
  iconName?: string;
}

export interface FigureSheet {
  id: string;
  figureNumber: number;
  figureTitle: string;
  description: string;
  elements: DrawingElement[];
  thumbnailUrl?: string;
  version: number;
  lastSavedAt: string;
}

export interface TechnicalDocument {
  id: string;
  title: string;
  documentType: string;
  version: number;
  lastModified: string;
  content: string;
  pages?: string[];
  author: string;
}

export interface DocumentVersionRecord {
  version: number | string;
  date: string;
  author: string;
  notes: string;
  size: string;
}

export interface ProjectDocumentItem {
  id: string;
  title: string;
  category: "Disclosures" | "Technical Documents" | "Drawings" | "PDFs" | "Images" | "Research References" | "Export Files" | "Submitted Documents" | "Final Documents";
  fileFormat: string;
  version: number | string;
  createdBy: string;
  lastModified: string;
  workflowStatus: string;
  size: string;
  url?: string;
  description?: string;
  versionHistory?: DocumentVersionRecord[];
  tags?: string[];
  securityClassification?: string;
  checksum?: string;
}

export interface StudioSubmission {
  id: string;
  projectId: string;
  recipientRole: string;
  notes?: string;
  selectedFigures: any[];
  selectedDocs: any[];
  selectedExports: any[];
  message?: string;
  submittedBy: string;
  submittedAt: string;
  status: string;
  complianceStatus: string;
  sha256Lock: string;
}

export interface StudioReview {
  id: string;
  submissionId: string;
  projectId: string;
  reviewerName: string;
  reviewerRole: string;
  decision: string;
  feedback: string;
  decidedAt: string;
  reworkDirectives?: string[];
}

export interface ProjectStudioData {
  projectId: string;
  inventionId: string;
  designTaskId: string;
  projectTitle: string;
  inventionTitle: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "REWORK" | "COMPLETED";
  assignedDesigner: string;
  assigneeRole: string;
  dueDate: string;
  problemStatement: string;
  proposedSolution: string;
  technicalOverview: string;
  technicalInformation: Array<{ label: string; value: string }>;
  researchReferences: Array<{ title: string; citation: string; link?: string }>;
  sourceDocuments: Array<{ name: string; size: string; type: string; url: string }>;
  drawingInstructions: string;
  relatedClaims: Array<{ number: number; text: string; preamble?: string }>;
  figures: FigureSheet[];
  technicalDocuments: TechnicalDocument[];
  projectDocuments: ProjectDocumentItem[];
  saveHistory: Array<{ version: number; savedAt: string; savedBy: string; summary: string }>;
  submissions?: StudioSubmission[];
  reviews?: StudioReview[];
}

export function getSeedStudioData(projectId = ""): ProjectStudioData {
  return {
    projectId: projectId,
    inventionId: "",
    designTaskId: "",
    projectTitle: "",
    inventionTitle: "",
    status: "IN_PROGRESS",
    assignedDesigner: "",
    assigneeRole: "designer",
    dueDate: "",
    problemStatement: "",
    proposedSolution: "",
    technicalOverview: "",
    technicalInformation: [],
    researchReferences: [],
    sourceDocuments: [],
    drawingInstructions: "Create USPTO compliant drawings according to 37 CFR § 1.84.",
    relatedClaims: [],
    figures: [
      {
        id: "fig-1",
        figureNumber: 1,
        figureTitle: "Figure 1",
        description: "",
        elements: [],
        version: 1,
        lastSavedAt: new Date().toISOString()
      }
    ],
    technicalDocuments: [
      {
        id: "TD-001",
        title: "Technical Description",
        documentType: "Technical Description",
        version: 1,
        lastModified: new Date().toISOString(),
        author: "",
        content: "<p><br></p>"
      }
    ],
    projectDocuments: [],
    saveHistory: []
  };
}
