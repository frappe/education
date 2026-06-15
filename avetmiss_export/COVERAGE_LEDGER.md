# AVETMISS 8.0 → Frappe Education coverage ledger

**Target:** National VET Provider Collection, AVETMISS release 8.0, validated in NCVER AVS
against the 2019 Jan–Mar sample period. National files only, registered-RTO direct-to-NCVER.
**Authority:** every position/length/type below is from `/reference` (collection spec 8.0);
code values are traced to the Data Element Definitions 2.x in the writer phase, not from memory.
**Golden files:** `/tests/fixtures/nat000*.txt`. Where a fixture width disagrees with the
spec's "national" record length, the **fixture wins** (it is the AVS sample target) — flagged inline.

### Legend (status)
- `native` — a stock Education/ERPNext field holds it directly (reformat/pad only).
- `derived` — computed from stock fields per a spec/DED rule (no new storage).
- `custom` — no stock home; add a custom field (⚙) or custom doctype (⊕).
- `const` — fixed/blank for national NCVER reporting (space-filled to width).

### Global format rules
- **Line terminator:** every record ends with CRLF (`\r\n`) — confirmed by measuring the fixtures.
- **Native rows verified** (2026-06-15) against live `get_meta` for Student / Program / Course /
  Course Enrollment / Program Enrollment. All native claims resolve **except `salutation`**, which
  does not exist on Student → NAT00085 *Client title* is `const`-blank. See `nat-field-positions.md`
  memory for the A/N/D justify-and-pad rules.

### Record-width reconciliation (widths settled by measurement, not assumption)
| File | Spec national | Fixture | Writer target | Note |
|---|---|---|---|---|
| NAT00010 | 448 (id+name+contact; 111–268 supplement block blank) | 448 | 448 | contact/tel/fax/email blank for NCVER |
| NAT00020 | 180 | 180 | 180 | |
| NAT00030 | 130 (id+name+nom hrs; 115–130 blank) | 130 | 130 | |
| NAT00060 | 123 | 123 | 123 | |
| NAT00080 | 327 (RTO) / 347 (STA) | **347** | 347 | width 347; SA1(328-338)+SA2(339-347) measured all-spaces → const |
| NAT00085 | 557 | 557 | 557 | |
| NAT00090 | 12 | 12 | 12 | only when client disability flag = Y |
| NAT00100 | 13 | 13 | 13 | only when client prior-ed flag = Y |
| NAT00120 | 111 | 111 | 111 | fields after pos 111 are STA-only, omitted |
| NAT00130 | 39 (RTO) / 72 (STA) | **72** | 72 | width 72; parchment date(40-47)+number(48-72) measured all-spaces → const |

---

## NAT00010 — Training organisation  (width 448)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Training organisation identifier | 1 | 10 | A | AVETMISS Settings.rto_identifier | custom ⊕ |
| 2 | Training organisation name | 11 | 100 | A | AVETMISS Settings.rto_name (or Company.company_name) | custom ⊕ |
| – | non-TGA supplement block (NAT00010A) | 111 | 158 | A | blank for registered RTOs | const |
| 3 | Contact name | 269 | 60 | A | blank (NCVER) | const |
| 4 | Telephone number | 329 | 20 | A | blank (NCVER) | const |
| 5 | Facsimile number | 349 | 20 | A | blank (NCVER) | const |
| 6 | Email address | 369 | 80 | A | blank (NCVER) | const |

## NAT00020 — Training delivery location  (width 180)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Training organisation identifier | 1 | 10 | A | AVETMISS Settings.rto_identifier | derived |
| 2 | Delivery location identifier | 11 | 10 | A | Training Delivery Location.location_identifier | custom ⊕ |
| 3 | Delivery location name | 21 | 100 | A | Training Delivery Location.location_name | custom ⊕ |
| 4 | Postcode | 121 | 4 | A | Training Delivery Location.postcode | custom ⊕ |
| 5 | State identifier | 125 | 2 | A | Training Delivery Location.state_identifier | custom ⊕ |
| 6 | Address — suburb/locality/town | 127 | 50 | A | Training Delivery Location.suburb | custom ⊕ |
| 7 | Country identifier | 177 | 4 | A | Training Delivery Location.country_identifier | custom ⊕ |

→ **New doctype `Training Delivery Location`** (companion app). No stock equivalent.

## NAT00030 — Program  (width 130)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Program identifier | 1 | 10 | A | Program.avetmiss_program_identifier | custom ⚙ |
| 2 | Program name | 11 | 100 | A | Program.program_name | native |
| 3 | Nominal hours | 111 | 4 | N | Program.avetmiss_nominal_hours | custom ⚙ |
| – | non-TGA supplement block (NAT00030A) | 115 | 16 | A | blank for recognised programs | const |

## NAT00060 — Subject  (width 123)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Subject identifier | 1 | 12 | A | Course.avetmiss_subject_identifier | custom ⚙ |
| 2 | Subject name | 13 | 100 | A | Course.course_name | native |
| 3 | Subject field of education identifier | 113 | 6 | A | Course.avetmiss_field_of_education_id | custom ⚙ |
| 4 | VET flag | 119 | 1 | A | Course.avetmiss_vet_flag | custom ⚙ |
| 5 | Nominal hours | 120 | 4 | N | Course.avetmiss_nominal_hours | custom ⚙ |

## NAT00080 — Client  (width 347; fixture carries STA width, SA1/SA2 blank)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Client identifier | 1 | 10 | A | Student.avetmiss_client_identifier | custom ⚙ |
| 2 | Name for encryption | 11 | 60 | A | derived from name fields (DED format) | derived |
| 3 | Highest school level completed id | 71 | 2 | A | Student.avetmiss_highest_school_level | custom ⚙ |
| 4 | Gender | 73 | 1 | A | map Student.gender → AVETMISS code | derived/⚙ |
| 5 | Date of birth | 74 | 8 | A | Student.date_of_birth (DDMMYYYY) | native |
| 6 | Postcode | 82 | 4 | A | Student.pincode | native |
| 7 | Indigenous status identifier | 86 | 1 | A | Student.avetmiss_indigenous_status | custom ⚙ |
| 8 | Language identifier | 87 | 4 | A | Student.avetmiss_language_id | custom ⚙ |
| 9 | Labour force status identifier | 91 | 2 | A | Student.avetmiss_labour_force_status | custom ⚙ |
| 10 | Country identifier | 93 | 4 | A | Student.avetmiss_country_of_birth_id | custom ⚙ |
| 11 | Disability flag | 97 | 1 | A | Student.avetmiss_disability_flag | custom ⚙ |
| 12 | Prior educational achievement flag | 98 | 1 | A | Student.avetmiss_prior_ed_flag | custom ⚙ |
| 13 | At school flag | 99 | 1 | A | Student.avetmiss_at_school_flag | custom ⚙ |
| 14 | Address — suburb/locality/town | 100 | 50 | A | Student.city | native |
| 15 | Unique student identifier | 150 | 10 | A | Student.avetmiss_usi | custom ⚙ |
| 16 | State identifier | 160 | 2 | A | map Student.state → AVETMISS code | derived/⚙ |
| 17 | Address building/property name | 162 | 50 | A | Student.avetmiss_addr_building | custom ⚙ |
| 18 | Address flat/unit details | 212 | 30 | A | Student.avetmiss_addr_flat | custom ⚙ |
| 19 | Address street number | 242 | 15 | A | Student.avetmiss_addr_street_no | custom ⚙ |
| 20 | Address street name | 257 | 70 | A | Student.avetmiss_addr_street_name | custom ⚙ |
| 21 | Survey contact status | 327 | 1 | A | Student.avetmiss_survey_contact_status | custom ⚙ |
| 22 | Statistical area level 1 identifier | 328 | 11 | A | blank, space-filled (STA-only; absent for RTOs) | const |
| 23 | Statistical area level 2 identifier | 339 | 9 | A | blank, space-filled (STA-only; absent for RTOs) | const |

Stock Student stores address as flat `address_line_1/2` (verified: `city`, `pincode`, `state` exist
natively); AVETMISS needs the street split into building/flat/street-no/street-name → custom fields.

## NAT00085 — Client contact details  (width 557)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Client identifier | 1 | 10 | A | Student.avetmiss_client_identifier | custom ⚙ |
| 2 | Client title | 11 | 4 | A | blank — no native salutation (verified MISS); optional for NCVER | const |
| 3 | Client first given name | 15 | 40 | A | Student.first_name | native |
| 4 | Client family name | 55 | 40 | A | Student.last_name | native |
| 5 | Address building/property name | 95 | 50 | A | Student.avetmiss_addr_building | custom ⚙ |
| 6 | Address flat/unit details | 145 | 30 | A | Student.avetmiss_addr_flat | custom ⚙ |
| 7 | Address street number | 175 | 15 | A | Student.avetmiss_addr_street_no | custom ⚙ |
| 8 | Address street name | 190 | 70 | A | Student.avetmiss_addr_street_name | custom ⚙ |
| 9 | Address postal delivery box | 260 | 22 | A | Student.avetmiss_addr_postal_box | custom ⚙ |
| 10 | Address — suburb/locality/town | 282 | 50 | A | Student.city | native |
| 11 | Postcode | 332 | 4 | A | Student.pincode | native |
| 12 | State identifier | 336 | 2 | A | map Student.state → AVETMISS code | derived/⚙ |
| 13 | Telephone number [home] | 338 | 20 | A | Student.avetmiss_phone_home | custom ⚙ |
| 14 | Telephone number [work] | 358 | 20 | A | Student.avetmiss_phone_work | custom ⚙ |
| 15 | Telephone number [mobile] | 378 | 20 | A | Student.student_mobile_number | native |
| 16 | Email address | 398 | 80 | A | Student.student_email_id | native |
| 17 | Email address [alternative] | 478 | 80 | A | blank (optional for NCVER) | const |

## NAT00090 — Disability  (width 12; only when disability flag = Y)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Client identifier | 1 | 10 | A | Student.avetmiss_client_identifier | custom ⚙ |
| 2 | Disability type identifier | 11 | 2 | A | Student Disability.disability_type | custom ⊕ |

→ **New child doctype `Student Disability`** on Student (one row per disability type).

## NAT00100 — Prior educational achievement  (width 13; only when prior-ed flag = Y)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Client identifier | 1 | 10 | A | Student.avetmiss_client_identifier | custom ⚙ |
| 2 | Prior educational achievement identifier | 11 | 3 | A | Student Prior Achievement.achievement_id | custom ⊕ |

→ **New child doctype `Student Prior Achievement`** on Student.

## NAT00120 — Training activity  (width 111; THE CONTROLLER, one row per Course Enrollment)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Training organisation identifier | 1 | 10 | A | AVETMISS Settings.rto_identifier | derived |
| 2 | Delivery location identifier | 11 | 10 | A | Course Enrollment.avetmiss_delivery_location | custom ⚙ |
| 3 | Client identifier | 21 | 10 | A | Student.avetmiss_client_identifier (via enrollment) | derived |
| 4 | Subject identifier | 31 | 12 | A | Course.avetmiss_subject_identifier (via enrollment) | derived |
| 5 | Program identifier | 43 | 10 | A | Program.avetmiss_program_identifier (via enrollment) | derived |
| 6 | Activity start date | 53 | 8 | D | Course Enrollment.avetmiss_activity_start_date | custom ⚙ |
| 7 | Activity end date | 61 | 8 | D | Course Enrollment.avetmiss_activity_end_date | custom ⚙ |
| 8 | Delivery mode identifier | 69 | 3 | A | Course Enrollment.avetmiss_delivery_mode | custom ⚙ |
| 9 | Outcome identifier — national | 72 | 2 | A | Course Enrollment.avetmiss_outcome_national | custom ⚙ |
| 10 | Funding source — national | 74 | 2 | A | Course Enrollment.avetmiss_funding_source_national | custom ⚙ |
| 11 | Commencing program identifier | 76 | 1 | A | Course Enrollment.avetmiss_commencing_program | custom ⚙ |
| 12 | Training contract identifier | 77 | 10 | A | Course Enrollment.avetmiss_training_contract_id | custom ⚙ |
| 13 | Client identifier — apprenticeships | 87 | 10 | A | Course Enrollment.avetmiss_apprentice_client_id | custom ⚙ |
| 14 | Study reason identifier | 97 | 2 | A | Course Enrollment.avetmiss_study_reason | custom ⚙ |
| 15 | VET in schools flag | 99 | 1 | A | Course Enrollment.avetmiss_vet_in_schools | custom ⚙ |
| 16 | Specific funding identifier | 100 | 10 | A | Course Enrollment.avetmiss_specific_funding_id | custom ⚙ |
| 17 | School type identifier | 110 | 2 | A | Course Enrollment.avetmiss_school_type | custom ⚙ |

Stock Course Enrollment holds only program/course/student/enrollment_date (all verified native).
All activity attributes (mode, outcome, funding, dates, apprenticeship, study reason) are custom.

## NAT00130 — Program completed  (width 72; fixture carries STA width, parchment blank)
| # | Field | Pos | Len | Type | Source | Status |
|---|---|---|---|---|---|---|
| 1 | Training organisation identifier | 1 | 10 | A | AVETMISS Settings.rto_identifier | derived |
| 2 | Program identifier | 11 | 10 | A | Program.avetmiss_program_identifier | derived |
| 3 | Client identifier | 21 | 10 | A | Student.avetmiss_client_identifier | derived |
| 4 | Date program completed | 31 | 8 | A | Program Enrollment.avetmiss_completion_date | custom ⚙ |
| 5 | Issued flag | 39 | 1 | A | Program Enrollment.avetmiss_issued_flag | custom ⚙ |
| 6 | Parchment issue date | 40 | 8 | D | blank, space-filled (STA-only; absent for RTOs) | const |
| 7 | Parchment number | 48 | 25 | A | blank, space-filled (STA-only; absent for RTOs) | const |

---

## Summary — what we extend

**New doctypes (companion app `avetmiss_export`):**
1. `AVETMISS Settings` (Single) — RTO identifier, RTO name, default delivery location.
2. `Training Delivery Location` — NAT00020 source.
3. `Student Disability` (child of Student) — NAT00090 source.
4. `Student Prior Achievement` (child of Student) — NAT00100 source.

**Custom fields by host doctype:**
- **Student** (18 + 2 child tables): client_identifier, highest_school_level, indigenous_status,
  language_id, labour_force_status, country_of_birth_id, disability_flag, prior_ed_flag,
  at_school_flag, usi, addr_building, addr_flat, addr_street_no, addr_street_name, addr_postal_box,
  survey_contact_status, phone_home, phone_work; child tables `disabilities`, `prior_achievements`.
  (SA1/SA2 and client-title dropped to const-blank; name parts, DOB, mobile, email, city, pincode,
  state confirmed native against live meta.)
- **Program** (2): program_identifier, nominal_hours.
- **Course** (4): subject_identifier, field_of_education_id, vet_flag, nominal_hours.
- **Course Enrollment** (~13): delivery_location, activity_start_date, activity_end_date,
  delivery_mode, outcome_national, funding_source_national, commencing_program,
  training_contract_id, apprentice_client_id, study_reason, vet_in_schools, specific_funding_id,
  school_type.
- **Program Enrollment** (2): completion_date, issued_flag. (parchment issue date/number are
  const-blank space-fill, not stored.)

**Derivations (no new storage):** RTO id propagation, name-for-encryption (DED rule),
gender→code, state→code, date reformatting (Date→DDMMYYYY / D-type), flag rollups.

## Does the model hold?
Yes. Every one of the ~90 distinct AVETMISS fields across the 10 national files resolves to a
native field (verified against live `get_meta`), a derivation, or a defined custom field/doctype.
The Education model already carries the relational spine (Student ↔ Program Enrollment ↔ Course
Enrollment ↔ Program/Course); AVETMISS needs **coded VET attributes** bolted on (outcomes, delivery
modes, funding sources, demographics, USI). None require editing core doctypes — all land as custom
fields + 4 companion doctypes. One open item remains for the writer phase: the exact
**name-for-encryption** format (NAT00080 pos 11–60), which has a defined DED algorithm — a
lookup-and-implement, not a judgment call. Widths are settled by measurement (00080=347, 00130=72,
CRLF); SA1/SA2 and parchment blocks measured all-spaces, now `const`.
