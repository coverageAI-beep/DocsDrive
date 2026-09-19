import { DocumentItem } from '../types';

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'req-01',
    title: 'REQ-101: User Authentication & Role Verification',
    category: 'Requirements',
    status: 'Approved',
    version: 'v2.1',
    author: 'DriveDocs Security Team',
    updatedAt: '2026-09-18',
    summary: 'Specifies email/password authentication, password complexity enforcement (minimum 6 characters), secure session persistence, and Firestore user profile mapping.',
    tags: ['Auth', 'Security', 'P0']
  },
  {
    id: 'req-02',
    title: 'REQ-102: Profile Metadata & Password Modification',
    category: 'Requirements',
    status: 'Approved',
    version: 'v1.4',
    author: 'Identity Core Team',
    updatedAt: '2026-09-17',
    summary: 'Requirements for user profile management in Settings: editable Full Name, read-only immutable Email, and re-authenticated password updates.',
    tags: ['Profile', 'Settings', 'P1']
  },
  {
    id: 'req-03',
    title: 'REQ-103: Automated Password Recovery Email Dispatcher',
    category: 'Requirements',
    status: 'In Review',
    version: 'v1.0',
    author: 'Communication Ops',
    updatedAt: '2026-09-15',
    summary: 'Specifies out-of-band one-time password reset link generation via Firebase Auth and in-app confirmation workflow.',
    tags: ['Auth', 'Email', 'P1']
  },
  {
    id: 'tc-01',
    title: 'TC-201: Email/Password Registration and Firestore Sync',
    category: 'Test Cases',
    status: 'Approved',
    version: 'v3.0',
    author: 'QA Automation',
    updatedAt: '2026-09-18',
    summary: 'Verify user creation succeeds, display name is propagated, and Firestore /users/{uid} document is written with matching uid and email.',
    tags: ['E2E', 'Automated', 'Auth']
  },
  {
    id: 'tc-02',
    title: 'TC-202: Profile Name Modification & Firestore Persistence',
    category: 'Test Cases',
    status: 'Approved',
    version: 'v2.2',
    author: 'QA Automation',
    updatedAt: '2026-09-16',
    summary: 'Verify modifying Full Name in Settings > Profile successfully updates the Firestore record and top bar avatar initials across sessions.',
    tags: ['Functional', 'Settings']
  },
  {
    id: 'tc-03',
    title: 'TC-203: Change Password Re-authentication Validation',
    category: 'Test Cases',
    status: 'In Review',
    version: 'v1.1',
    author: 'Security QA',
    updatedAt: '2026-09-15',
    summary: 'Verify invalid current password triggers auth/invalid-credential rejection and valid current password successfully updates user credentials.',
    tags: ['Security', 'Auth']
  },
  {
    id: 'prd-01',
    title: 'PRD-001: DriveDocs Cloud Document Workspace Specification',
    category: 'PRD',
    status: 'Approved',
    version: 'v3.5',
    author: 'Product Management',
    updatedAt: '2026-09-19',
    summary: 'High-level product requirement document detailing the DriveDocs desktop-first document architecture, unified search, specification navigation, and secure Firebase identity model.',
    tags: ['Architecture', 'Core PRD']
  },
  {
    id: 'prd-02',
    title: 'PRD-002: Real-time Specification Review Workflow',
    category: 'PRD',
    status: 'Draft',
    version: 'v0.8',
    author: 'Product Management',
    updatedAt: '2026-09-14',
    summary: 'Proposed collaboration protocol for peer reviews, status transitions (Draft -> In Review -> Approved), and change audit logs.',
    tags: ['Collaboration', 'Workflow']
  },
  {
    id: 'file-01',
    title: 'System Architecture Diagram & Dataflow (v2.pdf)',
    category: 'Other Files',
    status: 'Approved',
    version: 'v2.0',
    author: 'Chief Architect',
    updatedAt: '2026-09-12',
    summary: 'Vector architectural blueprint showcasing Firebase Authentication, Cloud Firestore document collections, and client state pipelines.',
    tags: ['Architecture', 'Diagram', 'PDF']
  },
  {
    id: 'file-02',
    title: 'DriveDocs UI Design Tokens & Typography Scale',
    category: 'Other Files',
    status: 'Approved',
    version: 'v1.2',
    author: 'Design Systems Lead',
    updatedAt: '2026-09-10',
    summary: 'Color palettes, spacing mathematics, WCAG AA contrast compliance ratios, and Plus Jakarta Sans typographic weights.',
    tags: ['Design', 'Tokens']
  }
];
