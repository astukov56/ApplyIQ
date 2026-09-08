# ApplyIQ 🚀

ApplyIQ is an AI-driven resume tailoring and career document platform engineered to align candidates with ATS criteria and target job specifications.

**Live Application:** [https://applyiqofficial.vercel.app](https://applyiqofficial.vercel.app)

---

## ⚡ Getting Started

1. Go to **[applyiqofficial.vercel.app](https://applyiqofficial.vercel.app)**.
2. Log in using **Google** or **GitHub** SSO.
3. Import or create your resume profile:
   * **Upload & Auto-Parse Master Resume:** Drop a `.docx` or `.pdf` file to parse work history, education, skills, and links directly into your master profile.
   * **Create from Scratch:** Use the blank canvas to build a fresh, ATS-compliant profile step-by-step.
   * **Quick Paste:** Paste raw career text for automated section extraction.
4. Input a target job title and description to generate tailored resume snapshots and matching cover letters.
5. Export your final documents directly as `.docx` or print-ready PDF.

---

## 🛠️ Core Capabilities

* **Master Document Engine:** Centralize career history into an extensible single source of truth.
* **Targeted Resume Snapshots:** Generate contextual, ATS-tailored resume variations matching specific job requirements.
* **AI Cover Letter Studio:** Generate aligned, personalized cover letters directly from your parsed experience and target job postings.
* **Client-Side Export Pipeline:** High-fidelity document generation producing Word (`.docx`) and clean PDFs without losing ATS structure.
* **Unified SSO:** Fast, authenticated access via Supabase Authentication (Google & GitHub).

---

## 🔒 Data Privacy & Security

* User document profiles and parsed artifacts are strictly partitioned to your authenticated account.
* Parsing and AI document generation tasks are processed via isolated, server-authenticated API routes.
