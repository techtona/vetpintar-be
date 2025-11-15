# Prisma Multi-Schema Organization

This directory contains Prisma schema files organized by domain for better maintainability.

## Structure

```
prisma/
├── schema.prisma         # Auto-generated (DO NOT EDIT)
└── schemas/
    ├── _base.prisma      # Configuration & Enums
    ├── auth.prisma       # User, ClinicAccess
    ├── clinic.prisma     # Clinic
    ├── patient.prisma    # Patient
    ├── medical.prisma    # MedicalRecord, Hospitalization
    ├── inventory.prisma  # Product
    ├── billing.prisma    # Invoice, InvoiceItem, Payment
    └── appointment.prisma # Appointment
```

## Usage

### Editing Schema

**DO NOT** edit `prisma/schema.prisma` directly. Instead:

1. Edit files in `prisma/schemas/`
2. Run merge command:
   ```bash
   npm run prisma:merge
   ```

### Common Commands

```bash
# Merge schemas
npm run prisma:merge

# Generate client (auto-merges first)
npm run db:generate

# Create migration (auto-merges first)
npm run db:migrate
```

### Adding New Models

1. Create new `.prisma` file in `schemas/` or add to existing file
2. Run `npm run prisma:merge`
3. Run `npx prisma format` to validate
4. Run `npm run db:generate`

### Adding New Domain

Example: Adding `accounting.prisma`

1. Create `prisma/schemas/accounting.prisma`:
   ```prisma
   // ============================================
   // ACCOUNTING & FINANCE
   // ============================================

   model Transaction {
     id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     // ... fields
   }
   ```

2. Update `scripts/merge-prisma-schema.js`:
   ```js
   const SCHEMA_FILES_ORDER = [
     '_base.prisma',
     // ... existing files
     'accounting.prisma'  // Add here
   ];
   ```

3. Run `npm run prisma:merge`

## Rules

1. **_base.prisma** must always be first (contains generator, datasource, enums)
2. **All enums** must be in `_base.prisma`
3. **Models** can be in any domain file
4. **File naming**: lowercase with `.prisma` extension
5. **Order matters**: Update `SCHEMA_FILES_ORDER` in merge script

## Benefits

- ✅ Easier navigation (find models by domain)
- ✅ Better git diffs (changes isolated to domain files)
- ✅ Reduced merge conflicts
- ✅ Logical organization for 30-40+ tables
- ✅ Cleaner code reviews
