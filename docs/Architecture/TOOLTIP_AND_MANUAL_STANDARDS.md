# Tooltip Coverage & Reference Manual Standing Standards

This document establishes the mandatory architectural and design policy for all new and existing features in the Learning Management System (LMS).

---

## 1. Context & Purpose

As features expand across modules (Academics, Finance, Administration, Timetables, Calendar, Library, Communication, Roles), interactive controls must remain immediately understandable, self-documenting, and fully accessible to all user roles (Master Admin, Institution Admin, Finance Admin/Bursar, Teachers, HODs, Librarians, Students, and Parents).

To prevent documentation decay and usability gaps, this policy mandates that **no feature is considered complete or shippable without action tooltip coverage and a corresponding Reference Manual entry**.

---

## 2. Interactive Tooltip Standard

### 2.1 The Shared Component
All interactive action triggers, icon buttons, toggle controls, and ambiguous buttons must be wrapped using the shared `ActionTooltip` component:
`frontend/components/common/ActionTooltip.tsx`

```tsx
import { ActionTooltip } from '@/components/common/ActionTooltip';

// Basic action button
<ActionTooltip text="Reset user credentials">
    <TouchableOpacity ...>
        <LockResetIcon />
    </TouchableOpacity>
</ActionTooltip>

// Complex feature with link to reference manual
<ActionTooltip 
    text="Assign Head of Department for curriculum oversight" 
    learnMoreAnchor="hod-role"
>
    <View ...>...</View>
</ActionTooltip>
```

### 2.2 Writing Guidelines for Tooltip Copy
- **Be Specific & Action-Oriented**: State what happens when the control is clicked (e.g. *"Record student fee payment"* instead of *"Payment"* or *"Click here"*).
- **Plain, Curriculum-Neutral Language**: Avoid system jargon, ambiguous acronyms, or generic placeholders.
- **Short & Direct**: 1 sentence, ideally under 10 words for standard actions.
- **Complex Features (Decision Point A3)**: For elements where a brief tooltip cannot capture the full operational rules (e.g., Custom Roles permission matrix, Coverage Planner HOD-scoping, or Timetable conflict resolution), pass `learnMoreAnchor` pointing to the exact section in `ReferenceManual.tsx`.

### 2.3 Accessibility & Cross-Platform Behavior
- **Hover & Keyboard Focus**: Tooltips must trigger on mouse hover (`onMouseEnter`) and on keyboard focus (`onFocus`), and dismiss on mouse leave (`onMouseLeave`) and blur (`onBlur`).
- **Z-Index & Positioning**: Must render on top of all modal, grid, and navigation layers without clipping or displacing surrounding flex layouts.
- **Pointer Events**: Standard tooltips use `pointer-events: none` to avoid interfering with fast clicks. Tooltips with `learnMoreAnchor` enable pointer events with a 180ms hover buffer to allow smooth mouse movement to the "Learn more →" link.

---

## 3. Reference Manual Documentation Standard

### 3.1 Host Location
The in-app documentation lives in:
`frontend/components/settings/ReferenceManual.tsx`
Accessible under **Settings → Reference Manual** for all roles, and deep-linked via:
`/(admin)/accessibility/settings?manual=1&anchor={module-id}`

### 3.2 Required Structure per Feature Entry
Every module registered in `ReferenceManual.tsx` must implement the `ManualSection` interface:
1. `id`: kebab-case unique anchor identifier.
2. `title`: Human-readable module name.
3. `roles`: Array of roles authorized to view the guide (`['admin', 'teacher', 'student', 'parent']`).
4. `feature`: Optional feature tier gating flag (e.g. `billing`, `library`, `grading`).
5. `shortBlurb`: 1-sentence summary of the module.
6. `whatItDoes`: High-level plain-language explanation of operational scope.
7. `whatChanges`: Clear statement of downstream impacts when settings or data in this feature are touched.
8. `crossLinks`: Breadcrumb links pointing to related screens in the app.
9. `deepDive`:
   - `title`: Operational flow header.
   - `steps`: Step-by-step procedural walkthrough.
   - `workedExample`: Realistic, concrete scenario illustrating normal usage.
   - `edgeCases`: Boundaries, locking rules, error conditions, and role constraints.

---

## 4. Pull Request & Quality Gate Checklist

Before submitting or merging any PR that adds or modifies user-facing capabilities:
- [ ] All icon-only buttons, action triggers, and status badges are wrapped with `ActionTooltip`.
- [ ] Complex controls include `learnMoreAnchor` pointing to the relevant manual section.
- [ ] `ReferenceManual.tsx` contains an up-to-date entry with `whatItDoes`, `whatChanges`, steps, worked examples, and edge cases.
- [ ] Keyboard navigation (`Tab` + `Enter`) and hover behavior have been verified on web.
- [ ] Multi-tenant boundaries and role authorizations are verified on both backend controller and frontend UI.
