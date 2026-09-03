UPDATE users
SET locations = '["yakutia","megion","messoyakha","meretoyakha","azs","fuel-depot","plants"]'::jsonb
WHERE role = 'inspector' AND (locations IS NULL OR jsonb_array_length(locations) = 0);