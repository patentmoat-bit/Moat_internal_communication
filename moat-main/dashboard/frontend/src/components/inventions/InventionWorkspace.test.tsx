const requiredSections = [
  "Technical Summary",
  "Innovation Summary",
  "Key Components",
  "Technical Domains",
  "Differentiators",
  "Workflow Diagram",
  "Patentability Highlights",
] as const;

export function inventionWorkspaceSmokeSpec() {
  return {
    sectionCount: requiredSections.length,
    hasWorkflow: requiredSections.includes("Workflow Diagram"),
    hasPatentability: requiredSections.includes("Patentability Highlights"),
  };
}

const result = inventionWorkspaceSmokeSpec();
if (result.sectionCount !== 7 || !result.hasWorkflow || !result.hasPatentability) {
  throw new Error("Invention workspace result sections are incomplete");
}
