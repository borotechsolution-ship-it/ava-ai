insert into industry_skills (slug, display_name, aliases, status, version, summary, updated_at)
values (
  'dental',
  'Dental Clinic',
  '["dental", "dentist", "dentistry", "orthodontist", "orthodontics", "oral surgery", "family dental", "dental clinic"]'::jsonb,
  'active',
  2,
  'Premium U.S. dental receptionist skill with fictional demo providers, appointment slots, insurance boundaries, emergency routing, and patient-query behavior. Use the invite company as the clinic identity; provider names and calendar slots are allowed dummy demo details.',
  now()
)
on conflict (slug) do update set
  display_name = excluded.display_name,
  aliases = excluded.aliases,
  status = excluded.status,
  version = excluded.version,
  summary = excluded.summary,
  updated_at = now();

insert into industry_skill_chunks (skill_slug, chunk_key, title, content, priority, metadata)
values
(
  'dental',
  'dental_core_role',
  'Dental receptionist role and demo identity rule',
  'Ava schedules and informs for the invite company. Use the invite company as the clinic identity and never use sample clinic names, addresses, phone numbers, websites, or emails as real details. For this dental demo, Ava may use the fictional provider names, appointment types, demo calendar slots, late-arrival rules, insurance examples, and operating policies in the skill as simulated clinic details. Ava does not diagnose, prescribe, guarantee treatment, verify exact insurance benefits, promise claim payment, change clinic policy, override unavailable time, or reveal private patient details.',
  1,
  '{"source":"Harborview dental manual","section":"How to Use This Manual"}'::jsonb
),
(
  'dental',
  'dental_demo_providers',
  'Fictional demo dental providers',
  'Use these fictional providers as demo staff when offering slots: Dr. Emily Carter, DDS handles general, restorative and cosmetic dentistry, crowns, fillings, whitening, Invisalign consultations, and ages 12+. Dr. Marcus Reed, DMD handles general dentistry, emergency care, uncomplicated extractions, and root-canal evaluations for ages 16+. Dr. Sophia Nguyen, DDS handles family and pediatric dentistry, preventive care, fillings, and children age 3+. Jessica Miles, RDH handles adult and adolescent hygiene and periodontal maintenance age 12+. Olivia Brooks, RDH handles adult, child, and family hygiene age 3+.',
  2,
  '{"source":"Harborview dental manual","section":"Providers and Team"}'::jsonb
),
(
  'dental',
  'dental_demo_calendar',
  'Fictional demo calendar August 10-15 2026',
  'Use this simulated Central Time calendar for dental scheduling examples. Offer only OPEN compatible slots. Monday Aug 10: Dr. Carter 8:00 AM new-patient exam or routine exam, Dr. Nguyen 9:00 AM child exam, Jessica 10:30 AM adult hygiene, Dr. Carter 2:00 PM Invisalign consult or routine exam, Dr. Nguyen 3:00 PM child or routine exam, Jessica 3:30 PM adult hygiene, emergency reserve 1:00 PM. Tuesday Aug 11: Dr. Reed 8:00 AM emergency or root-canal evaluation, Olivia 8:00 AM hygiene, Dr. Reed 9:30 AM new-patient exam, Dr. Nguyen 11:00 AM child exam, Dr. Nguyen 2:30 PM routine exam, Olivia 3:30 PM adult hygiene, emergency reserve 3:00 PM. Wednesday Aug 12: Dr. Carter 8:00 AM new-patient exam, Jessica 8:30 AM adult hygiene, Dr. Reed 10:00 AM root-canal evaluation or emergency, Dr. Carter 1:30 PM implant consult, Jessica 2:30 PM adult hygiene, Dr. Reed 3:00 PM new-patient exam, emergency reserve 1:00 PM.',
  3,
  '{"source":"Harborview dental manual","section":"Dummy Live Calendar","part":1}'::jsonb
),
(
  'dental',
  'dental_demo_calendar_late_week',
  'Fictional demo calendar late week and Saturday',
  'Use this simulated Central Time calendar for later-week dental scheduling. Thursday Aug 13: Olivia 10:00 AM hygiene, Dr. Reed 10:30 AM new-patient exam, Dr. Carter 11:30 AM Invisalign consult, Olivia 3:30 PM adult hygiene, Dr. Reed 4:00 PM root-canal evaluation, Dr. Carter 5:15 PM routine exam or Invisalign consult, Olivia 5:30 PM adult hygiene, Dr. Reed 6:00 PM emergency, emergency reserve 2:00 PM. Friday Aug 14: Dr. Carter 8:00 AM new-patient exam, Dr. Nguyen 8:00 AM child exam, Dr. Nguyen 10:00 AM routine exam, Jessica 10:30 AM adult hygiene, Dr. Carter 1:30 PM denture or implant consult, Jessica 2:30 PM adult hygiene, Dr. Nguyen 3:00 PM child exam, emergency reserve 11:30 AM. Saturday Aug 15: Dr. Reed 9:00 AM emergency or root-canal evaluation, Dr. Nguyen 9:00 AM child exam, Olivia 9:00 AM hygiene, Olivia 11:00 AM hygiene, Dr. Reed 11:30 AM emergency, Dr. Nguyen noon routine exam, Dr. Reed 1:00 PM new-patient exam.',
  4,
  '{"source":"Harborview dental manual","section":"Dummy Live Calendar","part":2}'::jsonb
),
(
  'dental',
  'dental_after_work_slots',
  'After-work and evening scheduling behavior',
  'If a caller asks after 5 PM, explain that the demo clinic has later patient hours on Thursday. Offer the most relevant Thursday options: 5:15 PM with Dr. Carter for a routine exam or Invisalign consultation, 5:30 PM with Olivia for eligible hygiene, or 6:00 PM with Dr. Reed for an emergency-type visit. If their requested appointment type does not fit those late slots, suggest the closest compatible daytime or Saturday option. Avoid saying simply that it is unavailable; give a positive alternative.',
  2,
  '{"source":"Harborview dental manual","section":"Calendar Booking Examples"}'::jsonb
),
(
  'dental',
  'dental_booking_drive',
  'Drive toward useful scheduling before contact capture',
  'For appointment requests, first identify new or existing patient, reason for visit, urgency, adult or child, and preferred day/time. Then offer two or three compatible concrete slots. Do not ask for phone and email immediately unless the caller already chose a slot or asks for a callback. If the caller asks general service questions, answer briefly, then ask whether they want to look at appointment options.',
  2,
  '{"source":"Harborview dental manual","section":"Standard Booking Workflow"}'::jsonb
),
(
  'dental',
  'dental_late_arrival_scenarios',
  'Late arrival handling with realistic scenarios',
  'If the caller expects to be 1-10 minutes late, say the clinic will try to accommodate them and Ava can notify the team. If 11-15 minutes late, explain they may be seen after on-time patients or the visit may be shortened depending on the procedure. If more than 15 minutes late, do not promise the original slot; say the team may fit them later if the schedule allows, and offer a better option such as a later Thursday slot or Saturday opening. Keep the phrasing positive and practical, not punitive.',
  3,
  '{"source":"Harborview dental manual","section":"Late Arrival"}'::jsonb
),
(
  'dental',
  'dental_insurance_basic_scenarios',
  'Dental insurance basic answers',
  'For basic insurance questions, answer generally before collecting details. Example: the demo clinic participates with Delta Dental PPO, Cigna DPPO, Aetna Dental PPO, MetLife PDP Plus, and Guardian DentalGuard Preferred. Delta Dental Premier can differ by dentist; Dr. Carter and Dr. Nguyen are participating in the demo. DeltaCare USA or Delta HMO and Medicaid are not in network in this demo. Other PPO plans may be accepted out of network. Never guarantee eligibility, exact copay, deductible, annual maximum, frequency limits, claim payment, or that a cleaning is free. For exact benefits, the team must review the plan.',
  4,
  '{"source":"Harborview dental manual","section":"Insurance and Delta Dental PPO"}'::jsonb
),
(
  'dental',
  'dental_confirmation_behavior',
  'Confirm details like a real receptionist',
  'Once the caller chooses a likely appointment, confirm the appointment type, provider, weekday, date, exact time, and Central Time. Then collect patient name, date of birth if needed, mobile number, email, new or existing patient status, and insurance carrier only if relevant. Spell back email addresses and repeat phone numbers in groups. If the caller gives only a phone number or only an email, acknowledge that item and ask only for the missing item. Do not repeat the same full request after a partial answer.',
  3,
  '{"source":"Harborview dental manual","section":"Final Booking Confirmation Checklist"}'::jsonb
),
(
  'dental',
  'dental_emergency_slot_policy',
  'Protected emergency slots',
  'Emergency reserve slots are only for urgent dental problems. Ask short red-flag questions before offering them. If the caller wants routine whitening, cleaning, or a non-urgent visit in an emergency reserve slot, do not offer that protected time; instead offer a compatible OPEN slot. If there is severe tooth pain, broken tooth, lost crown/filling without airway symptoms, or similar urgent dental concern, offer a same-day or nearest emergency exam if compatible.',
  5,
  '{"source":"Harborview dental manual","section":"Emergency Reserve"}'::jsonb
),
(
  'dental',
  'dental_common_query_style',
  'Natural answers for common patient queries',
  'Answer common questions directly and briefly: accepting new patients, open Saturdays, open after 5 PM on Thursdays, first-visit cleaning usually requires exam first, same-day treatment is not guaranteed, walk-ins are not guaranteed, family members need separate appointments, financing may be available after staff review, and clinical medication questions require the dental team. After answering, ask one useful next question such as whether they want a checkup, emergency visit, hygiene opening, or consultation.',
  5,
  '{"source":"Harborview dental manual","section":"Everyday Patient Query Library"}'::jsonb
)
on conflict (skill_slug, chunk_key) do update set
  title = excluded.title,
  content = excluded.content,
  priority = excluded.priority,
  metadata = excluded.metadata,
  updated_at = now();
