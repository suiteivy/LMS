# CRITICAL Audit - Cross-Institution Library Leak & Mock/Static Data Review

Date: 2026-07-10

## Scope
- Verify and remediate cross-institution library data leak risks.
- Audit active mock/static/demo library data paths.
- Validate multi-institution behavior with live API evidence.

## Found
- **Backend tenant-scope gap in write paths (library):**
  - `returnBook` previously updated by loan id and adjusted stock without guaranteed institution scoping in all write operations.
  - `rejectBorrowRequest` update path needed explicit institution scoping on update.
  - `extendDueDate` update path needed explicit institution scoping on update.
- **Frontend active mock path (teacher management library):**
  - `frontend/app/(teacher)/management/library.tsx` used hardcoded `mockBooks` in demo mode.
- **Additional frontend hardcoded fallback source (admin library):**
  - `frontend/components/admin/library/LibraryAction.tsx` had hardcoded `DEMO_BOOKS` and `DEMO_BORROWED`.
  - These were used as runtime fallback when real API returned zero rows:
    - `setBooks(transformed.length > 0 ? transformed : DEMO_BOOKS)`
    - `setBorrowedBooks(transformed.length > 0 ? transformed : DEMO_BORROWED)`
  - This exactly matches the recurring symptom: a brand-new institution with empty library showing non-empty hardcoded entries.
- **System-wide mock/static audit result:**
  - Demo usage exists across multiple modules (`isDemo`), but library-critical active static payload in teacher management was removed.
  - Remaining demo flows are feature/demo UX paths, not cross-institution backend data paths.

## Changed
- **Backend isolation hardening** in `backend/controllers/library.controller.js`:
  - `returnBook` now requires institution context and applies `institution_id` scoping in:
    - loan lookup,
    - loan update,
    - stock lookup (`books`),
    - stock update (`books`).
  - `rejectBorrowRequest` update now scoped by `institution_id`.
  - `extendDueDate` update now scoped by `institution_id`.
- **Frontend demo/static data removal** in `frontend/app/(teacher)/management/library.tsx`:
  - Replaced demo `mockBooks`/mock student data with empty arrays.
- **Frontend hardcoded fallback removal** in `frontend/components/admin/library/LibraryAction.tsx`:
  - Removed `DEMO_BOOKS` and `DEMO_BORROWED` constants.
  - Removed fallback-to-demo behavior on empty API result sets.
  - Empty backend result now renders a true empty state instead of synthetic sample records.

## Verification

### 1) Unit / regression tests
- File: `backend/tests/library-controller.test.js`
- Added tests:
  - `returnBook scopes updates to institution_id`
  - `extendDueDate scopes update by institution_id`
- Command:
  - `node --test tests/library-controller.test.js`
- Result:
  - 4/4 pass.

### 2) Syntax/type checks
- `node --check backend/controllers/library.controller.js` -> pass
- `node --check backend/tests/library-controller.test.js` -> pass
- `npx tsc --noEmit` (frontend) -> pass

### 3) Live multi-institution verification matrix (API)
- Started backend locally and executed authenticated flows.
- Created two new institutions via master-admin enrollment with distinct admin accounts.
- Completed credential setup for both institution admins, then re-authenticated.
- Enabled `addon_library` at creation for both institutions.
- Added one book in Institution B only.
- Queried books from both institutions with `includeUnavailable=true`.

Observed evidence:
- Institution A books count: `0`
- Institution B books count: `1`
- Inserted book `institution_id` equals Institution B id.
- Institution A response contained no Institution B book rows.

Repeated evidence run (post addendum changes):
- `institutionA`: `1f842f4f-9cb7-461d-955d-daadd84b4562`
- `institutionB`: `842caea6-85f9-4428-afca-0fa5cfa1e955`
- `addedBookInstitutionB`: `842caea6-85f9-4428-afca-0fa5cfa1e955`
- counts: `{ A_books: 0, B_books: 1 }`
- Confirms no cross-institution leakage and no synthetic fallback rows on empty institution data.

Evidence snapshot fields from run:
- `institutionA`: `66bf8b06-3e36-4ca3-9cef-95f562fe8c09`
- `institutionB`: `594f4cd8-053e-408f-8024-7d3cdd4993e3`
- `addedBookInstitutionB`: `594f4cd8-053e-408f-8024-7d3cdd4993e3`
- counts: `{ A_books: 0, B_books: 1 }`

### 4) DB structure check (library tables)
- REST schema introspection confirms `institution_id` columns exist on:
  - `books`
  - `borrowed_books`
  - `library_config`
- Code-side enforcement now ensures institution scoping is applied consistently for read/write hot paths.

## Open Decision Points / Residual Risk
- Some non-library demo paths still exist by design (`isDemo`) for trial UX; these are not library cross-tenant leak vectors.
- **Default library config boundary:** currently treated as structural settings only (e.g., borrow limits / fee threshold in `library_config`), with no book/borrow records seeded for new institutions.
- **Institution-type-specific config:** currently not implemented as a distinct per-type library template in code paths audited; requirements on which options differ by primary vs secondary need explicit product confirmation.
- **Demo/live isolation model:** enforced primarily by request/session context and institution scoping; if stricter separation is desired, define dedicated demo namespace/schema requirements explicitly.

## Conclusion
- **Critical library cross-institution leak tasks are completed for code + tests + live API verification.**
- Tenant scoping is now enforced on previously risky write/update paths.
- Active teacher-management library static mock payload removed.
