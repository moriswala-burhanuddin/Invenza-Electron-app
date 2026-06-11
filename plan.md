leave module is not working correctly 

Every model:
company = ForeignKey(Company)
COMPLETE PROJECT STRUCTURE (DJANGO SaaS ERP)
erp_saas/
│
├── manage.py
│
├── core/                # global settings, utils
├── accounts/            # login, users
├── companies/           # company & tenant system
├── billing/             # plans, features, subscriptions
├── products/            # product management
├── orders/              # order/invoice system
├── sync/                # (later) ERP sync system
│
├── api/                 # all API routing (DRF)
│
├── requirements.txt
└── .env

APP-WISE BREAKDOWN
[ Website ]
     ↓
[ Django API (DRF) ]
     ↓
[ PostgreSQL ]
     ↓
[ Electron ERP (SQLite) ]

One system → many clients → each sees only their own data
Shared Database + Tenant ID
One DB like:

central_db

👉 All tables include:

company_id / tenant_id
⚙️ Your Full System Architecture
🌐 1. Website (Django) and react js 

Features:

Signup / Login
Create Company
Start 7-day trial
Payment (Razorpay / Stripe later)
Show “Download ERP” button - and after payemnt give companyname email and pass for login 

send email via django emails - payment receipt and login details
🗄️ 2. Central Server (API - Django REST Framework) - central db django admin - postgresql 

👉 This is the brain

Endpoints:

/api/login/
/api/products/
/api/orders/
/api/sync/

👉 All requests include:

token (JWT)
💻 3. ERP Desktop (Electron App)

Inside ERP:

Login screen
Store token
Sync data with server
Local SQLite DB
🔄 4. Sync System

Flow:

[Electron ERP]
    ↓
(Local SQLite)
    ↓ sync
[Django API]
    ↓
[PostgreSQL Central DB]

🔁 Sync Logic (IMPORTANT)
Case 1: Upload
User creates sales in ERP
Save in SQLite
Send to API with company_id
Case 2: Download
Fetch only:
WHERE company_id = X
🔐 Authentication Flow
User logs in on ERP
API returns:
token + company_id
ERP stores it
Every request uses token
💳 Payment Logic
Flow:
User signs up
Company created
Trial = 7 days
After expiry:
Block API access
After payment:
Activate account
📦 Deployment Structure
VPS
/erp-backend
    Django API
    PostgreSQL DB

/erp-frontend
    Website
🧠 Important Decision

👉 Use:

PostgreSQL (central DB)
SQLite (local ERP)
🧩 How Your ERP Knows Which Client?

👉 Because of:

JWT Token → contains user_id → mapped to company_id
🪜 Step-by-Step Implementation Plan
Phase 1: Backend (Django)
Create models:
User
Company
Product
Order
Add:
company = ForeignKey(Company)
Setup DRF API
Phase 2: Auth System
JWT login
Attach company_id
Phase 3: Website
Signup → Create company
Trial logic
Payment page
Phase 4: ERP (Electron)
Login screen
Store token
Connect API
Local SQLite setup
Phase 5: Sync System
Push local → server
Pull server → local



Invenza ERP: Multi-Tenant SaaS Implementation Plan
This plan outlines the transition of Invenza ERP from a localized desktop application to a full-scale, multi-tenant SaaS platform with central data synchronization.

User Review Required
IMPORTANT

Database Architecture: We are moving to a "Shared Database + Tenant ID" approach. This is cost-efficient and easier to maintain but requires strict query filtering (using company_id) to ensure data privacy. [!WARNING] Security: JWT tokens will be used for all API communication. The transition will require a fresh login for all existing users to generate secure tokens. [!CAUTION] Sync Logic: The offline/online sync system is complex. We will implement a "Last Write Wins" or versioned-based sync strategy to handle conflicts between local SQLite and remote PostgreSQL.

Phase 0: Foundation & Repository Structure
The project will be split into three core repositories (or a monorepo structure) to maintain separation of concerns and security.

1. Repository Guide
invenza-backend: Django REST Framework, PostgreSQL, multi-tenant logic, payment processing.
invenza-electron: Desktop application (React/Vite + Electron), local SQLite.
invenza-marketing: (Optional) Static/Marketing site or integrated with the Django frontend.
2. Security & .env Protection
ALL keys (Razorpay, Email, OpenAI) will be moved to environment variables.
.gitignore will be strictly enforced in all repos.
Production secrets will be managed via GitHub Secrets or VPS climate variables.
Phase 1: Django Backend (The Brain)
[MODIFY] 
backend/core/settings.py
Configure PostgreSQL (Shared DB).
Setup Django Simple JWT for authentication.
Configure Email and Razorpay using credentials updated in .env.
[NEW] 
backend/companies/models.py
Create Company model (Tenant).
Store subscription_status, expiry_date, and razorpay_customer_id.
[MODIFY] [Global Models]
Every model (Product, Order, Inventory, etc.) MUST inherit from a TenantModel base class:
python
class TenantModel(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    class Meta:
        abstract = True
Phase 2: Electron Desktop App (Offline Power)
[MODIFY] [Security Upgrade]
Implement secure-electron-store or encrypted SQLite using sqlcipher to protect local data.
Enforce strict CSP (Content Security Policy) in Electron.
[MODIFY] [Local Database]
Update SQLite schema to mirror the Django backend (including company_id).
Add a sync_status flag (Synced / Pending) to every table.
Phase 3: The Sync Engine (Online/Offline)
[NEW] [Sync Logic]
Push: When Electron detects internet, it scans for sync_status = 'Pending' records and POSTs them to /api/sync/.
Pull: On startup or manual refresh, Electron fetches records updated after the last_sync_timestamp where company_id matches.
Conflict Resolution: Timestamps for all records to ensure the latest update is preserved.
Phase 4: Invenza Website (SaaS Entry Point)
[NEW] [Authentication Logic]
Integrated Login/Signup using Django Templates or React.
Flow: User signs up -> Company Created -> Sends Welcome Email -> Opens Dashboard.
[NEW] [Payment & Subscriptions]
Integrate Razorpay for monthly/yearly plans.
Webhook to automatically update Company.subscription_status.
Open Questions
IMPORTANT

Local Encryption: Do you want to encrypt the local SQLite database for maximum security, or is standard SQLite sufficient for now?
Repository Preference: Would you prefer one big "Monorepo" with backend/ and electron/ folders, or separate GitHub repositories for each?
Hosting: Do you already have a VPS provider in mind (DigitalOcean, AWS, Hetzner)?
Verification Plan
Automated Tests
pytest for Django backend to ensure company_id isolation (Tenant A cannot see Tenant B's data).
vitest for Electron sync logic.
Manual Verification
Create a sale in Electron while offline.
Connect to internet -> Verify sale appears in Django Admin.
Login on Website -> Verify subscription status is "Active" after mock payment.




I have completed a deep technical audit of the Invenza ERP multi-tenant SaaS architecture. Below is the detailed analysis followed by a high-priority implementation plan.

🔍 Analysis Summary: electron/db.cjs
This file serves as the database orchestrator for the local Electron environment. It handles schema initialization, runtime migrations for the SaaS transition, and internal diagnostics.

⚠️ Issues Found
Missing Models on Backend (CRITICAL): While db.cjs defines ~40 tables (including suppliers, payroll, attendance, receivings), the new Django erp_core/models.py only contains ~10. Pushing data for HR, Suppliers, or Payroll will result in 400 Bad Request errors.
Inconsistent Tenant Scoping (High): company_id is missing from the CREATE TABLE statements for users, stores, accounts, and all HR/Payroll tables. It is added via a runtime migration script, which is fragile. If the migration fails, the sync engine will push data without a tenant ID.
Foreign Key Integrity (Medium): db.pragma('foreign_keys = OFF') is active. While intended for schema fixes, it allows orphaned records (e.g., a sale for a deleted product) to persist and sync, causing server-side integrity crashes.
Primary Key Conflicts (Medium): user_stores initially lacked an id column, which was patched but uses a random hex string. This may lead to duplicates if two devices create the same mapping for the same user-store pair.
🔐 Security Risks
Credential Exposure (Critical): ERPUser password hashes are synced in both directions (ERPUser.password). If the hashing algorithm in Electron (bcrypt) differs from Django (PBKDF2 by default), authentication will break. Furthermore, the erp_password field in Company model (Django) stores a plan-text or intermediate password which is a high-risk target.
Shadow Account Collisions (High): SyncPushEndpoint (Django) automatically creates a DjangoUser for every ERPUser. If a staff member moves between companies or uses a recycled email, the system may link them to the wrong company or throw IntegrityError during sync.
🧠 SaaS / Tenant Risks
Cross-Tenant Leakage (Low - Backend): The Django side enforces company=company strictly in views.py.
Cross-Tenant Leakage (High - Local): The local users table lacks company_id. If a user logs out and another user from a different company logs into the same Electron app, there is no structural barrier preventing the second user's sync engine from seeing the first user's sync_status=0 data if the database file is shared.
🔄 Sync Risks
Server-Wins Policy: The sync-engine.cjs uses ON CONFLICT DO UPDATE. This means any local changes made offline will be silently overwritten by cloud data if the cloud version is newer, without conflict resolution UI.
Missing Dependency Loop: If a Sale is pushed but its Customer fails to push (due to an error), the server will reject the Sale. The recovery logic in store-data.ts (lines 2388-2420) attempts to reset sync status, but this can lead to infinite sync loops if the underlying constraint error isn't fixed.
📊 Model Consistency Notes
The following models are completely missing from the new Cloud backend (erp_core/models.py) but are active in the Electron app:

Employee, Attendance, Leave, Shift, Payroll, PerformanceReview
Supplier, Receiving, PurchaseOrder, SupplierTransaction
ItemKit, CustomField, Cheque, LoyaltyPoint, Commission
🚩 FINAL REPORT
✅ Overall System Health: POOR
The transition to multi-tenancy is structurally sound on the Django side (scoping is correct), but the functional coverage is incomplete. The system is currently in a "broken sync" state where 70% of the ERP's features cannot be backed up to the cloud.

❌ Critical Issues
Backend Model Void: Most business modules (HR, Suppliers, Inventory Kits) exist locally but have no cloud equivalent.
Auth Inconsistency: ERPUser passwords are being pushed as raw hashes; cloud login will fail unless the custom backend is perfectly aligned with the local hash format.
Local Tenant ID: SQLite users and employees tables lack company_id, making the local database multi-tenant-unsafe.
⚠️ Medium Risks
Sync Overwrite: No "Last Write Wins" logic based on timestamps; the server simply overwrites local data on pull.
Mismatched Columns: db.cjs contains columns like price_inr, tax_slab_id, and unit that are inconsistent with the Django Product model.
🛠️ IMPLEMENTATION PLAN
Phase 1: Critical Security & Auth Fixes
Fix Hashing: Standardize on PBKDF2 for both local (bcrypt is currently used) and cloud, or implement a custom Auth Backend in Django that can verify the local hashes.
Secure Multi-Tenant Context: Ensure every ERPUser in SQLite has a company_id assigned immediately upon first login/sync.
Phase 2: Tenant Isolation Enforcement
Schema Hardening: Update db.cjs to include company_id in the CREATE TABLE defaults for ALL tables, not just through ALTER TABLE migrations.
Composite Keys: Ensure the sync engine uses (id, company_id) as a composite unique constraint to prevent ID collisions across tenants.
Phase 3: Sync System Stabilization
Model Completion: Implement the missing ~20 models in erp_core/models.py (Employee, Supplier, Receiving, etc.).
Defensive Sync: Update SyncPushEndpoint to handle missing dependencies by returning a missing_ids list that the Electron app can prioritize pushing.
Phase 4: Data Integrity & Constraints
Enable Foreign Keys: Re-enable PRAGMA foreign_keys = ON in db.cjs after cleaning up orphaned records.
JSON Consistency: Align the items field in Sale and Receiving to use JSONField on both sides to avoid stringification errors.
Phase 5: Refactoring & Modularization
Sync Logic Separation: Move the massive sync payload logic in views.py into dedicated serializers.py to allow for unit testing of each table's sync mapping.
Audit Logging: Implement a SyncLog table on the cloud to track which deviceId pushed what data and when.
IMPORTANT

Immediate Action Required: Do not proceed with large-scale data entry for HR or Supplier modules until Phase 3 (Model Completion) is finished, as this data will not be backed up and is at high risk of loss during a local database reset.

I have created a comprehensive implementation plan to address these issues. Please review it before we proceed with the fixes.