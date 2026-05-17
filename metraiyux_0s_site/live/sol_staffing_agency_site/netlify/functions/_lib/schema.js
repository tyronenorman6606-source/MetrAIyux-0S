const COLLECTIONS = [
  "leads",
  "job_orders",
  "candidates",
  "placements",
  "timesheets",
  "gov_pursuits",
  "ae_leads",
  "vendors",
  "risks",
  "brain_feedback",
  "documents",
  "audit"
];

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue).join(", ").slice(0, 4000);
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, 12000);
}

function sanitizeData(input) {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!key || key.startsWith("_") || key === "bot-field") continue;
    output[key.slice(0, 80)] = sanitizeValue(value);
  }
  return output;
}

function classify(formName, data = {}) {
  const form = String(formName || data["form-name"] || data.form_name || "general-intake").toLowerCase();
  const keys = Object.keys(data).join(" ").toLowerCase();
  const haystack = `${form} ${keys}`;

  if (/government|prime|procurement|capability|rfp|rfq|sam|uei|cage|gov/.test(haystack)) return "gov_pursuits";
  if (/candidate|recruiter|resume|apply|application|screening|readiness|submission/.test(haystack)) return "candidates";
  if (/job-order|job_order|staffing-request|role|headcount|employer/.test(haystack)) return "job_orders";
  if (/placement/.test(haystack)) return "placements";
  if (/timesheet|invoice|hours/.test(haystack)) return "timesheets";
  if (/ae-|ae_|account executive|commission/.test(haystack)) return "ae_leads";
  if (/vendor|subcontractor/.test(haystack)) return "vendors";
  if (/risk|mitigation/.test(haystack)) return "risks";
  if (/brain/.test(haystack)) return "brain_feedback";
  return "leads";
}

function summaryFields(record) {
  const data = record.data || {};
  return {
    id: record.id,
    collection: record.collection,
    status: record.status,
    created_at: record.created_at,
    title: data.company || data.employer || data.candidate_name || data.name || data.risk_title || data.vendor_name || data.topic || data.role || "Untitled",
    contact: data.contact || data.contact_name || data.email || data.phone || "",
    type: record.form_name || record.type || ""
  };
}

module.exports = { COLLECTIONS, classify, sanitizeData, summaryFields };
