# GAVIN Centro Rama 2 – Phutthabucha 2 Security Specification (Phase 0)

## 1. Data Invariants
1. **Unit Integrity**: Every `LoanApplication` must reference an existing unit in `/units/{unitId}` (`exists()`), and unit IDs must strictly match `^[a-zA-Z0-9_-]+$` (`<= 32` chars).
2. **Identity & Privilege Isolation**: Only verified users (`request.auth != null && request.auth.token.email_verified == true`) listed in `/admins/{uid}` or matching the primary admin email (`kritin.prom@gmail.com`) may mutate `/units`, `/loanApplications`, `/loanLookups`, or create `/lineLogs`.
3. **Zero-PII Lookup Index**: `/loanLookups/{lookupHash}` forbids `list` queries (`allow list: if false`) and stores only masked identifiers, cryptographic verifiers, and AES-GCM encrypted dossier payloads (`encryptedDossier`).
4. **Immutable Audit & Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must equal `request.time`. `createdAt` is immutable on update. `/lineLogs` are append-only (`allow update, delete: if false`).
5. **Bounded Arrays & Strict Keys**: Every write validates exact key sets (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly()` on update) and bounds `timeline.size() <= 20`.

## 2. Dirty Dozen Adversarial Payloads
1. **Unauthenticated Unit Price Tampering**: Unauthenticated `update` on `/units/A01` changing `basePrice`. -> `PERMISSION_DENIED`
2. **Email Spoofing Attack**: Signed-in user with `email: 'kritin.prom@gmail.com'` but `email_verified: false` attempting `create` on `/loanApplications/app_1`. -> `PERMISSION_DENIED`
3. **PII Blanket Read/List**: Signed-in non-admin user attempting `list` on `/loanApplications`. -> `PERMISSION_DENIED`
4. **Lookup Scraping Attempt**: Unauthenticated or signed-in user attempting `list` on `/loanLookups`. -> `PERMISSION_DENIED`
5. **Shadow Field Injection on Create**: Admin creating `/units/A01` with extra ghost field `isFree: true`. -> `PERMISSION_DENIED`
6. **Shadow Field Injection on Customer Update**: Customer updating `overallStatus` or `approvedAmount` on their own `/loanApplications/{appId}` instead of allowed LINE/PIN fields. -> `PERMISSION_DENIED`
7. **Orphaned Loan Application**: Admin creating `/loanApplications/app_99` with nonexistent `unitId: 'FAKE999'`. -> `PERMISSION_DENIED`
8. **ID Poisoning / Oversized String**: Attempt to `create` `/units/<1500-char-id>` or pass `remark` > 500 chars. -> `PERMISSION_DENIED`
9. **Timestamp Forgery**: Admin creating `/loanApplications/app_1` with backdated `createdAt` (`!= request.time`). -> `PERMISSION_DENIED`
10. **Immortal Field Mutation**: Updating `createdAt` or `customerUid` via customer update path. -> `PERMISSION_DENIED`
11. **Unbounded Array Injection**: Admin writing `timeline` with 25 entries (`> 20`). -> `PERMISSION_DENIED`
12. **LineLog Tampering**: Any user or admin attempting `update` or `delete` on `/lineLogs/{logId}`. -> `PERMISSION_DENIED`
