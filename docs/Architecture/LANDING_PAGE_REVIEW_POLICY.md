# Landing Page Accuracy & Capability Review Policy

## 1. Overview & Policy Statement
The Cloudora LMS public landing page serves as the primary technical and commercial window into the platform for school owners, headteachers, academic directors, and bursars.

To maintain trust and operational integrity, **all marketing copy, feature matrices, telemetries, and pricing disclosures must strictly reflect verified, running capabilities of the system** rather than aspirational designs or unverified prototypes.

---

## 2. Review Cadence & Trigger Events
A mandatory Landing Page Accuracy Review must be performed:
1. **Post-Module Release**: Whenever a new major frontend portal or backend capability is shipped (e.g., Timetabling, Fee Invoicing, Library Circulation, Report Card Generation).
2. **Post-Schema Migration**: Whenever database models alter permissions, multi-role access, or workflows (e.g., student clearance or password lifecycle changes).
3. **Quarterly Review**: Routine quarterly audit of all text strings, feature tags, and pricing plans against the active codebase.

---

## 3. Core Editorial & Technical Principles

### A. Capability Truth (Code-Verified Claims Only)
- Never claim features that are only planned or designed in specifications but not yet operational in the active codebase.
- Example: If timetabling implements an interactive step-by-step schedule builder with multi-dimensional live conflict detection (teacher, room, stream overlaps), describe it accurately as a **Conflict-Free Timetable Builder**. Do not claim automated AI constraint solving until an algorithmic engine is actually committed, tested, and shipped.

### B. Curriculum Neutrality & Global Flexibility
- **Never restrict copy to a single curriculum system (e.g., CBC, IGCSE, Cambridge, 8-4-4).**
- Completely avoid single-curriculum jargon like *"CBC strand/band"* on public marketing pages.
- Use universal, adaptable academic concepts:
  - *"Subjects, Topics & Subtopics"* instead of *"Strands/Sub-strands"*.
  - *"Learning Milestones & Competencies"* instead of curriculum-locked buzzwords.
  - *"Flexible Descriptor & Numerical Grading"* (e.g., Exceeding/Meeting/Approaching or 0–100% marks).

### C. Plain, Understandable Vocabulary
- Target audience: School principals, academic registrars, and finance officers—not database engineers.
- Eliminate database and DevOps jargon from the public view:
  - ❌ Avoid: *"Row-level security", "multi-tenant database partition", "REST endpoints", "microservice architecture"*.
  - ✅ Use: *"Enterprise Data Privacy", "Custom Staff Roles & Permissions", "Reliable Cloud Access", "Instant Live Updates"*.

### D. Multi-Role Matrix Alignment
- Ensure all featured roles match active platform permissions:
  - **School Leadership & Principals** (Institution setup, audit logs, clearance sign-off).
  - **Teachers & Faculty** (Curriculum schemes, attendance, grade entry, record of work).
  - **Finance & Bursars** (Fee structures, student invoicing, payment allocation, balance ledgers).
  - **Librarians** (Book cataloging, check-in/out, return audits).
  - **Students & Parents** (Report cards, fee statements, attendance tracking, classroom diaries).

---

## 4. Audit Checklist for Reviewers
Before updating or approving any public-facing text:

| Check | Requirement | Verified In Code |
|---|---|---|
| 1. Feature Existence | Does this feature have an active controller, route, and frontend screen? | Yes / No |
| 2. Working Scope | Does the description accurately capture what the screen currently does? | Yes / No |
| 3. Curriculum Neutrality | Are all references adaptable to national, British, American, and custom syllabuses? | Yes / No |
| 4. Vocabulary Check | Is the text free of technical database/engineering jargon? | Yes / No |
| 5. Add-on Consistency | Do names and descriptions in `FuturisticPricing.tsx` match `app/index.tsx` modal data? | Yes / No |
