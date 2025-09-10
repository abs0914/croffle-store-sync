-- Fix inventory deduction issues by removing duplicate recipe ingredients

-- Remove duplicate Crushed Oreo entries for Oreo Strawberry Blended (keep only the first one)
DELETE FROM recipe_ingredients 
WHERE id IN (
  '28eb443f-1f82-4108-b5e4-092f8c1b631c',
  '383e8354-a4ef-481c-a264-e78e561b8fb6', 
  'e25f34eb-5bef-411e-b466-980d68ae4e3a',
  'c8e4d4dd-eaf5-482b-87a4-9704598425f7',
  '42d31459-9eca-4410-99e0-423ec31c4465',
  '11ee0442-8079-44ea-89e7-e15459b59361',
  'f8fa9028-181f-489e-9756-6aa617615389'
);

-- Remove duplicate Strawberry Syrup entries for Oreo Strawberry Blended (keep only the first one)
DELETE FROM recipe_ingredients
WHERE id IN (
  '9a1e5e12-34cf-44cf-be28-761f2e641264',
  'ffba45a9-e04d-4d5d-8b70-37d921f6376c',
  '9726903a-a92e-4c64-84e7-e9acc87726fc',
  'ac461743-8606-4030-881c-618158fc2815',
  '1cd584b6-4e96-4765-adeb-648e778818bf',
  '280b816a-f76f-456d-9d70-89b8b56e05de',
  '0802ef6b-cb4b-4fed-9359-568df6d3db72'
);

-- Remove duplicate Strawberry Syrup entries for Strawberry Kiss Blended (keep only the first one)
DELETE FROM recipe_ingredients
WHERE id IN (
  'e7b26ef8-8c8f-4010-bec0-abee5dd60c28',
  '631de31d-ad97-4c35-9ca2-60a36ffb3b80',
  'e132a6dc-dc00-4b92-9d50-bbc8f3f4b59b',
  'cc0da3ea-8691-4e4a-a513-09ea580d110c',
  '182c01de-0408-44ec-926f-089066ecc53b',
  '1c20de7d-44f4-4f54-b639-889be2f06846',
  'df0e09b8-05be-4af3-9540-ca26e67038d5'
);

-- Remove duplicate Strawberry Syrup entries for Strawberry Latte (keep only the first one)
DELETE FROM recipe_ingredients
WHERE id IN (
  '2037f2bb-29ad-4c6b-aa3b-ddbc61206a66',
  '291bb3f0-27a6-4006-b9af-ae7eedf4c0e1',
  'd447ac47-896a-4f99-87d7-12da0d028750',
  'b3f1029c-178d-430d-bf22-6a52bd8fa028',
  '83c5a8e2-a579-4b3f-adda-04c30a9c39ae',
  'a96c0ada-2cae-4b94-a217-8378ff356d5f',
  'c77ac385-c7cb-4ec3-97f0-687d8c177bab'
);

-- Verification: Check that we now have only one ingredient per recipe
SELECT 
  r.name as recipe_name,
  ri.ingredient_name,
  ri.quantity,
  ri.unit,
  COUNT(*) as count
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE r.name IN ('Oreo Strawberry Blended', 'Strawberry Kiss Blended', 'Strawberry Latte')
  AND ri.ingredient_name IN ('Crushed Oreo', 'Strawberry Syrup')
GROUP BY r.name, ri.ingredient_name, ri.quantity, ri.unit
ORDER BY r.name, ri.ingredient_name;