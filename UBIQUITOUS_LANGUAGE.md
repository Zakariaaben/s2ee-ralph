# Ubiquitous Language

## Event model

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Fair** | The single campus recruiting event managed by this system. | Event, salon, edition |
| **Single-event system** | A product model that handles exactly one fair instance per database. | Multi-edition fair, recurring event model |
| **Room** | A named physical area in the school used to host company stands. | Hall, zone, area |
| **Stand** | The numbered location assigned to a company inside a room. | Booth, desk, spot |
| **Placement** | The assignment of one company to one room and one stand. | Location assignment, map slot |
| **Arrival Status** | The operational state that says whether a company has arrived on site. | Presence, check-in state |
| **Not Arrived** | The arrival status for a company that has not yet checked in on site. | Absent, pending |
| **Arrived** | The arrival status for a company that has been checked in on site. | Present, checked |

## People and identities

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **User** | An authentication identity in the system. | Account holder, actor |
| **Role** | The authorization category assigned to a user. | Permission set, profile |
| **Admin** | A user role with global visibility and management access across the fair. | Superuser, organizer |
| **Student** | A participant who onboards once and owns one or more CV Profiles. | Candidate, attendee |
| **Company** | An organization participating in the fair. | Employer account, recruiter team |
| **Company Account** | The single authenticated user identity used by a company organization. | Company, recruiter login |
| **Recruiter** | A named company-side person who may conduct interviews under a Company Account. | Interviewer, company user |
| **Recruiter Roster** | The list of recruiters maintained by a company for the fair. | Recruiter list, interviewer list |
| **Check-in Staff** | A user role that updates company arrival status on site. | Check-in, arrival agent |

## Student materials

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Student Onboarding** | The one-time capture of student information before CV Profile upload. | Student profile setup, registration form |
| **CV Profile** | A student-owned professional variant used as the unit reviewed during interviews. | CV, profile, resume variant |
| **CV Profile Type** | The controlled classification that describes the intent of a CV Profile. | Track, category, orientation |
| **CV File** | The uploaded file attached to a CV Profile. | Resume, attachment, blob |
| **Immutable CV File** | A rule stating that a CV File cannot be edited in place after upload. | Editable CV, updated file |
| **Delete-and-Reupload** | The replacement flow where a CV Profile file is removed and uploaded again instead of edited. | Update file, overwrite |
| **Student QR** | The QR-backed student identity presented at a stand to open the student context. | Student code, badge QR, profile QR |

## Interview workflow

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Interview** | A company evaluation record linked to one Company and one CV Profile. | Meeting, screening record |
| **Interview Entry** | The act of opening interview context by scanning a Student QR at a stand. | Candidate search, browse flow |
| **Interview Status** | The lifecycle state of an interview record. | Result, state |
| **Completed Interview** | An interview that was finished with evaluation data recorded. | Finalized note, done session |
| **Cancelled Interview** | An interview that was started but not completed. | Failed interview, rejected interview |
| **Recruiter Snapshot** | The recruiter name copied into the interview record at completion time. | Live recruiter reference, mutable interviewer |
| **Global Score** | The decimal score from 1 to 5 assigned to an interview. | Rating, note, mark |
| **Global Tag** | A predefined tag available to all companies during interview evaluation. | Shared label, default criterion |
| **Company Tag** | A company-specific tag created and used only by one company. | Custom tag, private criterion |

## Access and outputs

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Company Scope** | The rule that company-visible data is limited to that company’s own records. | Tenant boundary, private view |
| **Completed Interview Ledger** | The company-visible list of interviews completed by that company. | Interview history, company archive |
| **Company Export** | A company-scoped export of its interview data, optionally with CV Files. | Data dump, full export |
| **Admin Oversight** | The global operational view across companies, arrival states, and interviews. | Dashboard, analytics |

## Relationships

- A **Fair** contains many **Rooms**.
- A **Room** contains many **Stands**.
- A **Company** has exactly one **Company Account** in the first version.
- A **Company** has one **Recruiter Roster** containing many **Recruiters**.
- A **Company** has exactly one **Placement** at a time: one **Room** and one **Stand**.
- A **Company** has one current **Arrival Status**.
- A **Student** has exactly one **Student Onboarding** record.
- A **Student** owns many **CV Profiles**.
- A **CV Profile** has exactly one **CV Profile Type** and one current **CV File**.
- A **Student** presents one **Student QR** that resolves to that student identity.
- An **Interview** belongs to exactly one **Company** and exactly one **CV Profile**.
- An **Interview** stores one **Recruiter Snapshot** when it is completed.
- An **Interview** may have many **Global Tags** and many **Company Tags**.
- A **Company Export** includes only data within that company’s **Company Scope**.

## Example dialogue

> **Dev:** "When a **Recruiter** scans a **Student QR**, do they open the whole student record or a specific **CV Profile** directly?"
> **Domain expert:** "They open the **Student** context first, then choose the right **CV Profile** for that interview."
> **Dev:** "And the **Interview** belongs to that chosen **CV Profile**, not just the **Student**?"
> **Domain expert:** "Exactly. The **Student** owns many **CV Profiles**, but the **Interview** targets one specific profile."
> **Dev:** "If the recruiter list changes later, do past interviews still keep who performed them?"
> **Domain expert:** "Yes. Each completed **Interview** keeps a **Recruiter Snapshot**, so attribution does not depend on the current **Recruiter Roster**."

## Flagged ambiguities

- "company" was used for both the participating organization and the authenticated login. Use **Company** for the organization and **Company Account** for the single login identity.
- "company user" and "recruiter" were used interchangeably. Use **Recruiter** for the named person conducting interviews; avoid "company user" unless you specifically mean the authenticated **Company Account**.
- "CV", "profile", and "student profile" were used for overlapping concepts. Use **CV Profile** for the interviewable professional variant, **CV File** for the uploaded file, and **Student** for the person record.
- "event", "salon", and "edition" were all mentioned. Use **Fair** as the canonical business term, and avoid **Edition** because the system intentionally does not model multiple editions.
- "map" can mean either the backend location model or a frontend visualization. Use **Placement**, **Room**, and **Stand** for backend concepts; reserve "map" for a future frontend UX discussion.
- "check-in" can refer to either a role or the action. Use **Check-in Staff** for the role and **arrival update** or **mark arrived** for the action.
