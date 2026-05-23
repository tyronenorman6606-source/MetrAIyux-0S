-- v11: Store client communication email and SkyEmail contact fields.
-- Runtime bootstrap in netlify/functions/_lib/db.js applies these automatically.

alter table customers add column if not exists communication_email text;
alter table customers add column if not exists skyemail text;

alter table users add column if not exists communication_email text;
alter table users add column if not exists skyemail text;
