# Listoil Admin Portal: Technical End-to-End System Flow (Detailed)

## 1. Introduction
This technical guide provides a granular view of the data lifecycle within the Listoil loyalty ecosystem. It maps application logic to specific database schema mutations and external system integrations.

---

## 2. Comprehensive Data Lifecycle

### 2.1 Member Onboarding & KYC Lifecycle
This process transitions a "Guest" into a "Verified Stakeholder" eligible for points.

| Step | Application Action | Primary Table Mutations | Secondary Table/Events |
| :--- | :--- | :--- | :--- |
| **1. Registration** | Mobile App / Signup API | `users`: Insert new record with `role_id`, `phone`, and `password`. `block_status` defaults to `basic_registration`. | `retailers` / `electricians`: Insert 1:1 profile record linked via `user_id`. |
| **2. KYC Upload** | `uploadKycAction` (Inferred) | `kyc_documents`: Multiple inserts. Columns: `document_type` (Enum), `document_value` (S3 URL), `verification_status` ('pending'). | `audit_logs`: Log the document submission. |
| **3. KYC Review** | `getComplianceDataAction` | `kyc_documents`: SELECT where status is 'pending' JOIN `users` and `user_type_entity`. | - |
| **4. Approval** | `updateKycDocumentStatusAction` | `kyc_documents`: `verification_status` -> 'verified', `verified_at` -> current timestamp. | **Profile Update**: `retailers.is_kyc_verified` -> `true`. **Event**: Emit `USER_KYC_APPROVED`. |
| **5. Activation** | System Handler | `users.approval_status_id`: Update to ID corresponding to 'Active' or 'TDS_CONSENT_PENDING'. | `inapp_notifications`: Insert welcome/approval message. |

---

### 2.2 Point Accrual (Earning) Lifecycle
The journey of a scan from a physical bottle to a member's wallet balance.

1.  **QR Validation**:
    -   **Table**: `qr_codes`.
    -   **Check**: Verify `is_scanned` is `false`. Retrieve `sku` and `batch_number`.
2.  **Point Calculation Engine**:
    -   **Base Logic**: Query `sku_point_config` where `sku_variant_id` matches and `user_type_id` matches.
    -   **Override Logic**: Query `sku_point_rules`. If a rule matches the `location_entity_id` or a specific date range, apply the `action_type` (e.g., `PERCENTAGE_ADD`).
3.  **Transaction Logging**:
    -   **Table**: `retailer_transaction_logs` (or role equivalent).
    -   **Mutation**: Insert record with `points`, `qr_code`, `status` ('pending').
4.  **Points Settlement (The "Credit")**:
    -   **Action**: Admin `approveTransaction` or auto-approver.
    -   **Profile Mutation**: `retailers.points_balance` = `points_balance` + `new_points`.
    -   **Ledger Record**: `retailer_ledger`: Insert 'Credit' record with `opening_balance` and `closing_balance`.
    -   **QR Update**: `qr_codes.is_scanned` -> `true`, `scanned_by` -> `user_id`.

---

### 2.3 Redemption & Payout Lifecycle
The conversion of digital points into real-world value.

1.  **Redemption Request**:
    -   **Check**: Verify `points_balance` >= `requested_points`.
    -   **Table**: `redemptions`.
    -   **Mutation**: Insert record with `points_redeemed`, `status` (linked to `redemption_statuses.name` = 'PENDING').
2.  **Payout Detail Capturing**:
    -   **UPI**: Insert into `redemption_upi` with `upi_id`.
    -   **Bank**: Insert into `redemption_bank_transfers` with `account_number`, `ifsc_code`.
3.  **Financial Approval**:
    -   **Action**: `processRedemptionAction` (Finance Module).
    -   **Mutation**: `redemptions.status` -> 'APPROVED'.
    -   **Audit**: Insert into `approval_audit_logs`.
4.  **External Fulfillment**:
    -   **Event**: Trigger `REDEMPTION_APPROVED` handler.
    -   **API Call**: Calls Razorpay Payout API.
    -   **Table Update**: `redemption_upi.razorpay_payout_id` saved. Status moves to 'SUCCESS' upon webhook confirmation.

---

## 3. Advanced Replication & Fresh Start Seeding

If you are starting a fresh program using the same codebase, you must seed the "Master Configuration" tables in this specific order to avoid foreign key violations.

### Order of Seeding (SQL Example)
```sql
-- 1. Redemption Channels
INSERT INTO redemption_channels (name, code, is_active) VALUES 
('UPI Transfer', 'UPI', true),
('Bank Transfer', 'BANK', true),
('Amazon Voucher', 'AMAZON', true);

-- 2. Approval Statuses
INSERT INTO approval_statuses (name, description) VALUES 
('KYC_PENDING', 'Waiting for documents'),
('TDS_CONSENT_PENDING', 'Waiting for TDS agreement'),
('ACTIVE', 'Fully eligible for scans and redemptions'),
('SUSPENDED', 'Account blocked due to fraud');

-- 3. Redemption Statuses
INSERT INTO redemption_statuses (name) VALUES 
('PENDING'), ('APPROVED'), ('REJECTED'), ('SUCCESS'), ('FAILED');

-- 4. Role Hierarchy
INSERT INTO user_type_level_master (level_no, level_name) VALUES (1, 'Stakeholder');
INSERT INTO user_type_entity (level_id, type_name, max_daily_scans) VALUES 
(1, 'Retailer', 100),
(1, 'Electrician', 50);
```

### Technical Handover Checklist
1.  **Drizzle Push**: Run `npx drizzle-kit push` to mirror the schema exactly.
2.  **RabbitMQ Exchanges**: Ensure the exchange `loyalty_events` is created.
3.  **Event Handler Table**: Ensure `event_handler_config` is populated with the correct class/function names for your background workers.
4.  **Environment Variables**: Rotate all `SECRET` keys and update `DATABASE_URL` to the new instance.

---

## 4. Maintenance & Monitoring
- **`system_logs`**: Check here for server-side crashes or API failures (e.g., Razorpay timeouts).
- **`audit_logs`**: Use this to investigate if a member's points were manually adjusted by an admin.
- **`event_logs`**: Tracks high-level business events (Scans, Redemptions) for analytics.
