import fs from "fs";
import path from "path";
import { ProjectStudioData, FigureSheet, TechnicalDocument, getSeedStudioData } from "./types";

export * from "./types";

const LOCAL_STUDIO_DIR = path.join(process.cwd(), "src/app/api/design-team/data");
const LOCAL_STUDIO_FILE = path.join(LOCAL_STUDIO_DIR, "studio_store.json");

function ensureStoreExists(): Record<string, ProjectStudioData> {
  if (!fs.existsSync(LOCAL_STUDIO_DIR)) {
    fs.mkdirSync(LOCAL_STUDIO_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STUDIO_FILE)) {
    const defaultData = getSeedStudioData();
    const initialMap: Record<string, ProjectStudioData> = {
      "PRJ-10023": defaultData,
    };
    fs.writeFileSync(LOCAL_STUDIO_FILE, JSON.stringify(initialMap, null, 2), "utf-8");
    return initialMap;
  }
  try {
    return JSON.parse(fs.readFileSync(LOCAL_STUDIO_FILE, "utf-8"));
  } catch {
    return { "PRJ-10023": getSeedStudioData() };
  }
}

function saveStore(data: Record<string, ProjectStudioData>) {
  if (!fs.existsSync(LOCAL_STUDIO_DIR)) {
    fs.mkdirSync(LOCAL_STUDIO_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_STUDIO_FILE, JSON.stringify(data, null, 2), "utf-8");
}


export class DesignStudioService {
  static getProjectStudioData(projectId = "PRJ-10023"): ProjectStudioData {
    const store = ensureStoreExists();
    if (store[projectId]) {
      return store[projectId];
    }
    const fresh = getSeedStudioData(projectId);
    store[projectId] = fresh;
    saveStore(store);
    return fresh;
  }

  static saveFigure(projectId: string, figure: FigureSheet, userId = "designer"): { success: boolean; figure: FigureSheet; savedAt: string } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const existingIdx = project.figures.findIndex(f => f.id === figure.id);
    const now = new Date().toISOString();
    const updatedFig = { ...figure, version: (figure.version || 1) + 1, lastSavedAt: now };

    if (existingIdx >= 0) {
      project.figures[existingIdx] = updatedFig;
    } else {
      project.figures.push(updatedFig);
    }

    project.saveHistory.unshift({
      version: updatedFig.version,
      savedAt: now,
      savedBy: userId,
      summary: `Saved Figure ${figure.figureNumber}: "${figure.figureTitle}"`
    });

    store[projectId] = project;
    saveStore(store);

    return { success: true, figure: updatedFig, savedAt: now };
  }

  static addFigure(projectId: string, title?: string, number?: number): FigureSheet {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const nextNum = number || (project.figures.length > 0 ? Math.max(...project.figures.map(f => f.figureNumber)) + 1 : 1);
    const figTitle = title || `Figure ${nextNum}`;
    const now = new Date().toISOString();

    const newFig: FigureSheet = {
      id: `fig-${Date.now()}`,
      figureNumber: nextNum,
      figureTitle: figTitle,
      description: "",
      elements: [],
      version: 1,
      lastSavedAt: now
    };

    project.figures.push(newFig);
    project.figures.sort((a, b) => a.figureNumber - b.figureNumber);
    store[projectId] = project;
    saveStore(store);

    return newFig;
  }

  static duplicateFigure(projectId: string, figureId: string): FigureSheet {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const source = project.figures.find(f => f.id === figureId);
    if (!source) throw new Error("Figure not found");

    const nextNum = Math.max(...project.figures.map(f => f.figureNumber)) + 1;
    const now = new Date().toISOString();

    const duplicated: FigureSheet = {
      ...JSON.parse(JSON.stringify(source)),
      id: `fig-${Date.now()}`,
      figureNumber: nextNum,
      figureTitle: `${source.figureTitle} (Copy)`,
      version: 1,
      lastSavedAt: now
    };

    project.figures.push(duplicated);
    store[projectId] = project;
    saveStore(store);

    return duplicated;
  }

  static deleteFigure(projectId: string, figureId: string): boolean {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    if (project.figures.length <= 1) {
      throw new Error("Cannot delete the only remaining figure in the project.");
    }

    project.figures = project.figures.filter(f => f.id !== figureId);
    store[projectId] = project;
    saveStore(store);
    return true;
  }

  static saveTechnicalDocument(projectId: string, doc: TechnicalDocument, userId = "designer"): { success: boolean; document: TechnicalDocument; savedAt: string } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const now = new Date().toISOString();
    const updatedDoc = { ...doc, version: (doc.version || 1) + 1, lastModified: now, author: userId };

    const idx = project.technicalDocuments.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
      project.technicalDocuments[idx] = updatedDoc;
    } else {
      project.technicalDocuments.push(updatedDoc);
    }

    project.saveHistory.unshift({
      version: updatedDoc.version,
      savedAt: now,
      savedBy: userId,
      summary: `Updated document "${doc.title}"`
    });

    store[projectId] = project;
    saveStore(store);

    return { success: true, document: updatedDoc, savedAt: now };
  }

  static submitForReview(projectId: string, payload: {
    recipientRole: "PATENT_DRAFTER" | "PATENT_ANALYST" | "CEO";
    recipientName?: string;
    selectedFigures: string[];
    selectedDocs: string[];
    message: string;
    userId?: string;
  }): { success: boolean; submissionId: string; timestamp: string; newStatus: string } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const now = new Date().toISOString();
    const submissionId = `SUB-${Date.now()}`;

    project.status = "UNDER_REVIEW";

    // Add to project documents list as a submitted record
    project.projectDocuments.unshift({
      id: submissionId,
      title: `Submission Package — ${payload.recipientRole.replace('_', ' ')} Review`,
      category: "Submitted Documents",
      fileFormat: "ZIP/PDF",
      version: 1,
      createdBy: payload.userId || "Design Team Lead",
      lastModified: now,
      workflowStatus: "Under Review",
      size: "6.4 MB"
    });

    project.saveHistory.unshift({
      version: (project.saveHistory[0]?.version || 1) + 1,
      savedAt: now,
      savedBy: payload.userId || "designer",
      summary: `Submitted package with ${payload.selectedFigures.length} figures and ${payload.selectedDocs.length} technical documents to ${payload.recipientRole}. Message: "${payload.message}"`
    });

    store[projectId] = project;
    saveStore(store);

    return {
      success: true,
      submissionId,
      timestamp: now,
      newStatus: "UNDER_REVIEW"
    };
  }

  static uploadProjectDocument(projectId: string, doc: {
    title: string;
    category: any;
    fileFormat: string;
    version: string;
    size: string;
    notes?: string;
    tags?: string[];
    author?: string;
  }): { success: boolean; document: any } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const now = new Date().toISOString();
    const docId = `DOC-${Date.now().toString().slice(-4)}`;
    const newDoc = {
      id: docId,
      title: doc.title,
      category: doc.category,
      fileFormat: doc.fileFormat || "PDF",
      version: doc.version || "1.0",
      createdBy: doc.author || "Lead Patent Designer",
      lastModified: now.split("T")[0],
      workflowStatus: "Active",
      size: doc.size || "1.5 MB",
      url: `/documents/${doc.title.toLowerCase().replace(/\s+/g, '_')}.${(doc.fileFormat || 'pdf').toLowerCase()}`,
      description: doc.notes || `Uploaded project document: ${doc.title}`,
      tags: doc.tags || [doc.category],
      securityClassification: "Confidential Project Work Product",
      checksum: `sha256:${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`,
      versionHistory: [
        {
          version: doc.version || "1.0",
          date: now,
          author: doc.author || "Lead Patent Designer",
          notes: doc.notes || "Initial document upload.",
          size: doc.size || "1.5 MB"
        }
      ]
    };

    project.projectDocuments.unshift(newDoc);
    project.saveHistory.unshift({
      version: (project.saveHistory[0]?.version || 1) + 1,
      savedAt: now,
      savedBy: doc.author || "Lead Patent Designer",
      summary: `Uploaded document "${newDoc.title}" to ${newDoc.category}`
    });

    store[projectId] = project;
    saveStore(store);

    return { success: true, document: newDoc };
  }

  static deleteProjectDocument(projectId: string, docId: string): { success: boolean; deleted: boolean } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const initialLength = project.projectDocuments.length;
    project.projectDocuments = project.projectDocuments.filter(d => d.id !== docId);

    store[projectId] = project;
    saveStore(store);

    return { success: true, deleted: project.projectDocuments.length < initialLength };
  }

  static bumpDocumentVersion(projectId: string, docId: string, payload: {
    newVersion: string;
    notes: string;
    fileFormat?: string;
    size?: string;
    author?: string;
  }): { success: boolean; document: any } {
    const store = ensureStoreExists();
    const project = store[projectId] || getSeedStudioData(projectId);

    const doc = project.projectDocuments.find(d => d.id === docId);
    if (!doc) throw new Error("Document not found");

    const now = new Date().toISOString();
    const authorName = payload.author || "Lead Patent Designer";

    const historyRecord = {
      version: payload.newVersion,
      date: now,
      author: authorName,
      notes: payload.notes || `Revision update to v${payload.newVersion}`,
      size: payload.size || doc.size
    };

    doc.version = payload.newVersion;
    doc.lastModified = now.split("T")[0];
    if (payload.fileFormat) doc.fileFormat = payload.fileFormat;
    if (payload.size) doc.size = payload.size;
    if (!doc.versionHistory) doc.versionHistory = [];
    doc.versionHistory.unshift(historyRecord);

    project.saveHistory.unshift({
      version: (project.saveHistory[0]?.version || 1) + 1,
      savedAt: now,
      savedBy: authorName,
      summary: `Incremented "${doc.title}" to version v${payload.newVersion}`
    });

    store[projectId] = project;
    saveStore(store);

    return { success: true, document: doc };
  }
}
