import json
import os
import re
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
DEMO = json.loads((ROOT / "demo_data" / "demo.json").read_text(encoding="utf-8"))
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
state: dict[str, Any] = {
    "verified": False,
    "evidence": deepcopy(DEMO["evidence"]),
    "audit_events": deepcopy(DEMO["audit_events"]),
    "human_decisions": [],
    "request_sent": False,
    "llm_notice": None,
    "what_if": {"receipt_added": False, "inspection_added": False},
}

app = FastAPI(title="BuildWise ProofGate", version="1.0.0")
frontend_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *frontend_origins],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClaimRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    requested_amount: int = Field(default=320000, ge=0)


class DecisionRequest(BaseModel):
    decision: str = Field(min_length=1, max_length=80)
    actor: str = Field(default="Engineer / Supervisor", max_length=120)


def add_audit(event: str, detail: str) -> dict[str, str]:
    item = {"time": datetime.now().astimezone().strftime("%H:%M:%S"), "event": event, "detail": detail}
    state["audit_events"].append(item)
    return item


def extract_claim(text: str, requested_amount: int) -> dict[str, Any]:
    extraction = {
        "milestone": DEMO["milestone"]["name"],
        "claimed_amount": requested_amount,
        "completion_date": DEMO["milestone"]["completion_date"],
        "claimed_completion": 100,
        "claimed_materials": ["RCC concrete", "reinforcement steel"],
    }
    api_key = os.getenv("OPENAI_API_KEY")
    if DEMO_MODE:
        state["llm_notice"] = None
        return extraction
    if not api_key:
        state["llm_notice"] = "AI analysis unavailable. Switching to deterministic verification mode."
        return extraction

    prompt = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": (
                "Extract construction payment claim facts. Return JSON only with keys "
                "milestone (string), claimed_amount (integer), completion_date (string or null), "
                "claimed_completion (number 0-100), claimed_materials (array of strings). "
                "Do not make a payment decision or claim structural safety."
            )},
            {"role": "user", "content": text},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    request = Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(prompt).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=12) as response:
            response_body = json.loads(response.read().decode("utf-8"))
        content = response_body["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        amount = parsed.get("claimed_amount", requested_amount)
        completion = parsed.get("claimed_completion", extraction["claimed_completion"])
        materials = parsed.get("claimed_materials", extraction["claimed_materials"])
        if not isinstance(amount, int) or amount < 0:
            raise ValueError("Invalid extracted amount")
        if not isinstance(completion, (int, float)) or not 0 <= completion <= 100:
            raise ValueError("Invalid extracted completion percentage")
        if not isinstance(materials, list) or not all(isinstance(item, str) for item in materials):
            raise ValueError("Invalid extracted material list")
        extraction.update({
            "milestone": str(parsed.get("milestone") or extraction["milestone"]),
            "claimed_amount": amount,
            "completion_date": parsed.get("completion_date") or extraction["completion_date"],
            "claimed_completion": completion,
            "claimed_materials": materials,
        })
        state["llm_notice"] = None
    except (URLError, TimeoutError, json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
        state["llm_notice"] = "AI analysis unavailable. Switching to deterministic verification mode."
        add_audit("AI extraction unavailable", "Deterministic claim extraction used")
    return extraction


def get_result() -> dict[str, Any]:
    source = DEMO["verified_result"] if state["verified"] else DEMO["initial_result"]
    return {
        **source,
        "milestone": DEMO["milestone"]["name"],
        "claimed_amount": DEMO["claim"]["requested_amount"],
        "expected_concrete_m3": DEMO["boq"]["expected_concrete_m3"],
        "verified_concrete_m3": source["verified_concrete_m3"],
        "expected_steel_kg": DEMO["boq"]["expected_steel_kg"],
        "verified_steel_kg": DEMO["quantities"]["steel_kg"],
        "human_review_required": True,
        "recommendation": "Recommendation, not final authorization.",
        "conflicts": [] if state["verified"] else [
            {"type": "quantity_mismatch", "severity": "high", "message": "Verified concrete quantity is lower than expected quantity."}
        ],
    }


def current_materials() -> list[dict[str, Any]]:
    verified = state["verified"]
    output = []
    for item in DEMO["materials"]:
        material = {
            **item,
            "supported_quantity": item["supported_verified"] if verified else item["supported_initial"],
            "status": item["status_verified"] if verified else item["status_initial"],
            "confidence": item["confidence_verified"] if verified else item["confidence_initial"],
        }
        if item["id"] == "concrete" and state["what_if"]["receipt_added"] and not verified:
            material["supported_quantity"] = item["supported_verified"]
            material["status"] = "quantity_reconciled"
        if item["id"] == "steel" and state["what_if"]["inspection_added"] and not verified:
            material["status"] = "inspection_received_pending_reverification"
        output.append(material)
    return output


@app.get("/")
def health() -> dict[str, str]:
    return {"service": "BuildWise ProofGate", "status": "ready", "demo_mode": str(DEMO_MODE).lower()}


@app.get("/api/demo")
def demo() -> dict[str, Any]:
    return {"project": DEMO["project"], "milestone": DEMO["milestone"], "claim": DEMO["claim"],
            "evidence": state["evidence"], "materials": current_materials(), "result": get_result(),
            "audit_events": state["audit_events"]}


@app.post("/api/demo/reset")
def reset_demo() -> dict[str, Any]:
    state.update({
        "verified": False,
        "evidence": deepcopy(DEMO["evidence"]),
        "audit_events": deepcopy(DEMO["audit_events"]),
        "human_decisions": [],
        "request_sent": False,
        "llm_notice": None,
        "what_if": {"receipt_added": False, "inspection_added": False},
    })
    return demo()


@app.get("/api/materials")
def materials() -> dict[str, Any]:
    return {"milestone": DEMO["milestone"]["name"], "materials": current_materials()}


class WhatIfRequest(BaseModel):
    receipt_added: bool = False
    inspection_added: bool = False


@app.post("/api/what-if")
def what_if(payload: WhatIfRequest) -> dict[str, Any]:
    """Evaluate independent evidence requirements without modifying demo state."""
    supported_concrete = DEMO["quantities"]["initial_concrete_m3"]
    if payload.receipt_added:
        supported_concrete += DEMO["quantities"]["additional_concrete_receipt"]["quantity"]
    inspection_present = payload.inspection_added
    quantity_complete = supported_concrete >= DEMO["boq"]["expected_concrete_m3"]
    if not quantity_complete:
        action = "partial_release"
        decision = "PARTIAL QUANTITY"
    elif not inspection_present:
        action = "engineer_review"
        decision = "MISSING MANDATORY INSPECTION"
    else:
        action = "eligible_pending_human"
        decision = "FULLY SUPPORTED"
    return {
        "supported_concrete_m3": supported_concrete,
        "expected_concrete_m3": DEMO["boq"]["expected_concrete_m3"],
        "inspection_present": inspection_present,
        "decision_logic": decision,
        "action": action,
        "human_review_required": True,
    }


@app.post("/api/claim")
def submit_claim(payload: ClaimRequest) -> dict[str, Any]:
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="Enter a contractor claim before analysis.")
    extraction = extract_claim(payload.text.strip(), payload.requested_amount)
    add_audit("Claim submitted", payload.text.strip())
    add_audit("Claim extracted", f"₹{extraction['claimed_amount']:,} requested · {extraction['milestone']}")
    return {**extraction, "fallback_notice": state["llm_notice"]}


@app.post("/api/verify")
def verify() -> dict[str, Any]:
    add_audit("Verification started", "Four-stage ProofGate agent workflow")
    return {**get_result(), "fallback_notice": state["llm_notice"]}


@app.post("/api/upload-evidence")
async def upload_evidence(
    files: list[UploadFile] = File(...),
    proof_kind: str = Form("auto"),
) -> dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="Choose at least one evidence file.")
    if proof_kind not in {"auto", "concrete_delivery", "reinforcement_inspection", "site_photo", "supporting"}:
        raise HTTPException(status_code=422, detail="Choose a supported evidence category.")
    accepted = {".pdf", ".png", ".jpg", ".jpeg"}
    added = []
    for upload in files:
        suffix = Path(upload.filename or "").suffix.lower()
        if suffix not in accepted:
            raise HTTPException(status_code=415, detail=f"{upload.filename or 'File'} is not a supported type. Use PDF, PNG, JPG, or JPEG.")
        content = await upload.read(15 * 1024 * 1024 + 1)
        if not content:
            raise HTTPException(status_code=400, detail=f"{upload.filename} is empty.")
        if len(content) > 15 * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"{upload.filename} exceeds the 15 MB demo limit.")
        name = Path(upload.filename or "Evidence").name
        if any(item["name"].casefold() == name.casefold() for item in [*state["evidence"], *added]):
            raise HTTPException(status_code=409, detail=f"{name} is already in the evidence register.")
        detected_kind = (
            "concrete_delivery" if re.search(r"delivery|receipt|challan|ticket", name, re.IGNORECASE)
            else "reinforcement_inspection" if re.search(r"inspection|engineer[-_ ]?certificate", name, re.IGNORECASE)
            else None
        )
        classified_kind = detected_kind if proof_kind == "auto" else proof_kind
        if classified_kind == "supporting":
            classified_kind = None
        is_site_photo = classified_kind == "site_photo" or (
            proof_kind == "auto" and re.search(r"photo|site[-_ ]?image", name, re.IGNORECASE)
        )
        if is_site_photo and suffix not in {".png", ".jpg", ".jpeg"}:
            raise HTTPException(status_code=415, detail=f"{name} is categorized as a site photo but is not an image file.")
        if is_site_photo:
            classified_kind = "site_photo"
        added.append({
            "name": name,
            "type": "Delivery receipt" if classified_kind == "concrete_delivery"
            else "Inspection certificate" if classified_kind == "reinforcement_inspection"
            else "Site photos" if is_site_photo else "Uploaded evidence",
            "proof_kind": classified_kind,
            "source": "Contractor upload",
            "timestamp": datetime.now().astimezone().strftime("%d %b · %H:%M"),
            "confidence": 86, "status": "uncertain" if is_site_photo else "supporting"
        })
    state["evidence"].extend(added)
    for item in added:
        if item["proof_kind"] == "concrete_delivery":
            item["quantity_m3"] = DEMO["quantities"]["additional_concrete_receipt"]["quantity"]
    state["what_if"]["receipt_added"] |= any(item["proof_kind"] == "concrete_delivery" for item in added)
    state["what_if"]["inspection_added"] |= any(item["proof_kind"] == "reinforcement_inspection" for item in added)
    add_audit("Additional evidence uploaded", ", ".join(item["name"] for item in added))
    return {"uploaded": added, "evidence": state["evidence"], "materials": current_materials()}


@app.post("/api/reverify")
def reverify() -> dict[str, Any]:
    has_receipt = state["what_if"]["receipt_added"]
    has_inspection = state["what_if"]["inspection_added"]
    if not has_receipt or not has_inspection:
        missing = []
        if not has_receipt:
            missing.append("additional concrete delivery receipt")
        if not has_inspection:
            missing.append("reinforcement inspection certificate")
        raise HTTPException(status_code=409, detail=f"Re-verification still needs: {', '.join(missing)}. A receipt alone does not clear inspection review.")
    state["verified"] = True
    add_audit("Re-verification started", "Updated delivery and inspection evidence checked")
    add_audit("Payment eligibility updated", "Verified · ₹3,20,000 eligible subject to engineer approval")
    return {"result": get_result(), "evidence": state["evidence"], "materials": current_materials(),
            "audit_events": state["audit_events"]}


@app.post("/api/demo-proof")
def add_demo_proof() -> dict[str, Any]:
    """Add the two controlled demo proofs so a judge can exercise the full loop."""
    present_receipt = state["what_if"]["receipt_added"]
    present_inspection = state["what_if"]["inspection_added"]
    added = []
    for name, evidence_type in [
        ("Concrete_Delivery_02.pdf", "Delivery receipt"),
        ("Reinforcement_Inspection.pdf", "Inspection certificate"),
    ]:
        proof_kind = "concrete_delivery" if "Delivery" in name else "reinforcement_inspection"
        already_present = present_receipt if proof_kind == "concrete_delivery" else present_inspection
        if not already_present:
            item = {
                "name": name, "type": evidence_type, "source": "Contractor",
                "timestamp": datetime.now().astimezone().strftime("%d %b · %H:%M"),
                "confidence": 94, "status": "supporting",
                "proof_kind": proof_kind,
                **({"quantity_m3": DEMO["quantities"]["additional_concrete_receipt"]["quantity"]}
                   if "Delivery" in name else {})
            }
            state["evidence"].append(item)
            added.append(item)
    state["what_if"] = {"receipt_added": True, "inspection_added": True}
    if added:
        add_audit("Additional evidence uploaded", ", ".join(item["name"] for item in added))
    return {"evidence": state["evidence"], "materials": current_materials()}


@app.post("/api/human-decision")
def human_decision(payload: DecisionRequest) -> dict[str, Any]:
    item = {"time": datetime.now().astimezone().strftime("%H:%M:%S"), "event": "Human decision recorded",
            "detail": f"{payload.actor} · {payload.decision}"}
    state["human_decisions"].append(item)
    add_audit(item["event"], item["detail"])
    return {"decision": item, "audit_events": state["audit_events"]}


@app.get("/api/audit-log")
def audit_log() -> dict[str, Any]:
    return {"events": state["audit_events"]}
