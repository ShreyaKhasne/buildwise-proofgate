# BuildWise ProofGate

Evidence-gated verification for construction milestone-payment claims. The local demo is deterministic and does not require an API key. AI recommendations do not authorize or release payments; an authorized project professional makes the final decision.

## Run locally

In one terminal, start the API:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8017
```

In a second terminal, start the UI:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The dashboard also works in local demo mode when the API is offline; file uploads and decision events stay in the browser for that session.

## Demo flow

1. Review the initial claim, milestone, evidence, and payment recommendation. The scenario starts with 12.5 m³ of supported concrete against 18 m³ required.
2. Explore **Material Intelligence** for concrete, reinforcement steel, cement, and aggregate. Select a material to inspect its specification, supporting documents, quantities, confidence, risk, and related site images.
3. Inspect the **Evidence Graph** and quantity reconciliation to see how the BOQ, delivery receipts, invoice, inspection requirement, and claim relate. Open linked records and photos for their source details. Photos provide visual context only; they do not establish exact quantity, material grade, strength, or structural safety.
4. Use **What-if Simulation** to compare the independent concrete-receipt and engineer-inspection requirements. Simulations do not change the claim or verification state.
5. Upload `Concrete_Delivery_02.pdf` and `Reinforcement_Inspection.pdf` using **Upload Missing Proof**, or upload separate files whose names identify the delivery receipt and inspection. Adding the receipt reconciles the documented concrete quantity, but re-verification remains blocked until the separate inspection evidence is present.
6. Click **Re-run Verification** to update the recommendation. Full evidence support is still pending authorized engineer review; record a human decision to add it to the audit trail.

The backend loads its controlled scenario and material records from `demo_data/demo.json` and holds changes in memory. The dashboard includes claim extraction, document/specification checks, material risk indicators, quantity reconciliation, evidence links and graph, photo/document viewers, a verification-agent trace, and an audit log. Supported upload types are PDF, PNG, JPG, and JPEG (15 MB maximum per file); uploaded file content is not persisted or parsed in this demo. Choose the upload category (delivery receipt, inspection certificate, supporting document, or site photo) on the dashboard and Evidence, Documents, or Site Photos workspaces. The category explicitly classifies files for the demo; automatic classification from the filename is also available on the dashboard and Evidence workspace. This is a deterministic workflow demonstration—not production document extraction or validation.

## Dashboard workspaces

The sidebar keeps workspace links reachable on short screens, and the Evidence, Documents, and Site Photos workspaces can export their currently filtered evidence register as CSV.

Use the left navigation to switch between the Command Center, Payment Claims, Evidence Intelligence, Materials, Documents, Site Photos, AI Investigation, Payment Decisions, Project Timeline, Audit Trail, and Reports. Claim status filters and text search update the claim register; filters with no matching cases show an explicit empty state. Material cards open a dedicated detail workspace with Overview, Quantity, Documents, Site Images, Inspection, AI Analysis, Risk & Gaps, and Traceability tabs. The Evidence Intelligence view includes searchable and filterable source records; the AI Investigation view connects the claim, evidence, Skeptic Agent, Evidence Judge, and recommendation. Payment Decisions compares the initial result with the explicitly labelled after-evidence projection and offers human decision controls. Reports can be downloaded as a text file, recent activity is available from Notifications, and **Reset demo scenario** returns the in-memory workflow to its initial state for replay.

Uploads reject unsupported, oversized, and duplicate files instead of reporting them as successful. Explicitly selected delivery and inspection categories map to their respective demo proof gates; automatic classification recognizes filenames containing delivery/receipt/challan/ticket or inspection/engineer-certificate terms. Site photos remain uncertain supporting context and never satisfy quantity or inspection requirements. The backend still does not parse or persist uploaded document contents; confirm all extracted quantities and inspection findings against real source records in any production workflow.

## What the project contains

- `frontend/` — React 18 dashboard built with Vite, Lucide icons, and CSS. The `/api` requests are proxied to the local backend on port 8017.
- `backend/main.py` — FastAPI endpoints for the demo state, claim submission, verification, materials, non-mutating what-if evaluation, evidence uploads, re-verification, and human decisions/audit events.
- `demo_data/demo.json` — Controlled project, milestone, BOQ quantities, material records, initial evidence, and partial/verified recommendation fixtures.
- `frontend/public/images/` — Local construction imagery used by the dashboard and its image viewer.
- `.env.example` — Optional configuration for external claim extraction. Demo mode is deterministic by default.

The backend exposes its interactive API documentation at `http://127.0.0.1:8017/docs` while it is running. This prototype keeps state in process memory, does not persist or parse uploaded file contents, and does not authorize or release payments.

## Publish a public demo

This repository includes a Render blueprint for the API. To create shareable links, publish the code to a GitHub repository, then:

1. In Render, create a **Blueprint** from the GitHub repository and deploy `render.yaml` from the repository root. Wait for the web service health check to pass, then copy its URL, such as `https://buildwise-proofgate-api.onrender.com`.
2. In Vercel, import the same GitHub repository and set the project root directory to `frontend`.
3. In the Vercel project’s environment variables, set `VITE_API_URL` to the Render service URL (no trailing slash), then deploy.
4. In the Render web service’s environment variables, set `FRONTEND_ORIGINS` to the Vercel production URL, for example `https://buildwise-proofgate.vercel.app`, then redeploy the API.
5. Share the Vercel production URL. Open it in a private browser window or another device to check the public view.

The `FRONTEND_ORIGINS` setting accepts a comma-separated list if more than one trusted frontend origin is needed. The demo API has no user authentication and keeps workflow state in memory shared by all visitors; anyone who can access the public demo can change or reset that demo state. Do not upload confidential documents or use this deployment for real payment decisions. Render’s free service may sleep when idle, so the first request after inactivity can take longer.

## Optional claim extraction

The app starts in `DEMO_MODE=true` and never calls an external AI service. To enable OpenAI-backed claim extraction, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and set `DEMO_MODE=false` before starting the backend. Only the claim text is sent for extraction; evidence matching and payment recommendations remain deterministic. If the service is unavailable or returns malformed data, the backend falls back to deterministic extraction and reports that in the UI.
