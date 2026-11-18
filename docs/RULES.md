# Coding Rules

## Vehicle Service Center Management & Business Intelligence System

> These rules apply to all future work on this project. Every contributor and every code review must enforce them.

---

## 1. Naming Conventions

| Item                | Convention                                | Example                          |
| ------------------- | ----------------------------------------- | -------------------------------- |
| Files (TS/TSX)      | `camelCase` or `PascalCase` for components | `auth.service.ts`, `LoginPage.tsx` |
| Database tables     | `snake_case`, plural                      | `job_cards`, `invoice_items`     |
| Database columns    | `snake_case`                              | `created_at`, `total_amount`     |
| TypeScript types    | `PascalCase`                              | `Customer`, `InvoiceItem`        |
| TypeScript functions| `camelCase`                               | `createCustomer`, `getStockLevel`|
| Constants           | `UPPER_SNAKE_CASE`                        | `DEFAULT_TAX_RATE`, `MAX_RETRIES`|
| Permission keys     | `module:action` (lowercase, colon-separated) | `customers:create`, `invoices:void` |
| IPC channels        | `module:action` (same as permissions)     | `customers:create`               |
| CSS classes         | `kebab-case` or CSS modules               | `job-card-header`                |
| Test files          | Same name as source + `.test.ts`          | `auth.service.test.ts`           |

---

## 2. Folder Layout

1. **Main process code** lives in `src/main/`. **Renderer code** lives in `src/renderer/`. **Shared types** live in `src/shared/`.
2. **Never import from `main/` in `renderer/`** or vice versa. Cross-process communication is only through IPC.
3. **Shared types and validation schemas** in `src/shared/` are the only code imported by both processes.
4. **One IPC handler file per module** in `src/main/ipc/`.
5. **One service file per module** in `src/main/services/`.
6. **One repository file per module** in `src/main/repositories/`.
7. **Migrations** are numbered SQL files in `src/main/database/migrations/`.
8. **Tests** mirror the source structure under `tests/`.

---

## 3. Money

1. **All money values are stored and transmitted as integers** in the smallest currency unit. No exceptions.
2. **Never use `float`, `double`, or `number` with decimals** for money. TypeScript type alias: `type MoneyAmount = number` (integer-constrained by validation).
3. **Validate at the boundary:** Every function that receives a money value must assert it is an integer (`Number.isInteger(value)`).
4. **Display conversion** happens only in the renderer's formatting utilities, never in business logic or storage.
5. **Tax rates** are stored as integers in basis points (100 basis points = 1%). Example: 15% = 1500.
6. **Rounding** is applied once, at the invoice total level, using the configured rounding rule. Never round intermediate values.

---

## 4. No Hard Deletes

1. **Business data records are never deleted** from the database. Set `is_active = 0` instead.
2. **Ledger records** (`stock_movements`, `payments`, `audit_log`) are append-only. No updates, no deletes.
3. **Invoices** are immutable after creation. Use void or credit note for corrections.
4. **Join table rows** (e.g., `role_permissions`, `user_roles`, `service_vehicle_categories`, `appointment_services`) may be deleted because they are relationships, not business records.
5. **Every query** must include `WHERE is_active = 1` unless explicitly showing archived records.
6. **Log every soft delete** in the audit log.

---

## 5. Database Changes

1. **All schema changes go through versioned migration files.** Never modify the database schema outside of a migration.
2. **Migration files are immutable** once committed. To change a migration, create a new one.
3. **Never delete or rename a column** in a migration. Add a new column and deprecate the old one.
4. **New NOT NULL columns must have a DEFAULT value** or a data migration that populates them.
5. **Test migrations** on a copy of realistic data before release.
6. **Foreign keys are always declared** in the schema. `PRAGMA foreign_keys = ON` is set on every connection.
7. **Indexes** are created in the same migration that creates the table.

---

## 6. Validation

1. **Every input is validated** before it reaches the service layer. Use Zod (or Yup) schemas.
2. **Validation schemas are defined in `src/shared/validation/`** and used by both the renderer (for instant feedback) and the main process (for enforcement).
3. **The main process is the authority.** Even if the renderer validates, the service layer must re-validate.
4. **Fail fast:** If validation fails, throw a `ValidationError` with a structured list of field errors.
5. **Sanitize strings:** Trim whitespace, reject empty strings for required fields.
6. **Money validation:** Assert integer, non-negative (unless credit note), within reasonable bounds.
7. **Date validation:** Assert ISO 8601 format. Reject obviously invalid dates.

---

## 7. Permission Checks

1. **Every IPC handler** that reads or writes data must call `requirePermission(key)` before executing business logic.
2. **Feature toggles** are checked before permissions: `requireModuleEnabled(module)` then `requirePermission(key)`.
3. **Permission checks are in the main process only.** The renderer may hide UI elements for UX, but this is cosmetic, not security.
4. **Never hardcode role-based logic.** Check permissions, not role names. Example: check `invoices:void`, not `role === 'Manager'`.
5. **The owner role protection** is enforced in the service layer: the `is_owner` role cannot have its settings permissions removed, and at least one user must always hold this role.

---

## 8. Required Tests

The following areas must have automated tests. No code is merged without passing tests for affected areas.

### 8.1 Mandatory Test Coverage

| Area                    | What to Test                                                         | Type        |
| ----------------------- | -------------------------------------------------------------------- | ----------- |
| **Money calculations**  | Addition, multiplication, tax calculation, rounding, invoice totals. All with integer arithmetic. | Unit |
| **Stock calculations**  | Stock level = sum of movements. Negative stock prevention. Movement types. | Unit + Integration |
| **Invoice totals**      | Line items → subtotal → tax → discount → rounding → total. Partial payments. Void flow. | Unit + Integration |
| **Permissions**         | Permission check passes/fails. Owner protection. Role union. Feature toggle blocking. | Unit + Integration |
| **Business isolation**  | Two businesses cannot see each other's data. Switching business clears session. | Integration |
| **Validation schemas**  | Valid and invalid inputs for every entity. Money integer checks. Required fields. | Unit |
| **Migrations**          | Fresh DB creates all tables. Sequential migrations produce the same schema as a fresh DB. | Integration |
| **Audit log**           | Significant actions produce audit entries. Old/new values are recorded. | Integration |
| **Sequence numbering**  | Numbers increment atomically. Yearly reset works. No duplicates under concurrent-like conditions. | Unit + Integration |
| **Soft delete**         | Deleted records are not returned by default. Can be queried explicitly. Ledger records cannot be deleted. | Integration |

### 8.2 Test Naming

```
describe('InvoiceService')
  it('should calculate total as sum of line items plus tax minus discount')
  it('should reject non-integer money amounts')
  it('should not allow editing a paid invoice')
  it('should create a credit note when voiding')
```

### 8.3 Test Infrastructure

- **Unit tests:** Vitest (fast, TypeScript-native).
- **Integration tests:** Vitest with an in-memory or temp-file SQLite database.
- **E2E tests:** Playwright or Spectron for Electron (Phase 8).
- **CI:** Tests run on every commit. Build fails if any test fails.

---

## 9. Error Handling

1. **Use typed errors:** `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `ConflictError`.
2. **Never swallow errors silently.** Every catch block must log and either re-throw or return a structured error.
3. **Service layer errors** are caught by IPC handlers and converted to structured error responses.
4. **Renderer shows user-friendly messages.** Technical details go to the log file, not the screen.
5. **Database errors** trigger transaction rollback before the error propagates.

---

## 10. Code Quality

1. **No `any` type.** If you can't type it, create a proper type.
2. **No magic numbers.** Use named constants.
3. **No `console.log` in production code.** Use the logger.
4. **No direct SQL in services.** SQL lives in repositories. Services call repository methods.
5. **No business logic in IPC handlers.** IPC handlers validate input, check permissions, call a service method, and return the result.
6. **No business logic in the renderer.** Formatters and UI state are fine; calculations and rules are not.
7. **Comments:** Explain *why*, not *what*. The code should be self-explanatory for the *what*.
8. **Keep functions small.** If a function exceeds 50 lines, consider splitting it.

---

## 11. Git & Workflow

1. **One feature branch per task.** Branch from `main`.
2. **Commit messages:** `type(scope): description` (e.g., `feat(customers): add customer search`).
3. **No commits that break the build.** Run tests locally before committing.
4. **Migrations are committed with the feature** that needs them.
5. **Document any new setting, permission, or status** in the relevant docs.

---

## 12. Quick Reference Checklist

Before submitting any code, verify:

- [ ] Money values are integers in smallest currency unit
- [ ] No hard deletes of business records
- [ ] Database changes are in a migration file
- [ ] All inputs validated with shared schemas
- [ ] Permission checks in every IPC handler
- [ ] Tests written for money, stock, invoice, and permission logic
- [ ] No `any` types
- [ ] No `console.log`
- [ ] No SQL in service files
- [ ] No business logic in renderer
- [ ] Audit log entries for significant actions
- [ ] Soft delete uses `is_active` flag
- [ ] Foreign keys declared in schema
- [ ] Error handling uses typed errors
