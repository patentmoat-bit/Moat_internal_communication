"use client";

import React, { useState } from "react";
import { 
  Send, X, CheckCircle2, AlertCircle, FileText, 
  Layers, UserCheck, ShieldCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FigureSheet, TechnicalDocument, ProjectStudioData } from "@/lib/design-team/types";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectData: ProjectStudioData;
  onSubmit: (submission: {
    recipientRole: "PATENT_DRAFTER" | "PATENT_ANALYST" | "CEO";
    recipientName: string;
    selectedFigures: string[];
    selectedDocs: string[];
    message: string;
  }) => Promise<void>;
}

export function SubmissionModal({
  isOpen,
  onClose,
  projectData,
  onSubmit
}: SubmissionModalProps) {
  const [recipientRole, setRecipientRole] = useState<"PATENT_DRAFTER" | "PATENT_ANALYST" | "CEO">("PATENT_DRAFTER");
  const [selectedFigures, setSelectedFigures] = useState<string[]>(projectData.figures.map((f) => f.id));
  const [selectedDocs, setSelectedDocs] = useState<string[]>(projectData.technicalDocuments.map((d) => d.id));
  const [message, setMessage] = useState(
    "Completed formal drawings FIG 1 through FIG 5 with reference numerals 100-series through 500-series. Printable margins verified for USPTO compliance."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleFigure = (id: string) => {
    setSelectedFigures((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedFigures.length === 0 && selectedDocs.length === 0) {
      alert("Please select at least one figure or technical document to submit.");
      return;
    }

    const recipientName = 
      recipientRole === "PATENT_DRAFTER" ? "Patent Drafter" :
      recipientRole === "PATENT_ANALYST" ? "Patent Analyst" : "Chief Executive Officer";

    try {
      setIsSubmitting(true);
      await onSubmit({
        recipientRole,
        recipientName,
        selectedFigures,
        selectedDocs,
        message
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Submit Design Package for Review
              </h3>
              <p className="text-xs text-slate-500">
                Project: {projectData.projectId} • {projectData.inventionTitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Recipient Dropdown */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Authorized Review Recipient
            </label>
            <select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value as any)}
              className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PATENT_DRAFTER">Patent Drafter (Specification Integration)</option>
              <option value="PATENT_ANALYST">Patent Analyst (Prior-Art Alignment)</option>
              <option value="CEO">Chief Executive Officer (Final Executive Filing Sign-Off)</option>
            </select>
          </div>

          {/* Included Figures */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center mb-1.5">
              <span>Included Drawing Sheets ({selectedFigures.length}/{projectData.figures.length})</span>
              <span className="text-[11px] text-blue-600 font-normal">USPTO 1-Inch Border Verified</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-lg">
              {projectData.figures.map((fig) => (
                <label 
                  key={fig.id} 
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedFigures.includes(fig.id)
                      ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-semibold"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFigures.includes(fig.id)}
                    onChange={() => toggleFigure(fig.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">FIG. {fig.figureNumber} — {fig.figureTitle}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Included Technical Documents */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Included Technical Documents ({selectedDocs.length}/{projectData.technicalDocuments.length})
            </label>
            <div className="space-y-1.5 max-h-28 overflow-y-auto p-1">
              {projectData.technicalDocuments.map((doc) => (
                <label
                  key={doc.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    selectedDocs.includes(doc.id)
                      ? "bg-blue-50/50 border-blue-200 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 font-semibold"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="truncate">{doc.title} (v{doc.version})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submission Message */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Review Notes & Instructions
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide comments or instructions for the reviewer..."
              className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Confirm & Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
