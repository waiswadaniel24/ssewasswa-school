# EMIS → Database Mapping (Draft)

This document maps the application's database tables to common Ugandan MoES EMIS data elements. Use this as a starting point for export and validation.

Note: This is a draft. Confirm exact MoES field names and code lists before automated submission.

## School / Institution
- Table: `school_registration`
  - school_name -> School name
  - emis_number -> EMIS number
  - uneb_center_number -> UNEB center number
  - school_type -> Public/Private
  - school_level -> Primary/Secondary/Nursery
  - gps_latitude, gps_longitude -> Coordinates
  - district_name / county_name / sub_county_name / parish_name / village -> Location hierarchy

## Academic Years
- Table: `academic_years`
  - year_name, is_current

## Pupils / Students
- Table: `students`
  - id -> internal id
  - admission_number -> Admission no (unique identifier per school)
  - emis_student_id -> National pupil id (if available)
  - nin -> National ID
  - first_name / last_name / other_name
  - gender
  - date_of_birth
  - class_id -> link to `classes` (class name and level)
  - status -> Active/Left/Transferred/Dropout
  - dropout_reason / transfer_date

## Enrollment
- Table: `student_enrollment`
  - student_id, class_id, academic_year_id, term, enrollment_status, enrollment_date
  - Use this for per-term EMIS returns.

## Teachers / Staff
- Table: `staff`
  - id
  - first_name, last_name
  - role -> Teacher/Bursar/Admin
  - tsc_number -> Teacher Service Commission registration
  - highest_qualification, years_experience
  - salary, bank_account, momo_number

## Infrastructure & WASH
- Table: `infrastructure`
  - classrooms_permanent, classrooms_semi_permanent, classrooms_temporary
  - has_electricity, has_internet, has_computer_lab, number_of_computers
- Table: `wash_data`
  - drinking_water_available, handwashing_stations, handwashing_with_soap, menstrual_hygiene

## Examinations / UNEB
- Table: `uneb_candidates`
  - student_id, exam_type, academic_year_id, center_number, candidate_number, registration_status
  - Map to UNEB registration exports and validation rules.

## School Finances (EMIS)
- Table: `school_finances_emis`
  - academic_year_id, term
  - upe_grant, use_grant, school_fees_collected, other_income
  - expenditure_instructional, expenditure_administration, expenditure_development

## Special Needs / OVC
- Table: `special_needs_learners`
- Table: `ovc_data`

## Books / Textbooks
- Table: `textbooks`
  - subject_id, class_id, books_received, books_available

## Other useful tables
- `attendance`, `marks`, `payments`, `fees_structure`, `payment_transactions`, `dropout_records`, `student_documents`, `parent_profiles`

## Next steps
- Confirm MoES EMIS field names and export templates (CSV/JSON).  
- Create a centralized EMIS export module that consumes the above tables and emits MoES-compliant files with validation.  
- Implement automated data validation rules (age ranges, mandatory fields, counts by sex, PTR/PCR calculations) using the mapping above.
