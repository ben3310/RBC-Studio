-- Synthetic local-only seed. No customer, inventory, account, or credential data.
-- Applied only by an explicitly invoked local Supabase reset.

insert into app_organizations (id, name, slug, default_timezone)
values (
  '00000000-0000-4000-8000-000000000001',
  'RBC Local Test',
  'rbc-local-test',
  'Asia/Kuala_Lumpur'
)
on conflict (id) do nothing;

insert into app_pieces (
  id, organization_id, archive_no, internal_name, public_name,
  status, price_amount_minor, price_currency, price_mode
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000001',
    'LOCAL-001',
    'Synthetic fixed-price piece',
    'Synthetic archive piece',
    'draft',
    100000,
    'USD',
    'fixed'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000001',
    'LOCAL-002',
    'Synthetic POA piece',
    'Synthetic private-offer piece',
    'draft',
    null,
    null,
    'on_request'
  )
on conflict (id) do nothing;

insert into app_campaigns (
  id, organization_id, piece_id, title, objective, story_angle,
  campaign_date, target_region, spelling_mode
)
values (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000101',
  'Synthetic local campaign',
  'drop',
  'detail',
  '2026-07-22',
  'follow_the_sun',
  'american'
)
on conflict (id) do nothing;

insert into app_destinations (
  id, organization_id, code, label, platform, kind,
  manual_only, requires_approval, requires_ai_disclosure
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000001',
    'flagship',
    'Rare Bag Club',
    'instagram',
    'flagship',
    true,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000001',
    'education',
    'Archive Notes',
    'instagram',
    'satellite',
    false,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000001',
    'aesthetic',
    'Object Study',
    'instagram',
    'satellite',
    false,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000001',
    'era',
    'Era Index',
    'instagram',
    'satellite',
    false,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000001',
    'pinterest',
    'Pinterest',
    'pinterest',
    'directory',
    false,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000306',
    '00000000-0000-4000-8000-000000000001',
    'blog',
    'Archive Journal',
    'web',
    'archive',
    false,
    true,
    false
  )
on conflict (id) do nothing;

