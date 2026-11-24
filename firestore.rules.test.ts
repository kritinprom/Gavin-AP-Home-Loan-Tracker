/**
 * Security Rules Verification Spec (Dirty Dozen Adversarial Suite)
 * Run against Firebase Emulator Suite when testing locally with @firebase/rules-unit-testing.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  rationale: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Unit Price Tampering',
    collection: '/units/A01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Requires verified admin identity and strict Unit schema validation.',
  },
  {
    id: 2,
    name: 'Unverified Admin Email Spoofing',
    collection: '/loanApplications/app_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isAdmin() mandates request.auth.token.email_verified == true.',
  },
  {
    id: 3,
    name: 'PII Blanket List on loanApplications',
    collection: '/loanApplications',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'allow list strictly requires isAdmin().',
  },
  {
    id: 4,
    name: 'Lookup Index Enumeration / Scraping',
    collection: '/loanLookups',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'allow list is strictly false on /loanLookups.',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Unit Create',
    collection: '/units/A01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'hasOnly() rejects undeclared shadow properties.',
  },
  {
    id: 6,
    name: 'Public Unauthenticated Loan Application Read',
    collection: '/loanApplications/app_01',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    rationale: 'Raw PII in loanApplications is strictly restricted to isAdmin().',
  },
  {
    id: 7,
    name: 'Orphaned Loan Application Creation',
    collection: '/loanApplications/app_orphan',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'exists() enforces valid /units/{unitId} parent reference.',
  },
  {
    id: 8,
    name: 'Path Variable ID Poisoning',
    collection: '/units/' + 'A'.repeat(200),
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidId() restricts document IDs to <= 128 chars matching ^[a-zA-Z0-9_-]+$.',
  },
  {
    id: 9,
    name: 'Server Timestamp Forgery',
    collection: '/loanApplications/app_01',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'createdAt and updatedAt must strictly equal request.time.',
  },
  {
    id: 10,
    name: 'Immutable createdAt Modification',
    collection: '/loanApplications/app_01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'incoming().createdAt == existing().createdAt is enforced on all updates.',
  },
  {
    id: 11,
    name: 'Unbounded Timeline Array Exhaustion',
    collection: '/loanApplications/app_01',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidLoanApplication() caps timeline.size() <= 20.',
  },
  {
    id: 12,
    name: 'Unauthenticated Lookup Index Tampering',
    collection: '/loanLookups/' + 'a'.repeat(64),
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Only isAdmin() can create, update, or delete /loanLookups documents.',
  },
];
