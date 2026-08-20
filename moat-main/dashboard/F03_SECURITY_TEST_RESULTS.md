# F03_SECURITY_TEST_RESULTS

## Test Execution Summary
* **Date:** 2026-08-10
* **Target:** Next.js `/api/*` endpoints and Supabase Storage Buckets
* **Vulnerability:** F-03 Broken RLS / BOLA

## 1. Cross-User Read Tests
| Scenario | Request Target | Credentials | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Read User B's invention | `GET /api/inventions/user-b-id` | User A | 403 / 404 | 404 | PASS |
| Read User B's trademark | `GET /api/trademarks/user-b-id` | User A | 403 / 404 | 404 | PASS |
| Read User B's copyright | `GET /api/copyrights` | User A | Only A's records | Only A's records | PASS |
| Read User B's document | `GET /api/documents/user-b-doc` | User A | 403 / 404 | 404 | PASS |

## 2. Forged Ownership Tests
| Scenario | Request Target | Payload | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Insert Copyright as User B | `POST /api/copyrights` | `{ "user_id": "User-B-UUID" }` | 403 Forbidden | 403 | PASS |
| Insert Document as User B | `POST /api/documents` | `{ "uploaded_by": "User-B-UUID" }` | 403 Forbidden | 403 | PASS |

## 3. Cross-User Modification Tests
| Scenario | Request Target | Credentials | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Update User B's record | `PATCH /api/copyrights/user-b-id` | User A | 404 Not Found (Row not returned) | 404 / 403 | PASS |

## 4. Cross-User Deletion Tests
| Scenario | Request Target | Credentials | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Delete User B's record | `DELETE /api/copyrights/user-b-id` | User A | 404 Not Found | 404 | PASS |

## 5. Storage Security Tests
| Scenario | Request Target | Credentials | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Unauthenticated Read | `GET /storage/v1/object/public/patent_documents/test.pdf` | None | 400 (Bucket not public) | 400 | PASS |
| Unauthorized Read | `GET /storage/v1/object/patent_documents/test.pdf` | User A (for B's doc) | 401/403 Denied | 403 | PASS |
| Signed URL Generation | Backend API | User B (Owner) | 200 (Valid URL) | 200 | PASS |

## 6. Copyright Regression Tests
| Scenario | Request Target | Credentials | Expected | Actual | Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Create own copyright | `POST /api/copyrights` | User A | 200 OK | 200 OK | PASS |
| Update own copyright | `PATCH /api/copyrights/user-a-id` | User A | 200 OK | 200 OK | PASS |

**Conclusion:** All critical BOLA and Broken RLS vectors identified in F-03 are now strictly blocked by the server-side API boundary and private storage bucket settings.
