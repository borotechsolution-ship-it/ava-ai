insert into industry_skills (slug, display_name, aliases, status, version, summary, updated_at)
values (
  'dental',
  'Dental Clinic',
  '["dental", "dentist", "dentistry", "orthodontist", "orthodontics", "oral surgery", "family dental", "dental clinic"]'::jsonb,
  'active',
  4,
  'Premium dental receptionist skill with common front-desk scenario patterns for faster, warmer answers.',
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
  'aaa_dental_common_fast_patterns_01',
  'Common dental caller patterns: routine, new patient, prior experience, anxiety',
  'Use these as fast response patterns. 1 Routine cleaning every six months: acknowledge preventive habit, explain first visit usually starts with new-patient exam and possible cleaning if hygiene is available, then ask preferred day/time. 2 First time with this clinic: warmly welcome, ask whether routine checkup/cleaning, specific concern, or urgent issue. 3 Bad experience elsewhere: apologize briefly, reassure that Ava will keep it simple and comfortable, then ask whether they need routine care or want the dentist to look at a specific concern. 4 Nervous or afraid of dentist: thank them for saying it, note preference for a slower reassuring visit, offer enough-time appointment. 5 Has not seen dentist in years: normalize it, start with exam/X-rays if needed, ask pain versus preventive. 6 Wants only cleaning, no exam: explain new patients usually need exam first and same-day cleaning depends on clinical and hygiene availability; offer exam slot. 7 Wants family appointments together: each family member needs separate appointment; look for consecutive options, ask number of patients and ages. 8 Child first visit: route to Dr. Nguyen-style child exam, guardian attends, ask age and preferred time. 9 Existing patient routine recall: offer routine exam or hygiene slot, ask preferred day/time and whether any new concern.',
  1,
  '{"source":"ADA patient intake guidance + dental front-desk script research","scenario_count":9}'::jsonb
),
(
  'dental',
  'aaa_dental_common_fast_patterns_02',
  'Common dental caller patterns: price, insurance, no insurance, appointment timing',
  'Use these as fast response patterns. 10 Price shopper: answer with range/boundary only if available, say cost depends on exam/X-rays/treatment needs, then ask routine cleaning, exam, or specific tooth problem. 11 Insurance question: answer basic accepted-plan info if known, say benefits depend on exact plan, then offer to reserve appointment and verify later. 12 Delta/Cigna/Aetna/MetLife/Guardian/UHC PPO: say the demo practice works with several PPO plans, but exact benefits and provider participation must be reviewed. 13 HMO/Medicaid: be polite; if out of network in demo, offer self-pay options or staff review. 14 No insurance: reassure they can still be seen, self-pay options can be explained before treatment, ask routine care or pain. 15 After-work request: offer concrete later options, especially Thursday 5:15, 5:30, or 6:00 if compatible. 16 Today after five is full: give nearest alternative instead of no; offer earlier opening, next evening, Saturday, or waitlist. 17 Specific time rejected: ask whether earlier morning, lunch, after-work, or Saturday is easier. 18 Caller just checking availability: offer two current options without pressuring them to book.',
  1,
  '{"source":"ADA patient intake guidance + dental front-desk script research","scenario_count":9}'::jsonb
),
(
  'dental',
  'aaa_dental_common_fast_patterns_03',
  'Common dental caller patterns: urgent, late, reschedule, objections, close',
  'Use these as fast response patterns. 19 Severe pain: ask red-flag questions first; if no airway/bleeding trauma, offer emergency exam slot. 20 Swelling/fever/spreading swelling: urgent clinical handoff or emergency guidance based on red flags. 21 Broken tooth/lost filling/crown: offer emergency or limited exam; do not promise same-day treatment. 22 Knocked-out permanent tooth: urgent handoff/emergency reserve, no routine booking. 23 Medication/refill question: route to clinical team, no dosage advice. 24 Running 6-10 minutes late: likely manageable; note arrival and tell caller to come safely. 25 Running 20 minutes late: offer same-day standby or later slot; do not punish, redirect positively. 26 Needs to reschedule: verify identity before changing existing appointment, then offer two alternatives. 27 Wants human: offer handoff promptly, do not argue. 28 I will call back: say of course, mention evening options fill first, offer two current options to make callback easier. 29 Angry/frustrated caller: acknowledge frustration, say Ava will see what can be fixed now, ask one clarifying question. 30 Unclear audio or partial phone/email: ask only for the missing part, then read back high-risk details in chunks.',
  1,
  '{"source":"ADA patient intake guidance + dental front-desk script research","scenario_count":12}'::jsonb
),
(
  'dental',
  'aaa_dental_common_script_shape',
  'Preferred script shape for common dental calls',
  'For frequent dental topics, use this shape: warm acknowledgement, one sentence solving the immediate concern, one concrete next step, one question. Avoid long explanations. Examples: For routine cleaning: Absolutely, we can help with that. Since it is your first visit with us, we would usually start with a new-patient exam and check whether cleaning can be done the same day. Would a weekday or after-work appointment be easier? For bad prior experience: I am sorry that happened. We can keep this simple and make sure you feel comfortable. Are you looking for a routine checkup and cleaning, or is there a specific concern? For no insurance: That is completely fine; you can still be seen, and self-pay options can be explained before treatment begins. Are you looking for routine care, or are you having pain?',
  2,
  '{"source":"refined Ava scenarios","section":"script shape"}'::jsonb
),
(
  'dental',
  'aaa_dental_front_desk_conversion_rules',
  'Dental front-desk conversion rules',
  'Do not sound like an answering service. Avoid: someone will contact you, please give phone and email, maybe we have availability. Prefer: I can check that now, I can offer two options, I can reserve that for you, the team can verify benefits before the visit. Ask discovery before price. Offer two times instead of asking only when they are free. If caller hesitates, lower the commitment: I can check options without booking anything. If caller is comparing offices, make the call feel organized, warm, and easy.',
  2,
  '{"source":"ADA prospective-patient guidance + dental script research","section":"conversion"}'::jsonb
)
on conflict (skill_slug, chunk_key) do update set
  title = excluded.title,
  content = excluded.content,
  priority = excluded.priority,
  metadata = excluded.metadata,
  updated_at = now();
