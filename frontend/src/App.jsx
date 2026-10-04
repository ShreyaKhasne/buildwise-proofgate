import React, { useEffect, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Clock3, CloudUpload, Eye, FileCheck2,
  Download, FileText, GitBranch, HardHat, Image as ImageIcon, Layers3, LockKeyhole, MapPin, Menu,
  MessageSquareText, Network, RefreshCw, Scale, Search, ShieldCheck, Sparkles, Truck, X, XCircle
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";
const materialSeed = [
  { id: "concrete", name: "Ready-mix concrete", category: "PRIMARY MATERIAL", specification: "M25", specification_source: "BOQ / Structural Requirement", expected_quantity: 18, unit: "m³", supported_initial: 12.5, supported_verified: 18, supported_quantity: 12.5, supplier: "GreenMix RMC", invoice: "RMC Invoice #INV-204", deliveries_initial: 2, deliveries_verified: 3, images: ["concrete-slab.jpg", "site-progress.jpg"], status: "partial", confidence: 68, risk: "HIGH", risk_reason: "Two delivery records support 12.5 m³ against 18 m³ required. A 5.5 m³ receipt closes the documented quantity gap." },
  { id: "steel", name: "TMT reinforcement steel", category: "PRIMARY MATERIAL", specification: "TMT · Fe 500D per BOQ", specification_source: "BOQ / Structural Requirement", expected_quantity: 1250, unit: "kg", supported_initial: 1250, supported_verified: 1250, supported_quantity: 1250, supplier: "Apex Buildworks", invoice: "Steel Invoice #ST-882", deliveries_initial: 1, deliveries_verified: 1, images: ["reinforcement.jpg", "site-progress.jpg"], status: "inspection_pending", confidence: 91, risk: "MEDIUM", risk_reason: "Invoice quantity and BOQ specification match. Engineer inspection proof is a separate mandatory evidence item." },
  { id: "cement", name: "Cement", category: "SUPPORTING MATERIAL", specification: "Per approved procurement documents", specification_source: "Procurement schedule", expected_quantity: null, unit: "supporting procurement", supported_initial: null, supported_verified: null, supported_quantity: null, supplier: "Apex Buildworks", invoice: "Cement Invoice #CM-417", deliveries_initial: 1, deliveries_verified: 1, images: ["site-progress.jpg"], status: "supporting", confidence: 88, risk: "LOW", risk_reason: "Procurement documentation is present. Packaging visibility is supporting only; product specification must be documented." },
  { id: "aggregate", name: "Coarse & fine aggregate", category: "SUPPORTING MATERIAL", specification: "Per approved mix design", specification_source: "Approved mix design", expected_quantity: null, unit: "supporting procurement", supported_initial: null, supported_verified: null, supported_quantity: null, supplier: "GreenMix RMC", invoice: "Supplier ticket #AG-039", deliveries_initial: 1, deliveries_verified: 1, images: ["site-progress.jpg"], status: "supporting", confidence: 80, risk: "LOW", risk_reason: "Supplier ticket supports procurement. Visual appearance cannot establish aggregate grade or exact quantity." }
];
const photoObservations = {
  "concrete-slab.jpg": { title: "Slab casting · Photo #01", observations: ["Slab surface visible", "Active construction area", "Visual context consistent with RCC work"], confidence: 84 },
  "reinforcement.jpg": { title: "Reinforcement placement · Photo #02", observations: ["Reinforcement bars visually visible", "Site activity visible", "Engineer inspection still required"], confidence: 82 },
  "site-progress.jpg": { title: "Site progress · Photo #03", observations: ["Construction progress visible", "Material context is supporting evidence only", "No exact quantity is inferred from the image"], confidence: 80 }
};
const initialEvidence = [
  { name: "BOQ — RCC Slab", type: "Project plan", source: "Project team", timestamp: "04 Oct · 09:10", confidence: 98, status: "supporting" },
  { name: "Structural Drawing — S04", type: "Drawing", source: "Structural consultant", timestamp: "04 Oct · 09:12", confidence: 96, status: "supporting" },
  { name: "Milestone Payment Schedule", type: "Payment schedule", source: "Project team", timestamp: "04 Oct · 09:14", confidence: 98, status: "supporting" },
  { name: "Concrete Delivery Receipt #104 · 7.0 m³", type: "Delivery receipt", source: "GreenMix RMC", timestamp: "04 Oct · 10:18", confidence: 91, status: "supporting", quantity_m3: 7 },
  { name: "Concrete Delivery Receipt #118 · 5.5 m³", type: "Delivery receipt", source: "GreenMix RMC", timestamp: "04 Oct · 10:31", confidence: 93, status: "supporting", quantity_m3: 5.5 },
  { name: "Steel Invoice — 1,250 kg", type: "Invoice", source: "Apex Buildworks", timestamp: "04 Oct · 10:20", confidence: 94, status: "supporting" },
  { name: "Slab Progress Photos", type: "Site photos", source: "Apex Buildworks", timestamp: "04 Oct · 10:25", confidence: 82, status: "uncertain" },
  { name: "Engineer Inspection Note", type: "Inspection", source: "Project engineer", timestamp: "Not submitted", confidence: 0, status: "missing" }
];
const initialAudit = [
  ["10:42:11", "Claim submitted", "Apex Buildworks · RCC Slab Completion"],
  ["10:42:15", "Claim extracted", "₹3,20,000 requested · 100% completion"],
  ["10:42:19", "BOQ checked", "RCC slab quantities matched to approved plan"],
  ["10:42:23", "Delivery receipt analyzed", "12.5 m³ verified against 18 m³ expected"],
  ["10:42:27", "Skeptic challenge raised", "Concrete shortfall and inspection proof missing"],
  ["10:42:30", "Evidence Judge completed", "Partially verified · engineer approval required"],
  ["10:42:31", "Payment recommendation generated", "₹2,10,000 release · ₹1,10,000 held"]
];
const isAdditionalReceipt = (item) => item.name === "Concrete_Delivery_02.pdf" ||
  (item.source === "Contractor upload" && item.proof_kind === "concrete_delivery");
const isInspectionCertificate = (item) => item.name === "Reinforcement_Inspection.pdf" ||
  (item.source === "Contractor upload" && item.proof_kind === "reinforcement_inspection");
const classifyProof = (name) => /delivery|receipt|challan|ticket/i.test(name)
  ? "concrete_delivery"
  : /inspection|engineer[-_ ]?certificate/i.test(name) ? "reinforcement_inspection" : null;

const stages = [
  { title: "Claim Extractor", icon: FileText, state: "complete", summary: "RCC slab completed — ₹3.2 lakh requested.", detail: "Milestone: RCC Slab Completion · Claimed completion: 100% · Contractor: Apex Buildworks" },
  { title: "Evidence Matcher", icon: Network, state: "complete", summary: "Documents, materials, quantities and images cross-checked.", detail: "Document check → Material Investigator → Quantity reconciliation → Visual-context check. Expected concrete: 18 m³ · Initially supported: 12.5 m³ · Steel invoice: 1,250 / 1,250 kg." },
  { title: "Skeptic Agent", icon: AlertTriangle, state: "challenge", summary: "3 evidence gaps need attention.", detail: "Quantity mismatch: 5.5 m³ · Reinforcement inspection missing · Final engineer sign-off missing" },
  { title: "Evidence Judge", icon: ShieldCheck, state: "ready", summary: "Partially verified · recommendation ready.", detail: "Recommend release ₹2,10,000 and hold ₹1,10,000 pending proof. Engineer approval required." }
];

const money = (value) => `₹${(value / 100000).toFixed(2)}L`;
const formatRupees = (value) => `₹${Number(value).toLocaleString("en-IN")}`;
const timeNow = () => new Date().toLocaleTimeString("en-IN", { hour12: false });
const downloadEvidenceCsv = (records) => {
  const columns = ["Document", "Type", "Source", "Timestamp", "Confidence", "Status"];
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns, ...records.map((item) => [
    item.name, item.type, item.source, item.timestamp, item.confidence, item.status
  ])].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "buildwise-evidence-register.csv";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function App() {
  const [evidence, setEvidence] = useState(initialEvidence);
  const [materials, setMaterials] = useState(materialSeed);
  const [verified, setVerified] = useState(false);
  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [expandedStage, setExpandedStage] = useState(2);
  const [showScore, setShowScore] = useState(false);
  const [modal, setModal] = useState("");
  const materialFromHash = new URLSearchParams(window.location.hash.split("?")[1] || "").get("material");
  const [selectedMaterial, setSelectedMaterial] = useState(() => materialSeed.find((item) => item.id === materialFromHash) || null);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [terminalLines, setTerminalLines] = useState([]);
  const [whatIfReceipt, setWhatIfReceipt] = useState(false);
  const [whatIfInspection, setWhatIfInspection] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [toast, setToast] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [decisions, setDecisions] = useState([]);
  const [audit, setAudit] = useState(initialAudit);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const uploadKindRef = useRef("auto");
  const [mobileNav, setMobileNav] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [activeView, setActiveView] = useState(() => (window.location.hash.slice(1).split("?")[0] || "dashboard"));
  const [resetting, setResetting] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const score = verified ? 94 : 68;
  const release = verified ? 320000 : 210000;
  const held = verified ? 0 : 110000;
  const receiptAdded = evidence.some(isAdditionalReceipt);
  const inspectionAdded = evidence.some(isInspectionCertificate);

  useEffect(() => {
    const syncView = () => {
      const hash = window.location.hash.slice(1);
      const nextView = hash.split("?")[0] || "dashboard";
      setActiveView(nextView);
      if (nextView === "material-detail") {
        const materialId = new URLSearchParams(hash.split("?")[1] || "").get("material");
        setSelectedMaterial(materialSeed.find((item) => item.id === materialId) || null);
      } else setSelectedMaterial(null);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", syncView);
    return () => window.removeEventListener("hashchange", syncView);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/demo`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load demo state.");
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.evidence)) setEvidence(data.evidence);
            if (data.result) setVerified(data.result.status === "verified");
            if (Array.isArray(data.materials)) setMaterials(data.materials);
        if (Array.isArray(data.audit_events)) {
          setAudit(data.audit_events.map(({ time, event, detail }) => [time, event, detail]));
        }
      })
      .catch(() => {
        if (!cancelled) setToast("Backend unavailable; showing the deterministic demo locally.");
      });
    return () => { cancelled = true; };
  }, []);

  const recordAudit = (event, detail) => setAudit((items) => [...items, [timeNow(), event, detail]]);

  const runVerification = async () => {
    if (running) return;
    setRunning(true);
    setActiveStage(0);
    setTerminalLines([]);
    recordAudit(verified ? "Re-verification started" : "Verification started", "Four-stage ProofGate agent workflow");
    const liveLines = [
      "Claim received · RCC Slab Completion",
      "BOQ loaded · M25 concrete · 18 m³ required",
      "Steel quantity checked · 1,250 / 1,250 kg",
      verified || receiptAdded ? "Concrete receipts reconciled · 18 / 18 m³" : "Concrete receipts support 12.5 / 18 m³",
      "Site photos reviewed · visual context is supporting evidence",
      inspectionAdded ? "Inspection evidence found · engineer review remains required" : "Inspection evidence missing · engineer review required",
      "Skeptic Agent challenging unresolved evidence gaps",
      "Evidence Judge preparing a recommendation · human approval required"
    ];
    for (const [index, line] of liveLines.entries()) {
      await new Promise((resolve) => window.setTimeout(resolve, 240));
      setTerminalLines((items) => [...items, [timeNow(), line]]);
    }
    for (let index = 0; index < stages.length; index += 1) {
      setActiveStage(index);
      await new Promise((resolve) => window.setTimeout(resolve, 680));
    }
    let backendUnavailable = false;
    let analysisNotice = "";
    const hasCompleteProof = receiptAdded && inspectionAdded;
    const hasNewProof = receiptAdded || inspectionAdded;
    try {
      if (!verified) {
        const claimResponse = await fetch(`${API}/api/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "RCC slab work is complete.", requested_amount: 320000 })
        });
        if (!claimResponse.ok) throw new Error("Claim extraction endpoint returned an error.");
        const claimResult = await claimResponse.json();
        analysisNotice = claimResult.fallback_notice || "";
      }
      const response = await fetch(`${API}${hasNewProof ? "/api/reverify" : "/api/verify"}`, { method: "POST" });
      if (response.status === 409) {
        const payload = await response.json();
        analysisNotice = payload.detail || "Independent evidence requirements remain open.";
      } else if (!response.ok) {
        throw new Error("Verification endpoint returned an error.");
      } else {
      const verificationResult = await response.json();
      analysisNotice = verificationResult.fallback_notice || analysisNotice;
      if (Array.isArray(verificationResult.materials)) setMaterials(verificationResult.materials);
      }
    } catch {
      backendUnavailable = true;
    }
    if (hasCompleteProof) {
      setVerified(true);
      setEvidence((items) => items.map((item) => item.status === "missing" ? { ...item, timestamp: timeNow(), confidence: 94, status: "supporting" } : item));
      setMaterials((items) => items.map((item) => ({
        ...item,
        supported_quantity: item.supported_verified,
        status: item.status_verified || (item.id === "steel" ? "supported" : item.status),
        confidence: item.confidence_verified || item.confidence,
      })));
      recordAudit("Payment eligibility updated", "Verified · ₹3,20,000 eligible subject to engineer approval");
      setToast(analysisNotice || (backendUnavailable
        ? "Backend unavailable; deterministic demo completed locally. Full payment is eligible, subject to engineer approval."
        : "Verification complete. Full payment is eligible, subject to engineer approval."));
    } else {
      recordAudit("Payment recommendation generated", "₹2,10,000 release · ₹1,10,000 held");
      setToast(analysisNotice || (backendUnavailable
        ? "Backend unavailable; deterministic demo completed locally. Three proof gaps remain."
        : "Verification complete. Three proof gaps remain."));
    }
    setActiveStage(-1);
    setRunning(false);
  };

  const addDemoProof = async () => {
    if (verified || (receiptAdded && inspectionAdded)) {
      setToast("The missing proof has already been added to this demo.");
      return;
    }
    try {
      const response = await fetch(`${API}/api/demo-proof`, { method: "POST" });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Demo evidence endpoint returned an error.");
      }
      const payload = await response.json();
      if (Array.isArray(payload.evidence)) setEvidence(payload.evidence);
      if (Array.isArray(payload.materials)) setMaterials(payload.materials);
      setToast("Two missing proofs added. Re-run verification to update the recommendation.");
      recordAudit("Additional evidence uploaded", "Concrete_Delivery_02.pdf · Reinforcement_Inspection.pdf");
    } catch (error) {
      if (!(error instanceof TypeError)) {
        setToast(error.message || "The demo evidence could not be added.");
        return;
      }
      const now = timeNow();
      const additions = [
        { name: "Concrete_Delivery_02.pdf", type: "Delivery receipt", source: "Contractor upload", timestamp: now, confidence: 94, status: "supporting", quantity_m3: 5.5, proof_kind: "concrete_delivery" },
        { name: "Reinforcement_Inspection.pdf", type: "Inspection certificate", source: "Project engineer", timestamp: now, confidence: 96, status: "supporting", proof_kind: "reinforcement_inspection" }
      ].filter((proof) => proof.proof_kind === "concrete_delivery" ? !receiptAdded : !inspectionAdded);
      setEvidence((items) => [...items.filter((item) => item.status !== "missing" && !additions.some((proof) => proof.name === item.name)), ...additions]);
      recordAudit("Additional evidence uploaded", additions.map((item) => item.name).join(" · "));
      setMaterials((items) => items.map((item) => item.id === "concrete"
        ? { ...item, supported_quantity: item.supported_verified, status: "quantity_reconciled" }
        : item.id === "steel" ? { ...item, status: "inspection_received_pending_reverification" } : item));
      setToast("Two missing proofs added to the local demo. Re-run verification to update the recommendation.");
    }
  };

  const chooseEvidenceFiles = (proofKind = "auto") => {
    if (uploading) return;
    uploadKindRef.current = proofKind;
    if (fileRef.current) {
      fileRef.current.accept = proofKind === "site_photo" ? ".png,.jpg,.jpeg" : ".pdf,.png,.jpg,.jpeg";
    }
    fileRef.current?.click();
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const proofKind = uploadKindRef.current;
    uploadKindRef.current = "auto";
    await processFiles(files, proofKind);
  };

  const processFiles = async (files, requestedKind = "auto") => {
    if (!files.length) return;
    const allowed = /\.(pdf|png|jpe?g)$/i;
    const invalid = files.find((file) => !allowed.test(file.name));
    if (invalid) {
      setToast(`${invalid.name} is not supported. Choose a PDF, PNG, JPG, or JPEG file.`);
      return;
    }
    if (requestedKind === "site_photo" && files.some((file) => !/\.(png|jpe?g)$/i.test(file.name))) {
      setToast("Site photos must be PNG, JPG, or JPEG images.");
      return;
    }
    const tooLarge = files.find((file) => file.size > 15 * 1024 * 1024);
    if (tooLarge) {
      setToast(`${tooLarge.name} exceeds the 15 MB upload limit.`);
      return;
    }
    const duplicate = files.find((file, index) =>
      evidence.some((item) => item.name.toLowerCase() === file.name.toLowerCase()) ||
      files.slice(0, index).some((previous) => previous.name.toLowerCase() === file.name.toLowerCase())
    );
    if (duplicate) {
      setToast(`${duplicate.name} is already in this evidence register.`);
      return;
    }
    setUploading(true);
    const localItems = files.map((file) => {
      const detectedKind = classifyProof(file.name);
      const proofKind = requestedKind === "auto" ? detectedKind
        : requestedKind === "supporting" ? null : requestedKind;
      const isSitePhoto = proofKind === "site_photo" || (requestedKind === "auto" && /photo|site[-_ ]?image/i.test(file.name));
      return {
        name: file.name,
        type: proofKind === "concrete_delivery" ? "Delivery receipt" : proofKind === "reinforcement_inspection" ? "Inspection certificate" : isSitePhoto ? "Site photos" : "Uploaded evidence",
        proof_kind: isSitePhoto ? "site_photo" : proofKind,
        ...(proofKind === "concrete_delivery" ? { quantity_m3: 5.5 } : {}),
        source: "Contractor upload", timestamp: timeNow(), confidence: 86, status: isSitePhoto ? "uncertain" : "supporting"
      };
    });
    try {
      const data = new FormData();
      files.forEach((file) => data.append("files", file));
      data.append("proof_kind", requestedKind);
      const response = await fetch(`${API}/api/upload-evidence`, { method: "POST", body: data });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.detail || "Evidence upload failed.");
      }
      const payload = await response.json();
      if (!Array.isArray(payload.uploaded)) throw new Error("The server returned an invalid upload response.");
      setEvidence((items) => [...items, ...payload.uploaded]);
      if (Array.isArray(payload.materials)) setMaterials(payload.materials);
      recordAudit("Additional evidence uploaded", files.map((file) => file.name).join(", "));
      setToast(`${files.length} evidence ${files.length === 1 ? "file" : "files"} added.`);
    } catch (error) {
      if (error instanceof TypeError) {
        setEvidence((items) => [...items, ...localItems]);
        recordAudit("Additional evidence uploaded", files.map((file) => file.name).join(", "));
        setToast("Backend unavailable; files are added to this demo locally.");
      } else {
        setToast(error.message || "Evidence upload failed. The files were not added.");
      }
    }
    setUploading(false);
  };

  const requestEvidence = () => {
    setRequestSent(true);
    recordAudit("Evidence request sent", "Contractor asked for delivery receipt, inspection certificate and engineer sign-off");
    setToast("Evidence request sent to contractor.");
  };

  const calculateWhatIf = async (receiptAdded, inspectionAdded) => {
    setWhatIfReceipt(receiptAdded);
    setWhatIfInspection(inspectionAdded);
    try {
      const response = await fetch(`${API}/api/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_added: receiptAdded, inspection_added: inspectionAdded })
      });
      if (!response.ok) throw new Error("What-if check failed.");
      setWhatIfResult(await response.json());
    } catch {
      const quantity = 12.5 + (receiptAdded ? 5.5 : 0);
      setWhatIfResult({
        supported_concrete_m3: quantity,
        expected_concrete_m3: 18,
        inspection_present: inspectionAdded,
        decision_logic: quantity < 18 ? "PARTIAL QUANTITY" : inspectionAdded ? "FULLY SUPPORTED" : "MISSING MANDATORY INSPECTION",
        action: quantity < 18 ? "partial_release" : inspectionAdded ? "eligible_pending_human" : "engineer_review",
        human_review_required: true
      });
    }
  };

  const openEvidenceByName = (name) => {
    const item = evidence.find((entry) => entry.name.toLowerCase().includes(name.toLowerCase())) ||
      { name, type: "Project source", source: "Approved project documents", timestamp: "04 Oct · 09:10", confidence: 98, status: "supporting" };
    setSelectedEvidence(item);
  };

  const decide = async (decision) => {
    const item = [timeNow(), "Human decision recorded", `Engineer / Supervisor · ${decision}`];
    setDecisions((items) => [...items, item]);
    recordAudit(item[1], item[2]);
    setModal("");
    setToast(`“${decision}” recorded in the audit trail.`);
    try {
      const response = await fetch(`${API}/api/human-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, actor: "Engineer / Supervisor" })
      });
      if (!response.ok) throw new Error("Decision endpoint returned an error.");
    } catch {
      setToast("Decision recorded in this demo's local audit trail; backend is unavailable.");
    }
  };

  const resetDemo = async () => {
    if (resetting || running) return;
    setResetting(true);
    let nextEvidence = initialEvidence;
    let nextMaterials = materialSeed;
    let nextAudit = initialAudit;
    let backendUnavailable = false;
    try {
      const response = await fetch(`${API}/api/demo/reset`, { method: "POST" });
      if (!response.ok) throw new Error("The demo reset was rejected by the backend.");
      const data = await response.json();
      nextEvidence = data.evidence;
      nextMaterials = data.materials;
      nextAudit = data.audit_events.map(({ time, event, detail }) => [time, event, detail]);
    } catch (error) {
      if (error instanceof TypeError) {
        backendUnavailable = true;
      } else {
        setToast(error.message || "Could not reset the demo.");
        setResetting(false);
        return;
      }
    }
    setEvidence(nextEvidence);
    setMaterials(nextMaterials);
    setAudit(nextAudit);
    setVerified(false);
    setDecisions([]);
    setRequestSent(false);
    setWhatIfReceipt(false);
    setWhatIfInspection(false);
    setWhatIfResult(null);
    setTerminalLines([]);
    setSelectedMaterial(null);
    setSelectedEvidence(null);
    setSelectedPhoto(null);
    setModal("");
    window.location.hash = "dashboard";
    setToast(backendUnavailable
      ? "Backend unavailable; the local demo reset. Reloading will restore the backend state."
      : "Demo reset. The original evidence gaps are ready to investigate again.");
    setResetting(false);
  };

  const openMaterialPage = (material) => {
    setSelectedMaterial(material);
    window.location.hash = `material-detail?material=${encodeURIComponent(material.id)}`;
  };

  const navItems = [
    [Activity, "Dashboard", "#dashboard"],
    [ClipboardCheck, "Payment Claims", "#claims"],
    [Network, "Evidence Intelligence", "#evidence"],
    [Layers3, "Materials", "#materials"],
    [FileText, "Documents", "#documents"],
    [ImageIcon, "Site Photos", "#photos"],
    [Sparkles, "AI Investigation", "#investigation"],
    [CheckCircle2, "Payment Decisions", "#decisions"],
    [GitBranch, "Project Timeline", "#timeline"],
    [Clock3, "Audit Trail", "#audit"],
    [FileCheck2, "Reports", "#reports"]
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#dashboard" onClick={() => setMobileNav(false)}>
          <span className="brand-mark"><Layers3 size={20} strokeWidth={2.2} /></span>
          <span className="brand-word">buildwise<span>PROOFGATE</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <div className="project-switcher"><span className="project-avatar">GH</span><span><b>Green Heights</b><small>Residence · Pune</small></span><ChevronDown size={15} /></div>
        <div className="nav-label">PROJECT</div>
        <nav className="side-nav">
          {navItems.map(([Icon, label, href]) => (
            <a key={label} className={`nav-link ${activeView === href.slice(1) || (activeView === "material-detail" && label === "Materials") ? "selected" : ""}`} href={href} onClick={() => setMobileNav(false)}>
              <Icon size={17} /><span>{label}</span>{label === "Evidence Intelligence" && <span className="nav-count">{evidence.length}</span>}
            </a>
          ))}
        </nav>
        <div className="side-status"><span className="status-pulse" /><span><b>Demo Mode</b><small>Deterministic verification</small></span><span className="switch-on" /></div>
        <button className="demo-reset-button" onClick={resetDemo} disabled={resetting || running}><RefreshCw size={12} className={resetting ? "spin" : ""} />{resetting ? "Resetting demo…" : "Reset demo scenario"}</button>
        <div className="human-note"><LockKeyhole size={15} /><span>Human-in-the-loop<br /><b>Always enabled</b></span></div>
        <div className="sidebar-foot">BUILDWISE PROOFGATE <span>v1.0 · DEMO</span></div>
      </aside>

      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-content" id="dashboard">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Green Heights Residence</span><ChevronRight size={14} /><b>Payment claims</b></div>
          <label className="global-search"><Search size={14} /><input value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") window.location.hash = "evidence"; }} placeholder="Search evidence, materials, documents..." /><kbd>ENTER</kbd></label>
          <div className="top-actions"><span className="demo-mode-tag">DEMO MODE</span><span className="live-label"><span /> SYSTEM OPERATIONAL</span><button className="icon-button notification" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} /><i /></button><span className="user-avatar">AK</span></div>
          {notificationsOpen && <div className="notification-popover"><div><b>Recent activity</b><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={13} /></button></div>{audit.slice(-4).reverse().map((item, index) => <button key={`${item[0]}-${index}`} onClick={() => { setNotificationsOpen(false); window.location.hash = "audit"; }}><i /><span><b>{item[1]}</b><small>{item[2]}</small></span><time>{item[0]}</time></button>)}</div>}
        </header>

        <div className="page-wrap">
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleFiles} />
          {activeView === "dashboard" ? <>
          <div className="trust-banner"><ShieldCheck size={15} /><span>AI recommendation — final payment decision remains with authorized project personnel.</span><span className="banner-tag">HUMAN CONTROLLED</span></div>
          <section className="page-heading hero-header">
            <div className="hero-heading-copy"><div className="eyebrow"><span className="eyebrow-dot" /> PAYMENT CLAIM · PG-2026-014</div><h1>RCC Slab Completion</h1><p>Contractor claim for milestone payment <span className="heading-separator">/</span> <span className={`status-pill ${verified ? "verified" : ""}`}><i />{verified ? "VERIFIED" : "PARTIALLY VERIFIED"}</span></p><div className="hero-project-details"><span><b>PROJECT</b> Green Heights Residence</span><i /><span><b>CLAIM DATE</b> 04 Oct 2026</span><i /><span><b>LOCATION</b> Pune, Maharashtra</span></div></div>
            <div className="heading-actions"><button className="button secondary" onClick={() => setModal("report")}><FileText size={16} /> View report</button><button className="button primary" onClick={runVerification} disabled={running}><RefreshCw size={16} className={running ? "spin" : ""} />{running ? "Verifying..." : verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? "Re-run Verification" : "Run ProofGate"}</button></div>
          </section>

          <section className="kpi-grid" aria-label="Payment summary">
            <Kpi label="PAYMENT REQUESTED" value="₹3.20L" note="Milestone schedule · 10%" icon={ArrowUpRight} color="blue" />
            <Kpi label="RECOMMENDED RELEASE" value={money(release)} note={verified ? "Full amount eligible" : "Evidence-supported portion"} icon={ArrowDownRight} color="green" />
            <Kpi label="AMOUNT HELD" value={money(held)} note={verified ? "No outstanding proof gaps" : "Pending proof & review"} icon={LockKeyhole} color="amber" />
            <button className="kpi-card score-card" onClick={() => setShowScore(true)}><span className="kpi-top"><span>EVIDENCE CONFIDENCE</span><CircleHelp size={14} /></span><span className="kpi-value">{score}<small>%</small></span><span className="score-bottom"><span className="mini-progress"><i style={{ width: `${score}%` }} /></span><span>{verified ? "Strong" : "Moderate"}</span></span></button>
          </section>

          <ProjectProgress verified={verified} />

          <PipelineStrip verified={verified} running={running} />

          <section className="panel material-intelligence" id="materials">
            <PanelHeading kicker="MATERIAL INTELLIGENCE · RCC SLAB COMPLETION" title="Material evidence coverage" right={<span className="material-overall"><b>{verified ? "93%" : "81%"}</b> OVERALL COVERAGE</span>} />
            <p className="material-subtitle">Cross-check materials against approved specifications, quantities, procurement records and site evidence.</p>
            <div className="material-grid">
              {materials.map((material) => <MaterialCard key={material.id} material={material} verified={verified}
                onOpen={() => setSelectedMaterial(material)}
                onPhoto={() => setSelectedPhoto(material.images?.[0] || "site-progress.jpg")} />)}
            </div>
            <p className="visual-caveat"><Eye size={14} /> Visual analysis provides supporting evidence only. Specifications and quantities must be verified against approved documents, invoices, delivery records, and qualified inspection.</p>
            <div className="material-risk-row">{materials.map((material) => <button className={`risk-chip risk-${material.risk.toLowerCase()}`} key={material.id} onClick={() => setSelectedMaterial(material)}><span>{material.risk}</span>{material.name}<small>Why?</small></button>)}</div>
          </section>

          <div className="advanced-grid">
            <section className="panel quantity-panel">
              <PanelHeading kicker="DOCUMENT-BASED RECONCILIATION" title="Concrete quantity check" right={<span className={`quantity-status ${verified || receiptAdded ? "matched" : ""}`}>{verified || receiptAdded ? "QUANTITY RECONCILED" : "QUANTITY GAP"}</span>} />
              <div className="quantity-figures"><span><b>{verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? "18.0" : "12.5"}</b> / 18.0 m³ <small>supported / expected</small></span><span className="quantity-percent">{verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? "100%" : "69%"}</span></div>
              <div className="quantity-track"><i style={{ width: `${verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? 100 : 69}%` }} /></div>
              <div className="delivery-ledger">
                {[
                  ...[{ name: "Concrete Delivery Receipt #104", quantity: 7 }, { name: "Concrete Delivery Receipt #118", quantity: 5.5 }],
                  ...(verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? [{ name: "Concrete_Delivery_02.pdf", quantity: 5.5 }] : [])
                ].map((receipt, index) => <button key={`${receipt.name}-${index}`} className="delivery-line" onClick={() => openEvidenceByName(receipt.name)}><span><Truck size={14} />{receipt.name}<small>Page 1 · supplier delivery record</small></span><b>{receipt.quantity.toFixed(1)} m³</b><Eye size={14} /></button>)}
              </div>
              {!receiptAdded && !verified && <div className="unsupported-quantity"><AlertTriangle size={14} /><span>Remaining unsupported</span><b>5.5 m³</b></div>}
              {!verified && receiptAdded && <div className="inspection-pending"><AlertTriangle size={14} /><span>Quantity is reconciled. Mandatory reinforcement inspection remains separate and still requires engineer review.</span></div>}
              <div className="quantity-source"><span>SOURCE TRACE</span><button onClick={() => openEvidenceByName("BOQ")}>BOQ_RCC_Slab.pdf · Page 2</button><button onClick={() => openEvidenceByName("Concrete Delivery Receipt")}>Delivery receipts · Pages 1–2</button></div>
            </section>

            <section className="panel spec-panel">
              <PanelHeading kicker="DOCUMENT-ONLY SPECIFICATION CHECK" title="Specification checks" right={<span className="muted-tag"><ClipboardCheck size={13} /> CONTROLLED DATA</span>} />
              <div className="spec-check"><span className="spec-indicator matched"><Check size={13} /></span><span><b>Concrete grade</b><small>Required M25 · BOQ M25</small></span><span className="spec-result">MATCH</span></div>
              <div className="spec-check"><span className="spec-indicator matched"><Check size={13} /></span><span><b>Reinforcement</b><small>TMT · Fe 500D per approved BOQ</small></span><span className="spec-result">MATCH</span></div>
              <button className="spec-source" onClick={() => openEvidenceByName("Structural Drawing")}><FileText size={14} /><span>Specification source</span><b>BOQ & Structural Requirement · View</b><ChevronRight size={14} /></button>
              <p className="spec-note">Exact grades and performance characteristics are verified from approved documents—not inferred from photos.</p>
            </section>

            <section className="panel evidence-map-advanced">
              <PanelHeading kicker="SOURCE TRACEABILITY" title="Evidence relationship graph" right={<span className="muted-tag"><GitBranch size={13} /> LIVE LINKS</span>} />
              <div className="graph-flow">
                <button className="graph-node claim-graph" onClick={() => setModal("report")}><MessageSquareText size={14} /><b>RCC Slab Claim</b><small>₹3,20,000 · 100%</small></button>
                <span className="graph-link purple-link" />
                <button className="graph-node material-graph" onClick={() => setSelectedMaterial(materials.find((item) => item.id === "concrete"))}><Layers3 size={14} /><b>Concrete · M25</b><small>{verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? "18 / 18 m³" : "12.5 / 18 m³"}</small></button>
                <div className="graph-evidence-row"><button className="graph-evidence" onClick={() => openEvidenceByName("BOQ")}>BOQ <small>18 m³</small></button><button className="graph-evidence partial" onClick={() => openEvidenceByName("Concrete Delivery Receipt")}>RECEIPTS <small>{verified || evidence.some((item) => item.name === "Concrete_Delivery_02.pdf") ? "18 m³" : "12.5 m³"}</small></button><button className="graph-evidence" onClick={() => setSelectedPhoto("concrete-slab.jpg")}>SITE PHOTO <small>Visual support</small></button></div>
                <span className={`graph-link ${verified ? "green-link" : "amber-link"}`} />
                <button className={`graph-node skeptic-graph ${verified ? "resolved" : ""}`} onClick={() => setSelectedEvidence({ name: "Skeptic Agent finding", type: "Quantity challenge", source: "Evidence Matcher · Delivery receipts", timestamp: timeNow(), confidence: 94, status: verified ? "resolved" : "challenge" })}><AlertTriangle size={14} /><b>Skeptic Agent</b><small>{verified ? "Quantity gap resolved" : "5.5 m³ gap · proof needed"}</small></button>
                <span className={`graph-link ${verified ? "green-link" : "purple-link"}`} />
                <div className={`graph-decision ${verified ? "verified" : ""}`}><ShieldCheck size={14} /><b>{verified ? "Verified · 94%" : "Partial proof · 68%"}</b><small>Recommendation · human approval required</small></div>
              </div>
              <div className="graph-legend"><span><i className="blue" />Source record</span><span><i className="amber" />Partial evidence</span><span><i className="purple" />Agent reasoning</span><span><i className="green" />Resolved support</span></div>
            </section>

            <section className="panel whatif-panel">
              <PanelHeading kicker="NON-DESTRUCTIVE SCENARIO" title="What-if evidence simulation" right={<span className="muted-tag"><Sparkles size={13} /> DOES NOT CHANGE CASE</span>} />
              <p className="whatif-intro">Preview how independent evidence requirements affect the recommendation. This does not modify the current claim.</p>
              <label className="whatif-toggle"><input type="checkbox" checked={whatIfReceipt} onChange={(event) => calculateWhatIf(event.target.checked, whatIfInspection)} /><span className="toggle-track" /><span><b>Additional concrete receipt · 5.5 m³</b><small>Concrete_Delivery_02.pdf</small></span></label>
              <label className="whatif-toggle"><input type="checkbox" checked={whatIfInspection} onChange={(event) => calculateWhatIf(whatIfReceipt, event.target.checked)} /><span className="toggle-track" /><span><b>Reinforcement inspection certificate</b><small>Qualified inspection record</small></span></label>
              <div className="whatif-result"><span>{whatIfResult?.supported_concrete_m3 ?? 12.5} / 18 m³ concrete supported</span><b>{whatIfResult?.decision_logic || "PARTIAL QUANTITY"}</b><small>{whatIfResult?.decision_logic === "FULLY SUPPORTED" ? "Evidence supports eligibility; engineer approval is still required." : whatIfResult?.decision_logic === "MISSING MANDATORY INSPECTION" ? "Quantity reconciles, but mandatory inspection remains outstanding." : "Partial quantity means partial release only; outstanding proof remains."}</small></div>
              <p className="logic-note"><Scale size={13} /> A high confidence score cannot override a missing mandatory inspection or unresolved material gap.</p>
            </section>
          </div>

          <div className="content-grid">
            <div className="column-main">
              <section className="panel claim-panel" id="claim">
                <PanelHeading kicker="SUBMITTED FOR REVIEW" title="Contractor claim" right={<span className="muted-tag"><Clock3 size={13} /> Today, 10:42 AM</span>} />
                <div className="claim-main"><div className="contractor-avatar"><HardHat size={21} /></div><div className="claim-quote"><blockquote>“RCC slab work is complete.”</blockquote><span>Apex Buildworks <i /> Claim #PG-2026-014</span></div><div className="claim-amount"><small>REQUESTED</small><b>₹3,20,000</b></div></div>
                <div className="claim-meta"><div><span>COMPLETION</span><b>100%</b></div><div><span>MILESTONE</span><b>RCC slab</b></div><div><span>CONTRACTOR</span><b>Apex Buildworks</b></div><div><span>PROJECT BUDGET</span><b>₹32.0L</b></div></div>
                <div className="submitted-row"><span>SUBMITTED EVIDENCE</span><div className="chips"><EvidenceChip icon={FileText} label="4 Site Photos" /><EvidenceChip icon={Truck} label="2 Concrete Receipts" /><EvidenceChip icon={ClipboardCheck} label="1 Steel Invoice" /><EvidenceChip icon={MessageSquareText} label="1 Progress Note" /></div></div>
                <button className="inline-run" onClick={runVerification} disabled={running}><Sparkles size={15} />{running ? "Agents are investigating..." : receiptAdded ? "Re-run Verification" : "Run ProofGate"}<ChevronRight size={15} /></button>
              </section>

              <section className="panel investigation-panel" id="investigation">
                <PanelHeading kicker="TRANSPARENT AGENT LOOP" title="AI investigation" right={<span className={`run-state ${running ? "is-running" : ""}`}><span />{running ? "INVESTIGATION RUNNING" : "4 AGENTS · READY"}</span>} />
                <div className="agent-flow">
                  {stages.map((stage, index) => {
                    const Icon = stage.icon;
                    const completed = running ? index < activeStage : true;
                    const current = running && index === activeStage;
                    const flag = stage.state === "challenge" && !verified;
                    return <div className={`agent-row ${current ? "current" : ""} ${flag ? "has-warning" : ""}`} key={stage.title}>
                      <button className="agent-summary" onClick={() => setExpandedStage(expandedStage === index ? -1 : index)}>
                        <span className={`agent-icon ${flag ? "warning" : completed ? "done" : ""} ${current ? "processing" : ""}`}><Icon size={16} /></span>
                        <span className="agent-copy"><b>{stage.title}</b><small>{stage.summary}</small></span>
                        <span className={`agent-status ${flag ? "warning-text" : ""}`}>{current ? <><i className="status-pulse" />Analyzing</> : flag ? "Challenge detected" : completed ? "Complete" : "Queued"}</span>
                        <ChevronDown className={`expand-chevron ${expandedStage === index ? "expanded" : ""}`} size={15} />
                      </button>
                      {expandedStage === index && <div className="agent-detail">{stage.detail}</div>}
                    </div>;
                  })}
                </div>
                <div className="process-caption"><span>CLAIM</span><i /><span>EVIDENCE</span><i /><span className="accent">SKEPTIC</span><i /><span>JUDGE</span><i /><span>HUMAN APPROVAL</span></div>
                <div className="terminal-panel"><div className="terminal-head"><span className="terminal-light red" /><span className="terminal-light amber" /><span className="terminal-light green" /><b>BUILDWISE AI ENGINE</b><span>{running ? "LIVE ANALYSIS" : verified ? "RE-VERIFIED" : "DEMO TRACE"}</span></div><div className="terminal-log">{(terminalLines.length ? terminalLines : [
                  ["10:42:11", "Claim received · RCC Slab Completion"],
                  ["10:42:13", "BOQ loaded · M25 concrete · 18 m³ required"],
                  ["10:42:15", "Delivery records found · 12.5 m³ supported"],
                  ["10:42:17", "Site images reviewed · casting visually supported"],
                  ["10:42:19", "Inspection evidence missing"],
                  ["10:42:20", "Skeptic Agent challenge raised · 5.5 m³ gap"]
                ]).slice(-8).map(([time, line], index) => <div className="terminal-line" key={`${time}-${index}`}><time>{time}</time><i />{line}</div>)}</div><div className="terminal-foot"><span className={running ? "terminal-running" : ""} />{running ? "AGENTS PROCESSING EVIDENCE" : "DETERMINISTIC DEMO ENGINE · AUDITABLE OUTPUT"}</div></div>
              </section>

              <section className="panel map-panel">
                <PanelHeading kicker="TRACEABLE RELATIONSHIPS" title="Evidence-to-decision map" right={<span className="muted-tag"><Network size={13} /> CLAIM → EVIDENCE → DECISION</span>} />
                <div className="evidence-map">
                  <div className="map-node claim-map-node"><span className="map-node-icon"><MessageSquareText size={15} /></span><b>Contractor claim</b><small>₹3,20,000 · 100% complete</small><span className="map-connector" /></div>
                  <div className="map-evidence-group">
                    <span className="map-group-label">CROSS-CHECKED AGAINST</span>
                    <div className="map-evidence-items">
                      <MapEvidence label="BOQ" state="good" />
                      <MapEvidence label="Drawing" state="good" />
                      <MapEvidence label="Payment schedule" state="good" />
                      <MapEvidence label="Steel invoice" state="good" />
                      <MapEvidence label="Delivery receipt" state={verified ? "good" : "warning"} />
                      <MapEvidence label="Site photos" state="warning" />
                      <MapEvidence label="Engineer note" state={verified ? "good" : "missing"} />
                    </div>
                  </div>
                  <div className="map-node judge-map-node"><span className={`map-node-icon ${verified ? "green" : "amber"}`}><ShieldCheck size={15} /></span><b>Evidence Judge</b><small>{verified ? "Verified · 94% confidence" : "Partial · 68% confidence"}</small></div>
                </div>
                <div className="map-legend"><span><i className="legend-good" />Supporting</span><span><i className="legend-warning" />Needs review</span><span><i className="legend-missing" />Missing proof</span><small>Connections indicate evidence relevance, not proof of structural safety.</small></div>
              </section>

              <section className="panel evidence-panel" id="evidence">
                <PanelHeading kicker="SOURCE DOCUMENTS" title="Evidence register" right={<button className="text-action" onClick={() => chooseEvidenceFiles("auto")} disabled={uploading}><CloudUpload size={15} /> Upload evidence</button>} />
                <div className="evidence-table">
                  <div className="evidence-head"><span>DOCUMENT</span><span>TYPE · SOURCE</span><span>CONFIDENCE</span><span>STATUS</span></div>
                  {evidence.map((item, index) => <EvidenceRow key={`${item.name}-${index}`} item={item} onOpen={() => setSelectedEvidence(item)} />)}
                </div>
                <div className="upload-options" aria-label="Choose evidence upload category">
                  <button className="upload-option" onClick={() => chooseEvidenceFiles("concrete_delivery")} disabled={uploading}><Truck size={13} />Delivery receipt</button>
                  <button className="upload-option" onClick={() => chooseEvidenceFiles("reinforcement_inspection")} disabled={uploading}><ShieldCheck size={13} />Inspection certificate</button>
                  <button className="upload-option" onClick={() => chooseEvidenceFiles("supporting")} disabled={uploading}><FileText size={13} />Supporting document</button>
                  <button className="upload-option" onClick={() => chooseEvidenceFiles("site_photo")} disabled={uploading}><ImageIcon size={13} />Site photo</button>
                </div>
                <button className="drop-evidence" onClick={() => chooseEvidenceFiles("auto")} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void processFiles(Array.from(event.dataTransfer.files), "auto"); }}><CloudUpload size={17} /><span><b>ADD EVIDENCE</b><small>Drop receipts, inspection notes or site photos here · PDF, JPG, PNG</small></span><span className="drop-action">Browse files</span></button>
                {uploading && <div className="upload-status"><span className="spinner" /> Uploading and indexing evidence…</div>}
                <div className="evidence-footer"><span><span className="status-pulse" /> {evidence.length} evidence items in this review</span><span>PDF · PNG · JPG · JPEG <i /> Max 15 MB per file</span></div>
              </section>

            </div>

            <div className="column-side">
              <section className="panel evidence-side-panel">
                <PanelHeading kicker="EVIDENCE VAULT" title="Evidence reviewed" right={<span className="evidence-count">{verified ? "7 / 7 VERIFIED" : "5 / 7 MATCHED"}</span>} />
                <div className="evidence-side-list">
                  {evidence.slice(0, 6).map((item, index) => <EvidenceSideRow key={`${item.name}-${index}`} item={item} onOpen={() => setSelectedEvidence(item)} />)}
                </div>
                <button className="side-upload" onClick={() => chooseEvidenceFiles("auto")} disabled={uploading}><CloudUpload size={14} />Upload evidence<span>PDF · PNG · JPG</span></button>
                <div className="site-photos-heading"><b>Site photos ({verified ? 4 : 3})</b><a href="#evidence">View all <ChevronRight size={12} /></a></div>
                <div className="site-photo-grid"><button className="site-photo photo-one" aria-label="Open slab casting photo" onClick={() => setSelectedPhoto("concrete-slab.jpg")} /><button className="site-photo photo-two" aria-label="Open reinforcement photo" onClick={() => setSelectedPhoto("reinforcement.jpg")} /><button className="site-photo photo-three" aria-label="Open site progress photo" onClick={() => setSelectedPhoto("site-progress.jpg")} /></div>
                <div className="photo-caption"><span>Slab casting · 04 Oct</span><span>Site upload</span></div>
                <div className="map-preview"><img src="/images/site-progress.jpg" alt="Green Heights construction progress supporting image" /><button className="map-marker marker-concrete" aria-label="Concrete area evidence" onClick={() => openEvidenceByName("Concrete Delivery Receipt")} /><button className="map-marker marker-steel" aria-label="Reinforcement evidence" onClick={() => setSelectedPhoto("reinforcement.jpg")} /><button className="map-marker marker-slab" aria-label="Slab photo evidence" onClick={() => setSelectedPhoto("concrete-slab.jpg")} /><span className="map-image-caption"><MapPin size={12} /> DEMO SITE VIEW · MARKERS LINK TO EVIDENCE, NOT MEASUREMENTS</span></div>
              </section>

              <section className={`result-card ${verified ? "result-verified" : ""}`} id="result">
                <div className="result-top"><span className="result-icon"><ShieldCheck size={19} /></span><span className="result-label">PROOFGATE RESULT</span><span className={`result-status ${verified ? "positive" : ""}`}><i />{verified ? "VERIFIED" : "PARTIAL"}</span></div>
                <div className="result-title">{verified ? "Payment eligible" : "Partially verified"}</div>
                <p className="result-desc">{verified ? "Required supporting evidence is present." : "Some claim details are supported; additional proof is required."}</p>
                <div className="result-divider" />
                <div className="result-money"><div><span>RECOMMENDED RELEASE</span><b>{formatRupees(release)}</b></div><div className="release-bar"><i style={{ width: `${verified ? 100 : 66}%` }} /></div><div className="money-split"><span>Requested <b>₹3,20,000</b></span><span>Hold <b>{formatRupees(held)}</b></span></div></div>
                <div className="result-conf"><span>Evidence confidence</span><b>{score}%</b><div className="confidence-track"><i style={{ width: `${score}%` }} /></div></div>
                <div className="result-review"><LockKeyhole size={14} /><span>HUMAN APPROVAL</span><b>REQUIRED</b></div>
                <div className="result-subhead">{verified ? "VERIFICATION SUMMARY" : "EVIDENCE GAPS"}</div>
                <ul className="result-checks">
                  {verified ? <>
                    <li className="good"><Check size={14} />Concrete quantity verified: 18 m³</li><li className="good"><Check size={14} />Steel quantity verified: 1,250 kg</li><li className="good"><Check size={14} />Inspection certificate received</li>
                  </> : <>
                    <li className="good"><Check size={14} />Steel invoice matches approved BOQ</li><li className="good"><Check size={14} />Site photos consistent with slab casting</li><li className="warn"><AlertTriangle size={14} />Concrete receipt supports only 12.5 / 18 m³</li><li className="warn"><AlertTriangle size={14} />Reinforcement inspection missing</li><li className="warn"><AlertTriangle size={14} />Final engineer sign-off missing</li>
                  </>}
                </ul>
                <div className="recommendation"><span>JUDGE RECOMMENDATION</span><p>{verified ? "All required evidence is present. Payment eligibility is supported, pending authorized engineer approval." : "Release only the evidence-supported portion and hold the balance until required proof is submitted."}</p></div>
                <button className="how-assessed" onClick={() => setShowScore(true)}>How was this assessed? <ChevronRight size={14} /></button>
              </section>

              <section className="panel gaps-panel">
                <PanelHeading kicker={verified ? "ALL ITEMS RESOLVED" : "ACTION REQUIRED"} title={verified ? "Proof complete" : "Proof gaps"} right={verified ? <CheckCircle2 className="resolved-icon" size={17} /> : <span className="gap-count">03</span>} />
                <div className="gap-list">
                  <GapItem done={receiptAdded} label="Additional concrete delivery receipt · 5.5 m³" />
                  <GapItem done={inspectionAdded} label="Reinforcement inspection certificate" />
                  <GapItem done={verified} label="Final engineer approval" muted={verified} />
                </div>
                {requestSent && <div className="request-confirm"><CheckCircle2 size={15} /><span>Evidence request sent to contractor</span></div>}
                <button className="button full-button secondary" onClick={requestEvidence}><MessageSquareText size={15} />{requestSent ? "Send another request" : "Request missing evidence"}</button>
                {!verified && <button className="button full-button proof-button" onClick={addDemoProof}><CloudUpload size={15} />Upload Missing Proof <span>DEMO</span></button>}
              </section>

              <section className="panel contractor-panel">
                <div className="contractor-head"><span className="contractor-icon"><MessageSquareText size={16} /></span><div><b>Contractor response</b><small>{receiptAdded ? "Just now · 2 files attached" : "Waiting for response"}</small></div><span className="response-dot" /></div>
                <div className="message-bubble">{receiptAdded ? "The additional 5.5 m³ concrete delivery receipt and reinforcement inspection have been submitted for review." : "Two concrete batches were delivered by another supplier. Uploading the additional 5.5 m³ delivery receipt and inspection proof."}</div>
                {receiptAdded && <div className="attached-proof"><FileCheck2 size={15} />Concrete_Delivery_02.pdf + inspection proof<span>UPLOADED</span></div>}
              </section>

              <section className="human-panel">
                <div className="human-title"><span><LockKeyhole size={16} /></span><div><b>Final human decision</b><small>AI cannot authorize payment</small></div></div>
                <div className="decision-buttons">
                  <button className="approve" onClick={() => setModal("Approve Payment")}><Check size={15} />Approve payment</button>
                  <button onClick={() => setModal("Partially Approve")}>Partially approve</button>
                  <button onClick={() => setModal("Hold Payment")}>Hold payment</button>
                  <button onClick={() => setModal("Request Clarification")}>Request clarification</button>
                </div>
                {decisions.length > 0 && <div className="decision-record"><CheckCircle2 size={14} />Last decision: <b>{decisions[decisions.length - 1][1]}</b></div>}
              </section>
            </div>
          </div>

          <section className="panel audit-panel" id="audit">
            <PanelHeading kicker="VERIFIABLE BY DESIGN" title="Audit trail" right={<span className="audit-immutable"><LockKeyhole size={12} /> APPEND-ONLY LOG</span>} />
            <div className="audit-list">{audit.slice(-7).reverse().map((entry, index) => <div className="audit-entry" key={`${entry[0]}-${entry[1]}-${index}`}><span className="audit-dot" /><time>{entry[0]}</time><b>{entry[1]}</b><span>{entry[2]}</span></div>)}</div>
          </section>
          <footer className="page-footer"><span>BuildWise ProofGate <i /> Pay for proof, not promises.</span><span><ShieldCheck size={13} /> Recommendation, not final authorization.</span></footer>
          </> : <WorkspaceScreen
            view={activeView}
            materials={materials}
            evidence={evidence}
            audit={audit}
            verified={verified}
            receiptAdded={receiptAdded}
            inspectionAdded={inspectionAdded}
            score={score}
            release={release}
            held={held}
            decisions={decisions}
            onOpenEvidence={openEvidenceByName}
            onOpenPhoto={setSelectedPhoto}
            onDecision={setModal}
            onRunVerification={runVerification}
            onRequestEvidence={requestEvidence}
            requestSent={requestSent}
            selectedMaterial={selectedMaterial}
            onViewMaterial={openMaterialPage}
            globalQuery={globalQuery}
            onInvestigate={() => { window.location.hash = "investigation"; void runVerification(); }}
            onUpload={chooseEvidenceFiles}
            uploading={uploading}
          />}
        </div>
      </main>

      {selectedMaterial && activeView === "dashboard" && <Modal title={selectedMaterial.name} className="material-modal" onClose={() => setSelectedMaterial(null)}><MaterialDetail material={selectedMaterial} verified={verified} receiptAdded={receiptAdded} onPhoto={setSelectedPhoto} onEvidence={openEvidenceByName} /></Modal>}
      {selectedEvidence && <Modal title="Evidence source" className="source-modal" onClose={() => setSelectedEvidence(null)}><EvidenceDetail evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} /></Modal>}
      {selectedPhoto && <PhotoViewer file={selectedPhoto} onClose={() => setSelectedPhoto(null)} onEvidence={openEvidenceByName} />}
      {showScore && <Modal title="How was this assessed?" onClose={() => setShowScore(false)}><p className="modal-intro">A transparent evidence assessment combines five checks. The score is a prototype recommendation—not a substitute for contractual review.</p><div className="score-breakdown">{[["Plan match", 30, 100], ["Quantity match", 25, verified ? 100 : 69], ["Document completeness", 20, verified ? 100 : 50], ["Visual evidence", 15, 80], ["Engineer evidence", 10, verified ? 100 : 0]].map(([label, weight, value]) => <div className="score-line" key={label}><span>{label}<small>{weight}% weight</small></span><div className="breakdown-track"><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div><div className="score-total"><span>VERIFICATION SCORE</span><b>{score}%</b></div><p className="modal-caveat">Prototype model: recommended release is based on the evidence score. Real decisions must use verified contractual line items and authorized human approval.</p></Modal>}
      {modal && <Modal title={modal === "report" ? "ProofGate review report" : `${modal}?`} onClose={() => setModal("")}>
        {modal === "report" ? <div className="report-content"><div className={`report-status ${verified ? "positive" : ""}`}><ShieldCheck size={19} />{verified ? "VERIFIED" : "PARTIALLY VERIFIED"}</div><p>RCC Slab Completion · Green Heights Residence</p><dl><div><dt>Requested</dt><dd>₹3,20,000</dd></div><div><dt>Recommended release</dt><dd>{formatRupees(release)}</dd></div><div><dt>Amount held</dt><dd>{formatRupees(held)}</dd></div><div><dt>Evidence confidence</dt><dd>{score}%</dd></div></dl><p className="modal-caveat">Recommendation, not final authorization. Engineer approval required.</p><button className="button primary full-button" onClick={() => setModal("")}>Close report</button></div> :
          <><p className="modal-intro">{modal === "Approve Payment" ? "Record an authorized human decision to approve this milestone payment. The AI has not authorized or released funds." : `Record “${modal}” as the authorized human decision for this milestone. This action will be added to the audit trail.`}</p><div className="confirm-summary"><span>PROJECT</span><b>Green Heights Residence</b><span>MILESTONE</span><b>RCC Slab Completion</b><span>AI RECOMMENDATION</span><b>{formatRupees(release)} eligible · {score}% confidence</b></div><div className="modal-actions"><button className="button secondary" onClick={() => setModal("")}>Cancel</button><button className="button primary" onClick={() => decide(modal)}><Check size={15} />Confirm human decision</button></div></>}
      </Modal>}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss notification"><X size={15} /></button></div>}
    </div>
  );
}

function WorkspaceScreen({
  view, materials, evidence, audit, verified, receiptAdded, inspectionAdded, score, release, held,
  decisions, onOpenEvidence, onOpenPhoto, onDecision, onRunVerification,
  onRequestEvidence, requestSent, selectedMaterial, onViewMaterial, globalQuery, onInvestigate,
  onUpload, uploading
}) {
  const titles = {
    claims: "Payment Claims",
    evidence: "Evidence Trace & Investigation",
    materials: "Material Intelligence",
    documents: "Document Evidence",
    photos: "Site Visual Evidence",
    investigation: "Evidence Trace & AI Investigation",
    decisions: "Payment Decision",
    audit: "Audit Trail",
    reports: "Verification Report",
    timeline: "Project Timeline",
    "material-detail": "Material Evidence Details"
  };
  const title = titles[view] || "BuildWise ProofGate";
  const currentMaterial = materials.find((item) => item.id === selectedMaterial?.id) || selectedMaterial || materials.find((item) => item.id === "concrete") || materialSeed[0];
  const subtitle = view === "material-detail"
    ? `Green Heights Residence  ›  Materials  ›  ${currentMaterial.name}  ›  Evidence Details`
    : "Green Heights Residence  ›  RCC Slab Completion";

  return <div className="workspace-view">
    <div className="workspace-breadcrumb"><span>{subtitle}</span><span>GREEN HEIGHTS RESIDENCE</span></div>
    <div className="workspace-heading">
      <div><span className="panel-kicker">PROOFGATE WORKSPACE · PG-2026-014</span><h1>{title}</h1><p>Evidence-linked decision support · Human approval always required</p></div>
      <span className={`status-pill ${verified ? "verified" : ""}`}><i />{verified ? "VERIFIED" : "PARTIALLY VERIFIED"}</span>
    </div>

    {view === "materials" && <section className="workspace-materials">
      <div className="workspace-section-heading"><div><b>Material evidence coverage</b><small>Specifications and quantities are matched to approved project records.</small></div><span>{materials.length} MATERIALS</span></div>
      <div className="workspace-material-grid">{materials.map((material) =>
        <MaterialCard key={material.id} material={material} verified={verified}
          onOpen={() => onViewMaterial(material)} onPhoto={() => onOpenPhoto(material.images?.[0] || "site-progress.jpg")} />
      )}</div>
      <p className="visual-caveat"><Eye size={14} /> Images provide supporting context only and do not establish material grade, exact quantity, strength, or structural safety.</p>
    </section>}

    {view === "material-detail" && <><button className="workspace-back" onClick={() => { window.location.hash = "materials"; }}><ChevronRight size={14} /> All materials</button><MaterialWorkspace material={currentMaterial} verified={verified} receiptAdded={receiptAdded} evidence={evidence} onOpenEvidence={onOpenEvidence} onOpenPhoto={onOpenPhoto} onRunVerification={onRunVerification} /></>}

    {(view === "evidence" || view === "documents" || view === "photos") && <EvidenceWorkspace
      mode={view} evidence={evidence} onOpenEvidence={onOpenEvidence} onOpenPhoto={onOpenPhoto} initialQuery={globalQuery}
      onUpload={onUpload} uploading={uploading} />}

    {view === "investigation" && <EvidenceGraphWorkspace evidence={evidence} verified={verified} score={score} release={release} held={held} onOpenEvidence={onOpenEvidence} />}

    {view === "decisions" && <DecisionWorkspace
      verified={verified} receiptAdded={receiptAdded} inspectionAdded={inspectionAdded} score={score}
      release={release} held={held} decisions={decisions} onDecision={onDecision}
      onRequestEvidence={onRequestEvidence} requestSent={requestSent} onRunVerification={onRunVerification} />}

    {view === "claims" && <ClaimWorkspace verified={verified} score={score} release={release} held={held} onInvestigate={onInvestigate} />}

    {view === "timeline" && <TimelineWorkspace verified={verified} />}

    {view === "reports" && <ReportWorkspace verified={verified} score={score} release={release} held={held} evidence={evidence} onOpenEvidence={onOpenEvidence} />}

    {view === "audit" && <AuditWorkspace audit={audit} />}
  </div>;
}

function MaterialWorkspace({ material, verified, receiptAdded, evidence, onOpenEvidence, onOpenPhoto, onRunVerification }) {
  const [tab, setTab] = useState("Overview");
  const tabs = ["Overview", "Quantity", "Documents", "Site Images", "Inspection", "AI Analysis", "Risk & Gaps", "Traceability"];
  const image = material.images?.[0] || "site-progress.jpg";
  const supported = material.id === "concrete"
    ? (verified || receiptAdded ? 18 : 12.5)
    : material.supported_quantity ?? material.supported_initial;
  const expected = material.expected_quantity;
  const coverage = expected ? Math.min(100, Math.round((supported / expected) * 100)) : material.confidence;
  const evidenceQuery = material.id === "concrete" ? /concrete|boq|delivery|mix design/i
    : material.id === "steel" ? /steel|reinforcement|inspection/i
      : material.id === "cement" ? /cement|CM-417/i : /aggregate|AG-039/i;
  const related = evidence.filter((item) => evidenceQuery.test(`${item.name} ${item.type}`));
  const materialStatus = material.id === "concrete" && coverage < 100
    ? "PARTIALLY VERIFIED"
    : material.status?.includes("pending") ? "INSPECTION REVIEW"
      : material.status === "supported" ? "SUPPORTED" : "SUPPORTING EVIDENCE";
  const specificationRows = material.id === "concrete"
    ? [["Concrete Grade", "M25", "M25", "MATCH"], ["Mix Design", "As per structural", "As per BOQ", "MATCH"], ["Supplier", material.supplier, material.supplier, "MATCH"], ["Required Quantity", `${expected.toFixed(1)} m³`, `${Number(supported).toFixed(1)} m³`, coverage === 100 ? "MATCH" : "PARTIAL"], ["Used For", "RCC Slab", "RCC Slab", "MATCH"]]
    : material.id === "steel"
      ? [["Steel Grade", "Fe 500D", "Per approved BOQ", "MATCH"], ["Material", "TMT reinforcement", "Steel invoice", "MATCH"], ["Supplier", material.supplier, material.supplier, "MATCH"], ["Required Quantity", `${expected.toLocaleString("en-IN")} kg`, `${Number(supported).toLocaleString("en-IN")} kg`, "MATCH"], ["Inspection", "Engineer certificate", verified ? "Certificate received" : "Pending", verified ? "MATCH" : "PARTIAL"]]
      : [["Category", material.category, material.category, "MATCH"], ["Specification", material.specification, "Procurement records", "PARTIAL"], ["Supplier", material.supplier, material.supplier, "MATCH"], ["Procurement", "Invoice / supplier ticket", material.invoice, "MATCH"]];
  const deliveries = material.id === "concrete"
    ? [["Concrete Delivery Receipt #104", "7.0 m³", "04 Oct 2026", true], ["Concrete Delivery Receipt #118", "5.5 m³", "04 Oct 2026", true], ["Concrete_Delivery_02.pdf", "5.5 m³", receiptAdded || verified ? "04 Oct 2026" : "—", receiptAdded || verified]]
    : material.id === "steel"
      ? [[material.invoice, `${Number(supported).toLocaleString("en-IN")} kg`, "04 Oct 2026", true], ["Reinforcement inspection certificate", "Inspection", verified ? "04 Oct 2026" : "—", verified]]
      : [[material.invoice, "Procurement record", "04 Oct 2026", true]];
  return <div className="material-workspace">
    <section className="material-workspace-hero panel">
      <button className="material-workspace-image" onClick={() => onOpenPhoto(image)} aria-label={`Open ${material.name} site image`}><img src={`/images/${image}`} alt={`${material.name} visual context at the project site`} /><span><Eye size={13} /> SITE EVIDENCE · SUPPORTING VISUAL CONTEXT</span></button>
      <div className="material-workspace-summary"><div className="workspace-title-row"><div><span className="panel-kicker">{material.category} · RCC SLAB COMPLETION</span><h2>{material.name} {material.id === "concrete" ? "(M25)" : ""}</h2></div><span className={`status-pill ${verified && (material.id === "concrete" || material.id === "steel") ? "verified" : ""}`}>{material.id === "steel" && !verified ? "INSPECTION PENDING" : verified && material.expected_quantity ? "SUPPORTED" : materialStatus}</span></div>
        <div className="material-fact-grid"><div><small>MATERIAL CATEGORY</small><b>{material.category}</b></div><div><small>SPECIFICATION</small><b>{material.specification}</b></div><div><small>MILESTONE</small><b>RCC Slab Completion</b></div><div><small>SUPPLIER</small><b>{material.supplier}</b></div></div>
        <div className="workspace-confidence"><span>Evidence confidence</span><b>{material.id === "concrete" && verified ? 94 : material.confidence}%</b><i><em style={{ width: `${material.id === "concrete" && verified ? 94 : material.confidence}%` }} /></i></div>
      </div>
    </section>
    <nav className="detail-tabs" aria-label="Material detail sections">{tabs.map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {tab === "Overview" || tab === "Quantity" ? <div className="material-detail-grid">
      <section className="panel detail-table-panel"><PanelHeading kicker="APPROVED REQUIREMENTS" title="Specification details" /><div className="specification-table"><div className="table-head"><b>PARAMETER</b><b>EXPECTED</b><b>EVIDENCE</b><b>STATUS</b></div>
        {specificationRows.map(([key, expectedValue, found, status]) => <div className="table-row" key={key}><span>{key}</span><b>{expectedValue}</b><span>{found}</span><strong className={status === "PARTIAL" ? "table-partial" : ""}>{status === "MATCH" ? "✓" : "▲"} {status}</strong></div>)}
      </div><button className="spec-source" onClick={() => onOpenEvidence(material.id === "steel" ? "Steel Invoice" : material.id === "concrete" ? "BOQ" : material.invoice)}><FileText size={14} /><span>Specification source</span><b>{material.specification_source}</b><ChevronRight size={14} /></button></section>
      {expected ? <section className="panel reconciliation-panel"><PanelHeading kicker="DOCUMENT-BASED RECONCILIATION" title={material.id === "concrete" ? "Quantity reconciliation" : "Quantity and inspection"} /><div className="recon-numbers"><div><small>EXPECTED QUANTITY</small><b>{Number(expected).toLocaleString("en-IN")} {material.unit}</b></div><div><small>SUPPORTED QUANTITY</small><b className="positive-text">{Number(supported).toLocaleString("en-IN")} {material.unit}</b></div><div><small>UNVERIFIED</small><b className={coverage === 100 ? "positive-text" : "warning-text"}>{Number(Math.max(0, expected - supported)).toLocaleString("en-IN")} {material.unit}</b></div></div>
        <div className="workspace-quantity-track"><i style={{ width: `${coverage}%` }} /></div><div className="recon-coverage"><span>Coverage</span><b>{coverage}%</b></div>
        <div className="delivery-records"><b>{material.id === "steel" ? "INVOICE & INSPECTION RECORDS" : "DELIVERY RECORDS"}</b>{deliveries.map(([name, quantity, date, isVerified]) => <button key={name} onClick={() => onOpenEvidence(name)}><span className={isVerified ? "good" : "missing"}><FileText size={13} /></span><b>{name}<small>{date}</small></b><span>{quantity}</span><strong className={isVerified ? "good-text" : "warning-text"}>{isVerified ? "✓ Verified" : "Missing"}</strong></button>)}</div>
      </section>
      : <section className="panel reconciliation-panel"><PanelHeading kicker="PROCUREMENT EVIDENCE" title="Supporting records" /><p className="material-subtitle">{material.risk_reason}</p><button className="spec-source" onClick={() => onOpenEvidence(material.invoice)}><FileText size={14} /><span>Supplier record</span><b>{material.invoice}</b><ChevronRight size={14} /></button></section>}
    </div> : <MaterialTabContent tab={tab} material={material} related={related} receiptAdded={receiptAdded} verified={verified} onOpenEvidence={onOpenEvidence} onOpenPhoto={onOpenPhoto} />}
    <div className="material-workspace-footer"><span><ShieldCheck size={14} /> Recommendation only · authorized engineer review remains required.</span><button className="button primary" onClick={onRunVerification}><RefreshCw size={14} /> Re-run Verification</button></div>
  </div>;
}

function MaterialTabContent({ tab, material, related, receiptAdded, verified, onOpenEvidence, onOpenPhoto }) {
  const photos = material.images?.length ? material.images : ["site-progress.jpg"];
  if (tab === "Site Images") return <section className="panel workspace-tab-panel"><PanelHeading kicker="VISUAL CONTEXT · NOT QUANTITY PROOF" title="Site visual evidence" /><div className="site-image-grid">{photos.map((file, index) => <button key={file} onClick={() => onOpenPhoto(file)}><img src={`/images/${file}`} alt={`${material.name} construction evidence ${index + 1}`} /><span>Photo #{String(index + 1).padStart(2, "0")} · {material.name} · Supporting visual context</span></button>)}</div><p className="visual-caveat"><Eye size={14} /> Images cannot establish grade, exact quantity, strength, or structural safety.</p></section>;
  if (tab === "Documents" || tab === "Traceability") return <section className="panel workspace-tab-panel"><PanelHeading kicker="LINKED RECORDS" title={tab === "Traceability" ? "Evidence provenance" : "Related documents"} /><div className="source-record-list">{related.length ? related.map((item) => <button key={item.name} onClick={() => onOpenEvidence(item.name)}><FileText size={17} /><span><b>{item.name}</b><small>{item.type} · {item.source} · {item.timestamp}</small></span><span className="status-pill">{item.status}</span><ChevronRight size={14} /></button>) : <div className="claim-empty"><FileText size={17} /><b>No linked source records in the demo fixture</b><span>Add the supplier document to expand this material’s trace.</span></div>}</div></section>;
  const isInspection = tab === "Inspection";
  const isRisk = tab === "Risk & Gaps";
  const content = isInspection
    ? material.id === "steel"
      ? [verified ? "Reinforcement inspection certificate received." : "Mandatory engineer inspection is still outstanding.", "Steel invoice quantity and grade documentation do not replace the independent site inspection."]
      : [verified ? "Milestone inspection evidence is included in the verified demo scenario." : "Engineer inspection evidence is tracked as a separate milestone proof gate.", "Inspection completion must be supported by a qualified engineer record."]
    : isRisk
      ? material.id === "concrete"
        ? [receiptAdded || verified ? "Concrete quantity gap resolved by the additional delivery record." : "5.5 m³ concrete remains unsupported by delivery evidence.", verified ? "Inspection record submitted; human review remains mandatory." : "Reinforcement inspection and authorized engineer sign-off remain open."]
        : [material.risk_reason, material.id === "steel" && !verified ? "Reinforcement inspection remains an independent mandatory gate." : "Visual evidence is context only and does not certify specification or quality."]
      : [material.id === "concrete" ? "Concrete grade and delivered quantity are checked against approved documents and delivery evidence." : `${material.name} is cross-checked against its procurement records and specification source.`, material.risk_reason];
  return <section className="panel workspace-tab-panel"><PanelHeading kicker={tab.toUpperCase()} title={isInspection ? "Inspection status" : isRisk ? "Risk and evidence gaps" : "AI investigation notes"} />{content.map((line) => <div className="finding-row" key={line}><AlertTriangle size={15} /><span>{line}</span></div>)}</section>;
}

function EvidenceWorkspace({ mode, evidence, onOpenEvidence, onOpenPhoto, initialQuery, onUpload, uploading }) {
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  const [category, setCategory] = useState("All");
  const categories = ["All", "Documents", "Delivery", "Invoices", "Inspection", "Photos"];
  const rows = evidence.filter((item) => {
    const matchesSearch = `${item.name} ${item.type} ${item.source}`.toLowerCase().includes(query.toLowerCase());
    const matchesMode = mode === "documents" ? !/photo|site image/i.test(`${item.type} ${item.name}`)
      : mode === "photos" ? /photo|site image/i.test(`${item.type} ${item.name}`) || item.type === "Uploaded evidence"
        : true;
    const categoryPattern = {
      Documents: /boq|drawing|plan|document|schedule/i,
      Delivery: /delivery|receipt|ticket/i,
      Invoices: /invoice/i,
      Inspection: /inspection|certificate/i,
      Photos: /photo|image/i
    }[category];
    const matchesCategory = category === "All" || Boolean(categoryPattern?.test(`${item.type} ${item.name}`));
    return matchesSearch && matchesMode && matchesCategory;
  });
  const demoPhotos = [
    { file: "concrete-slab.jpg", label: "Slab casting RCC concrete" },
    { file: "reinforcement.jpg", label: "Reinforcement steel placement" },
    { file: "site-progress.jpg", label: "Construction site progress" }
  ].filter((photo) => (category === "All" || category === "Photos")
    && `${photo.file} ${photo.label} site photo`.toLowerCase().includes(query.toLowerCase()));
  const photoRecords = rows.filter((item) => /photo|site image/i.test(`${item.type} ${item.name}`));
  const recordCount = mode === "photos" ? demoPhotos.length + photoRecords.length : rows.length;
  const uploadOptions = mode === "photos"
    ? [["site_photo", "Upload site photo"]]
    : mode === "documents"
      ? [["supporting", "Upload document"], ["concrete_delivery", "Upload delivery receipt"], ["reinforcement_inspection", "Upload inspection certificate"]]
      : [["auto", "Upload any evidence"], ["concrete_delivery", "Delivery receipt"], ["reinforcement_inspection", "Inspection certificate"], ["site_photo", "Site photo"]];
  return <section className="panel evidence-workspace"><div className="evidence-toolbar"><div><span className="panel-kicker">EVIDENCE VAULT · SOURCE TRACEABILITY</span><h2>{mode === "photos" ? "Site photos" : mode === "documents" ? "Project documents" : "Evidence records"}</h2></div><div className="evidence-toolbar-actions"><label className="evidence-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search evidence, materials, documents..." /></label><button className="button secondary evidence-export" aria-label="Export filtered evidence register as CSV" onClick={() => downloadEvidenceCsv(mode === "photos" ? [...photoRecords, ...demoPhotos.map(({ file, label }) => ({ name: file, type: "Site photo", source: label, timestamp: "04 Oct · 10:25", confidence: 80, status: "supporting" }))] : rows)}><Download size={14} />Export CSV</button></div></div>
    <div className="upload-options" aria-label="Upload evidence files">{uploadOptions.map(([kind, label]) => <button key={kind} className="upload-option" onClick={() => onUpload(kind)} disabled={uploading}><CloudUpload size={13} />{uploading ? "Uploading…" : label}</button>)}</div>
    <div className="evidence-filter-row">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}<span>{recordCount} RECORDS</span></div>
    {mode === "photos" ? <>
      {demoPhotos.length > 0 && <div className="site-image-grid evidence-photo-grid">{demoPhotos.map(({ file, label }, index) => <button key={file} onClick={() => onOpenPhoto(file)}><img src={`/images/${file}`} alt={`Site evidence photo ${index + 1}`} /><span>PHOTO-{String(index + 1).padStart(3, "0")} · {label} · Supporting visual evidence</span></button>)}</div>}
      {photoRecords.length > 0 && <div className="evidence-record-list uploaded-photo-records">{photoRecords.map((item, index) => <button key={`${item.name}-${index}`} className="evidence-record" onClick={() => onOpenEvidence(item.name)}><span className="evidence-record-icon"><ImageIcon size={16} /></span><span className="evidence-record-title"><b>{item.name}</b><small>{item.type} · {item.source}</small></span><span className="evidence-record-date">{item.timestamp}</span><span className={`evidence-record-status ${item.status}`}>{item.status}</span><ChevronRight size={15} /></button>)}</div>}
      {!demoPhotos.length && !photoRecords.length && <div className="evidence-empty"><ImageIcon size={18} /><b>No site photos match this filter</b><span>Change the search or choose Photos to see site images.</span></div>}
    </> : rows.length > 0
      ? <div className="evidence-record-list">{rows.map((item, index) => <button key={`${item.name}-${index}`} className="evidence-record" onClick={() => /photo/i.test(item.type) ? onOpenPhoto("site-progress.jpg") : onOpenEvidence(item.name)}><span className="evidence-record-icon"><FileText size={16} /></span><span className="evidence-record-title"><b>{item.name}</b><small>{item.type} · {item.source}</small></span><span className="evidence-record-date">{item.timestamp}</span><span className={`evidence-record-status ${item.status}`}>{item.status}</span><ChevronRight size={15} /></button>)}</div>
      : <div className="evidence-empty"><FileText size={18} /><b>No records match this filter</b><span>Try a different search or evidence category.</span></div>}
  </section>;
}

function EvidenceGraphWorkspace({ evidence, verified, score, release, held, onOpenEvidence }) {
  const records = [
    ["BOQ", "18 m³ concrete required", "supporting", "BOQ"],
    ["Delivery receipts", verified ? "18 / 18 m³ recorded" : "12.5 / 18 m³ recorded", verified ? "supporting" : "partial", "Concrete Delivery Receipt"],
    ["Steel invoice", "1,250 kg · supplier match", "supporting", "Steel Invoice"],
    ["Site photos", "Visual context only", "supporting", "Slab Progress Photos"],
    ["Inspection", verified ? "Certificate received" : "Engineer record missing", verified ? "supporting" : "missing", "Engineer Inspection"]
  ];
  return <div className="graph-workspace">
    <div className="graph-toolbar"><div><span className="panel-kicker">CLAIM → EVIDENCE → CHALLENGE → JUDGE</span><h2>Evidence trace & AI investigation</h2></div><div className="graph-mode"><button className="active">Graph View</button><button onClick={() => document.getElementById("evidence-records")?.scrollIntoView({ behavior: "smooth" })}>List View</button></div></div>
    <section className="panel trace-graph">
      <div className="trace-claim-node"><MessageSquareText size={18} /><span><b>Contractor Claim</b><small>RCC Slab Completion · ₹3,20,000</small></span></div>
      <div className="trace-branches">{records.map(([name, detail, status, source]) => <button key={name} className={`trace-evidence-node ${status}`} onClick={() => onOpenEvidence(source)}><span className={`trace-node-status ${status}`}>{status === "missing" ? "!" : status === "partial" ? "◒" : "✓"}</span><b>{name}</b><small>{detail}</small><span className="trace-node-link">OPEN SOURCE ↗</span></button>)}</div>
      <div className="trace-agent-row"><div className="trace-agent skeptic"><AlertTriangle size={16} /><span><b>Skeptic Agent</b><small>{verified ? "Evidence gaps resolved" : "3 issues identified"}</small></span></div><ChevronRight size={20} /><div className="trace-agent judge"><ShieldCheck size={16} /><span><b>Evidence Judge</b><small>{score}% confidence · recommendation</small></span></div><ChevronRight size={20} /><div className="trace-agent payment"><ArrowDownRight size={16} /><span><b>Payment Recommendation</b><small>{money(release)} release · {money(held)} hold</small></span></div></div>
      <div className="trace-legend"><span><i className="supporting" />Supporting</span><span><i className="partial" />Partial</span><span><i className="missing" />Missing</span><span>Connections represent evidence relationships, not automatic proof of construction quality.</span></div>
    </section>
    <section id="evidence-records" className="panel trace-source-panel"><PanelHeading kicker="EVIDENCE PROVENANCE" title="Evidence used in this recommendation" /><div>{evidence.slice(0, 6).map((item, index) => <button key={`${item.name}-${index}`} onClick={() => onOpenEvidence(item.name)}><FileText size={15} /><span><b>{item.name}</b><small>{item.type} · {item.source}</small></span><span>{item.confidence}% confidence</span><ChevronRight size={14} /></button>)}</div></section>
  </div>;
}

function DecisionWorkspace({ verified, receiptAdded, inspectionAdded, score, release, held, decisions, onDecision, onRequestEvidence, requestSent, onRunVerification }) {
  return <div className="decision-workspace">
    <div className="decision-comparison">
      <section className="panel decision-state"><div className="decision-state-head"><span>INITIAL VERIFICATION · BEFORE</span><b className="status-pill">PARTIALLY VERIFIED</b></div><div className="decision-state-metrics"><div><small>EVIDENCE CONFIDENCE</small><b>68%</b></div><div><small>RECOMMENDED RELEASE</small><b>{money(210000)}</b></div><div><small>HOLD AMOUNT</small><b className="warning-text">{money(110000)}</b></div></div><h3>Key findings</h3><Finding good text="Concrete quantity incomplete" /><Finding warn text="Reinforcement inspection missing" /><Finding warn text="Engineer approval pending" /></section>
      <span className="decision-arrow"><ChevronRight size={23} /></span>
      <section className="panel decision-state projected"><div className="decision-state-head"><span>AFTER ADDITIONAL EVIDENCE · RE-VERIFICATION</span><b className={`status-pill ${verified ? "verified" : ""}`}>{verified ? "VERIFIED" : "PROJECTED"}</b></div><div className="decision-state-metrics"><div><small>EVIDENCE CONFIDENCE</small><b>{verified ? score : 94}%</b></div><div><small>RECOMMENDED RELEASE</small><b className="positive-text">{money(verified ? release : 320000)}</b></div><div><small>HOLD AMOUNT</small><b>{money(verified ? held : 0)}</b></div></div><h3>Resolved findings</h3><Finding good text={receiptAdded || verified ? "Concrete quantity reconciled" : "Requires additional delivery ticket"} /><Finding good text={inspectionAdded || verified ? "Inspection evidence received" : "Inspection evidence still required"} /><small className="simulation-note">Projection only; complete records and engineer approval remain necessary.</small></section>
    </div>
    <section className="panel decision-actions-panel"><PanelHeading kicker="REQUIRED ACTIONS" title="Human approval" right={<span className="muted-tag"><LockKeyhole size={13} /> AUTHORIZED PERSONNEL</span>} /><div className="decision-action-layout"><div className="required-checks"><Finding good text="BOQ and supplier records matched" /><Finding good={receiptAdded || verified} warn={!receiptAdded && !verified} text={receiptAdded || verified ? "Additional delivery evidence received" : "Upload remaining concrete delivery ticket"} /><Finding good={inspectionAdded || verified} warn={!inspectionAdded && !verified} text={inspectionAdded || verified ? "Inspection evidence received" : "Upload reinforcement inspection"} /><Finding good={verified} warn={!verified} text={verified ? "Verification rerun completed" : "Re-run verification after evidence upload"} /></div><div className="decision-button-column"><button className="button secondary" onClick={onRequestEvidence}><MessageSquareText size={14} />{requestSent ? "Evidence requested" : "Request missing evidence"}</button><button className="button primary" onClick={onRunVerification}><RefreshCw size={14} />Re-run verification</button><div className="human-approval-buttons"><button className="approve" onClick={() => onDecision("Approve Payment")}>Approve</button><button onClick={() => onDecision("Partially Approve")}>Partial</button><button onClick={() => onDecision("Hold Payment")}>Hold</button><button onClick={() => onDecision("Request Clarification")}>Request Clarification</button></div></div></div>{decisions.length > 0 && <div className="decision-record"><CheckCircle2 size={14} />Last decision: <b>{decisions[decisions.length - 1][2]}</b></div>}<p className="modal-caveat">AI provides decision support only. Final approval remains with authorized project personnel.</p></section>
  </div>;
}

function ClaimWorkspace({ verified, score, release, held, onInvestigate }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const filters = ["All", "Pending", "Under Investigation", "Partially Verified", "Verified", "Engineer Review", "Completed"];
  const status = verified ? "Verified" : "Partially Verified";
  const matchesStatus = filter === "All" || filter === status || (filter === "Engineer Review" && !verified);
  const matchesQuery = "PG-2026-014 RCC Slab Completion Apex Buildworks Green Heights Residence"
    .toLowerCase().includes(query.trim().toLowerCase());
  const showClaim = matchesStatus && matchesQuery;
  return <section className="claim-center">
    <div className="claim-center-summary">{[[1, "TOTAL CLAIMS"], [verified ? 1 : 0, "VERIFIED"], [verified ? 0 : 1, "NEEDS REVIEW"], ["₹3.20L", "TOTAL REQUESTED"]].map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
    <section className="panel claim-workspace">
      <div className="claim-toolbar"><div><span className="panel-kicker">CLAIM REGISTER · DEMO PROJECT</span><h2>Payment claims</h2></div><label className="evidence-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search claim, contractor or milestone..." /></label></div>
      <div className="evidence-filter-row">{filters.map((name) => <button key={name} className={filter === name ? "active" : ""} onClick={() => setFilter(name)}>{name}</button>)}</div>
      {showClaim ? <article className="claim-list-card"><div><span className="panel-kicker">CLAIM PG-2026-014 · {verified ? "ENGINEER REVIEW" : "SKEPTIC REVIEW OPEN"}</span><h2>RCC Slab Completion</h2><p>Apex Buildworks · Green Heights Residence · 04 Oct 2026</p></div><span className={`status-pill ${verified ? "verified" : ""}`}>{status.toUpperCase()}</span><div className="claim-list-metrics"><span><small>CLAIMED</small><b>₹3,20,000</b></span><span><small>RECOMMENDED</small><b>{formatRupees(release)}</b></span><span><small>ON HOLD</small><b>{formatRupees(held)}</b></span><span><small>EVIDENCE</small><b>{score}%</b></span></div><button className="button primary" onClick={onInvestigate}><Sparkles size={14} />Investigate claim</button></article>
        : <div className="claim-empty"><Search size={19} /><b>No claims match this filter</b><span>Try All or the current status, “{status}”. This controlled demo contains one active claim.</span><button className="button secondary" onClick={() => { setFilter("All"); setQuery(""); }}>Clear filters</button></div>}
    </section>
  </section>;
}

function TimelineWorkspace({ verified }) {
  const milestones = [["Foundation", "VERIFIED", 100], ["Columns", "VERIFIED", 100], ["Beam", "VERIFIED", 100], ["RCC Slab", verified ? "VERIFIED" : "PARTIALLY VERIFIED", verified ? 100 : 69], ["Brickwork", "UPCOMING", 0], ["Plaster", "UPCOMING", 0], ["Finishing", "UPCOMING", 0]];
  return <section className="panel timeline-workspace"><PanelHeading kicker="PROJECT DELIVERY" title="Milestone timeline" right={<span>46% PROJECT COMPLETE</span>} />{milestones.map(([name, status, progress], index) => <div className="timeline-row" key={name}><span className={`timeline-marker ${progress === 100 ? "done" : progress ? "current" : ""}`}>{progress === 100 ? <Check size={12} /> : index + 1}</span><span><b>{name}</b><small>{name === "RCC Slab" ? "Claim PG-2026-014 · ₹3,20,000 requested" : "Green Heights Residence milestone"}</small></span><div className="timeline-progress"><i style={{ width: `${progress}%` }} /></div><b>{progress}%</b><span className={`evidence-record-status ${status === "UPCOMING" ? "" : status === "VERIFIED" ? "supporting" : "partial"}`}>{status}</span></div>)}</section>;
}

function ReportWorkspace({ verified, score, release, held, evidence, onOpenEvidence }) {
  const downloadReport = () => {
    const lines = [
      "BUILDWISE PROOFGATE · VERIFICATION REPORT",
      "Green Heights Residence · Pune",
      "Claim PG-2026-014 · RCC Slab Completion",
      "Contractor: Apex Buildworks",
      `Status: ${verified ? "VERIFIED — ENGINEER APPROVAL REQUIRED" : "PARTIALLY VERIFIED"}`,
      `Requested: ${formatRupees(320000)}`,
      `Recommended release: ${formatRupees(release)}`,
      `Amount held: ${formatRupees(held)}`,
      `Evidence confidence: ${score}%`,
      "",
      "EVIDENCE REVIEWED",
      ...evidence.map((item) => `- ${item.name} | ${item.type} | ${item.source} | ${item.status}`),
      "",
      "This report is a prototype recommendation, not payment authorization or structural certification."
    ];
    const objectUrl = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "BuildWise-ProofGate-Report-PG-2026-014.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };
  return <div className="report-workspace"><section className="panel report-summary"><div className="report-status"><ShieldCheck size={20} />{verified ? "VERIFIED · ENGINEER APPROVAL REQUIRED" : "PARTIALLY VERIFIED"}</div><h2>RCC Slab Completion</h2><p>Green Heights Residence · Apex Buildworks · Claim PG-2026-014</p><div className="claim-list-metrics"><span><small>REQUESTED</small><b>₹3,20,000</b></span><span><small>RECOMMENDED RELEASE</small><b>{formatRupees(release)}</b></span><span><small>HOLD</small><b>{formatRupees(held)}</b></span><span><small>CONFIDENCE</small><b>{score}%</b></span></div><p className="modal-caveat">This is an evidence-based recommendation, not final authorization or payment.</p><button className="button primary" onClick={downloadReport}><FileCheck2 size={14} />Download report</button></section><section className="panel report-evidence"><PanelHeading kicker="SOURCE RECORDS" title="Evidence reviewed" />{evidence.map((item, index) => <button key={`${item.name}-${index}`} onClick={() => onOpenEvidence(item.name)}><FileText size={14} /><span><b>{item.name}</b><small>{item.source} · {item.timestamp}</small></span><span>{item.status}</span></button>)}</section></div>;
}

function AuditWorkspace({ audit }) {
  return <section className="panel audit-workspace"><PanelHeading kicker="VERIFIABLE BY DESIGN · APPEND-ONLY DEMO LOG" title="Investigation audit trail" right={<span className="audit-immutable"><LockKeyhole size={12} /> {audit.length} EVENTS</span>} /><div className="audit-table"><div className="audit-table-head"><b>TIME</b><b>ACTOR / SYSTEM</b><b>EVENT</b><b>DETAIL</b></div>{audit.slice().reverse().map((item, index) => <div className="audit-table-row" key={`${item[0]}-${index}`}><time>{item[0]}</time><span>ProofGate · Engineer review</span><b>{item[1]}</b><span>{item[2]}</span></div>)}</div></section>;
}

function Finding({ text, good = false, warn = false }) {
  return <div className={`workspace-finding ${good ? "good" : ""} ${warn ? "warn" : ""}`}><span>{good ? <Check size={13} /> : <AlertTriangle size={13} />}</span>{text}</div>;
}

function Kpi({ label, value, note, icon: Icon, color }) {
  return <div className="kpi-card"><span className="kpi-top"><span>{label}</span><i className={`kpi-icon ${color}`}><Icon size={15} /></i></span><span className="kpi-value">{value}</span><span className="kpi-note">{note}</span></div>;
}

function ProjectProgress({ verified }) {
  return <section className="panel project-panel progress-strip">
    <PanelHeading kicker="GREEN HEIGHTS RESIDENCE · ₹32.0L PROJECT BUDGET" title="Project progress" right={<span className="progress-total">46% complete</span>} />
    <div className="project-progress"><i style={{ width: "46%" }} /></div>
    <div className="milestone-track">
      <Milestone label="Foundation" state="done" />
      <Milestone label="Columns" state="done" />
      <Milestone label="RCC Slab" state={verified ? "done" : "active"} />
      <Milestone label="Brickwork" state="pending" />
      <Milestone label="Finishing" state="future" />
    </div>
  </section>;
}

function PipelineStrip({ verified, running }) {
  const items = [
    [FileText, "Claim Extractor", "Claim analyzed", "complete"],
    [Network, "Evidence Matcher", "Records cross-checked", "complete"],
    [AlertTriangle, "Skeptic Agent", verified ? "Gaps resolved" : "3 challenges found", verified ? "complete" : "warning"],
    [ShieldCheck, "Evidence Judge", verified ? "Re-verified · 94%" : "Partial · 68%", verified ? "complete" : "complete"],
    [LockKeyhole, "Human Approval", "Awaiting authorized action", "human"]
  ];
  return <section className="workspace-agent-strip panel" aria-label="AI investigation pipeline">
    <div className="workspace-agent-heading"><span className="panel-kicker">AI INVESTIGATION PIPELINE</span><span className={running ? "agent-live" : ""}>{running ? "INVESTIGATION RUNNING" : "5 STAGES · HUMAN CONTROLLED"}</span></div>
    <div className="workspace-agent-flow">{items.map(([Icon, name, detail, state], index) => <button key={name} className={`workspace-agent-card ${state}`} onClick={() => { window.location.hash = index === 4 ? "decisions" : "investigation"; }}><span className="workspace-agent-icon"><Icon size={14} /></span><span className="workspace-agent-copy"><b>{name}</b><small>{detail}</small></span><span className="workspace-agent-number">{index + 1}</span></button>)}</div>
  </section>;
}

function PanelHeading({ kicker, title, right }) {
  return <div className="panel-heading"><div><span className="panel-kicker">{kicker}</span><h2>{title}</h2></div>{right && <div className="panel-heading-right">{right}</div>}</div>;
}

function EvidenceChip({ icon: Icon, label }) { return <span className="evidence-chip"><Icon size={13} />{label}</span>; }

function MapEvidence({ label, state }) { return <span className={`map-evidence-item ${state}`}><i />{label}</span>; }

function EvidenceRow({ item, onOpen }) {
  const Icon = item.type.toLowerCase().includes("photo") ? Layers3 : item.type.toLowerCase().includes("inspection") ? ClipboardCheck : FileText;
  return <button className={`evidence-row ${item.status === "missing" ? "row-missing" : ""}`} onClick={onOpen}><span className="evidence-name"><i className={`doc-icon ${item.status}`}><Icon size={14} /></i><span><b>{item.name}</b><small>{item.timestamp}</small></span></span><span className="evidence-source"><b>{item.type}</b><small>{item.source}</small></span><span className="confidence-cell">{item.confidence > 0 ? <><span className="confidence-mini"><i style={{ width: `${item.confidence}%` }} /></span><b>{item.confidence}%</b></> : <span className="not-available">—</span>}</span><span><span className={`evidence-status ${item.status}`}>{item.status === "supporting" ? <><Check size={11} />Matched</> : item.status === "uncertain" ? <><AlertTriangle size={11} />Review</> : <><XCircle size={11} />Missing</>}</span></span></button>;
}

function EvidenceSideRow({ item, onOpen }) {
  const status = item.status === "supporting" ? "good" : item.status === "uncertain" ? "review" : "missing";
  return <button className="evidence-side-row" onClick={onOpen}>
    <span className={`side-doc-icon ${status}`}><FileText size={13} /></span>
    <span className="side-doc-copy"><b>{item.name}</b><small>{item.type} · {item.timestamp}</small></span>
    <span className={`side-doc-status ${status}`}>{status === "good" ? "Verified" : status === "review" ? "Review" : "Missing"}</span>
  </button>;
}

function Milestone({ label, state }) { return <div className={`milestone ${state}`}><span className="milestone-dot">{state === "done" ? <Check size={11} /> : state === "active" ? <i /> : null}</span><span>{label}</span></div>; }

function GapItem({ done, label, muted }) { return <div className={`gap-item ${done ? "done" : ""} ${muted ? "muted" : ""}`}><span>{done ? <Check size={12} /> : null}</span>{label}{done && <small>RECEIVED</small>}</div>; }

function Modal({ title, children, onClose, className = "" }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={17} /></button><span className="modal-kicker">BUILDWISE PROOFGATE</span><h2 id="modal-title">{title}</h2>{children}</section></div>;
}

function MaterialCard({ material, verified, onOpen, onPhoto }) {
  const supported = material.supported_quantity ?? (verified ? material.supported_verified : material.supported_initial);
  const coverage = material.expected_quantity ? Math.min(100, Math.round((supported / material.expected_quantity) * 100)) : material.confidence;
  const label = material.status === "quantity_reconciled" ? "QUANTITY MATCHED" : material.status === "inspection_pending" ? "INSPECTION PENDING" : material.status === "inspection_received_pending_reverification" ? "REVIEW PENDING" : material.status === "supported" ? "SUPPORTED" : material.status === "partial" ? "PARTIAL" : "SUPPORTING";
  const image = material.images?.[0] || "site-progress.jpg";
  return <article className={`material-card ${material.id === "concrete" ? "primary-material" : ""}`} onClick={onOpen} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}>
    <button className="material-image-button" onClick={(event) => { event.stopPropagation(); onPhoto(); }} aria-label={`View ${material.name} evidence image`}><img src={`/images/${image}`} alt={`${material.name} supporting construction image`} /><span><ImageIcon size={12} />REFERENCE & SITE CONTEXT</span></button>
    <div className="material-card-body"><div className="material-title-row"><div><small>{material.category}</small><h3>{material.id === "concrete" ? "CONCRETE" : material.id === "steel" ? "TMT REINFORCEMENT STEEL" : material.name.toUpperCase()}</h3></div><span className={`material-badge ${material.id === "concrete" && coverage < 100 ? "partial" : material.status.includes("pending") ? "review" : "supported"}`}>{label}</span></div>
      <div className="material-spec">{material.specification}</div>
      {material.expected_quantity ? <div className="material-quantity"><b>{Number(supported).toLocaleString("en-IN")} / {Number(material.expected_quantity).toLocaleString("en-IN")} {material.unit}</b><span>{coverage}% coverage</span></div> : <div className="material-quantity support-quantity"><b>Procurement records</b><span>Supporting only</span></div>}
      <div className="material-meter"><i style={{ width: `${coverage}%` }} /></div>
      <div className="material-evidence-meta"><span><FileCheck2 size={12} />{material.invoice}</span><span><Eye size={12} />Site visual: supporting</span></div>
      <button className="material-open" onClick={(event) => { event.stopPropagation(); onOpen(); }}>VIEW MATERIAL <ChevronRight size={13} /></button>
    </div>
  </article>;
}

function MaterialDetail({ material, verified, receiptAdded, onPhoto, onEvidence }) {
  const image = material.images?.[0] || "site-progress.jpg";
  const supported = material.expected_quantity
    ? (material.id === "concrete" ? (verified ? 18 : receiptAdded ? 18 : 12.5) : material.supported_quantity ?? material.supported_initial)
    : null;
  const coverage = material.expected_quantity ? Math.min(100, Math.round((supported / material.expected_quantity) * 100)) : material.confidence;
  return <div className="material-detail">
    <div className="material-detail-hero"><button className="detail-image-button" onClick={() => onPhoto(image)}><img src={`/images/${image}`} alt={`${material.name} site evidence`} /><span><Eye size={13} /> OPEN VISUAL EVIDENCE</span></button><div className="detail-spec-box"><small>EXPECTED SPECIFICATION</small><b>{material.specification}</b><span>Milestone · RCC Slab Completion</span><span>Source · {material.specification_source}</span><span>Supplier · {material.supplier}</span></div></div>
    <div className="detail-section-title">EVIDENCE SUMMARY</div>
    <div className="detail-metrics"><div><small>QUANTITY</small><b>{material.expected_quantity ? `${Number(supported).toLocaleString("en-IN")} / ${Number(material.expected_quantity).toLocaleString("en-IN")} ${material.unit}` : "Supporting procurement"}</b><span>{material.expected_quantity ? `${coverage}% supported by records` : "No unsupported quantity claim"}</span></div><div><small>SPECIFICATION</small><b>Document match</b><span>Source: approved project records</span></div><div><small>DELIVERY / INVOICE</small><b>{material.expected_quantity ? `${verified ? 3 : receiptAdded ? 3 : 2} delivery records` : material.invoice}</b><span>{material.invoice}</span></div><div><small>VISUAL EVIDENCE</small><b>Supporting context</b><span>Not proof of grade, quantity or strength</span></div></div>
    <div className="detail-evidence-grid"><button onClick={() => onEvidence(material.id === "steel" ? "Steel Invoice" : material.id === "concrete" ? "Concrete Delivery Receipt" : material.invoice)}><FileText size={15} /><span><b>DOCUMENT EVIDENCE</b><small>{material.id === "concrete" ? "BOQ_RCC_Slab.pdf · Page 2" : material.invoice}</small></span><ChevronRight size={14} /></button><button onClick={() => onEvidence(material.id === "steel" ? "Reinforcement Inspection" : "Concrete Delivery Receipt")}><Truck size={15} /><span><b>DELIVERY / INSPECTION</b><small>{material.id === "steel" && !verified ? "Inspection certificate pending" : "Linked source records"}</small></span><ChevronRight size={14} /></button><button onClick={() => onPhoto(material.images?.[1] || image)}><ImageIcon size={15} /><span><b>SITE EVIDENCE</b><small>Photo · visual context only</small></span><ChevronRight size={14} /></button></div>
    {material.id === "concrete" && <div className="detail-gap"><AlertTriangle size={15} /><span><b>{coverage < 100 ? "Quantity gap: 5.5 m³" : "Quantity reconciled from delivery records"}</b><small>Image review is not used to calculate or certify concrete volume.</small></span></div>}
    {material.id === "steel" && <div className="detail-gap"><ClipboardCheck size={15} /><span><b>{verified ? "Inspection certificate received" : "Inspection remains a separate mandatory check"}</b><small>Invoice quantity may match while qualified inspection is still pending.</small></span></div>}
    <div className="modal-caveat">Visual analysis provides supporting evidence only. Specifications and quantities must be verified against approved documents, invoices, delivery records, and qualified inspection.</div>
  </div>;
}

function EvidenceDetail({ evidence }) {
  return <div className="evidence-detail"><div className="document-preview"><span className="document-fold" /><FileText size={32} /><b>{evidence.name}</b><small>{evidence.type} · linked source record</small><span className="document-preview-footer">BUILDWISE EVIDENCE COPY · PAGE 1</span></div><div className="evidence-detail-facts"><div><small>SOURCE</small><b>{evidence.source}</b></div><div><small>RECEIVED</small><b>{evidence.timestamp}</b></div><div><small>MATCH CONFIDENCE</small><b>{evidence.confidence}%</b></div><div><small>STATUS</small><b>{evidence.status}</b></div><div><small>TRACE NOTE</small><b>Linked to RCC Slab Completion · Green Heights Residence</b></div></div><p className="modal-caveat">Prototype viewer: file metadata and controlled demo values are shown. Original documents are not persisted or parsed in this demo.</p></div>;
}

function PhotoViewer({ file, onClose, onEvidence }) {
  const observation = photoObservations[file] || photoObservations["site-progress.jpg"];
  return <div className="image-viewer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><button className="image-viewer-close" onClick={onClose} aria-label="Close image viewer"><X size={19} /></button><div className="image-viewer"><div className="image-viewer-photo"><img src={`/images/${file}`} alt={observation.title} /><span className="photo-proof-label"><ImageIcon size={13} /> DEMO SITE PHOTO · SUPPORTING EVIDENCE</span></div><aside className="image-observation"><span className="modal-kicker">AI VISUAL OBSERVATION</span><h2>{observation.title}</h2><div className="photo-meta"><span><MapPin size={13} />Project site · Green Heights</span><span><Clock3 size={13} />Captured · 04 Oct 2026</span></div><b className="observation-heading">VISUALLY OBSERVED</b>{observation.observations.map((line) => <p key={line}><Check size={14} />{line}</p>)}<div className="photo-confidence"><span>Evidence relevance</span><b>SUPPORTING</b><span>Observation confidence</span><b>{observation.confidence}%</b></div><div className="image-related"><b>RELATED DOCUMENTS</b><button onClick={() => { onClose(); onEvidence("BOQ"); }}><FileText size={14} />BOQ_RCC_Slab.pdf</button><button onClick={() => { onClose(); onEvidence("Concrete Delivery Receipt"); }}><Truck size={14} />Concrete delivery receipt</button><button onClick={() => { onClose(); onEvidence("Engineer Inspection"); }}><ClipboardCheck size={14} />Engineer inspection note</button></div><p className="modal-caveat">Image is visually consistent with RCC slab work. A photo alone cannot prove structural completeness, grade, strength, material authenticity, or quantity.</p></aside></div></div>;
}
