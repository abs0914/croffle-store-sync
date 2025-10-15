-- Add KitKat as standalone product (₱10) to all stores
INSERT INTO product_catalog (product_name, price, store_id, category_id, is_available, description, display_order)
VALUES
  ('KitKat Biscuit', 10.00, 'e78ad702-1135-482d-a508-88104e2706cf', '9d122f1e-99be-4146-bdeb-743eeb22eef3', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'b9c95682-895c-488b-a39a-d62d1d2036ff', '499f7cbd-04c6-4933-9c2f-a4904901b4c8', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'f6ce7fa1-7218-46b3-838d-a9e77ccdb0cd', 'ae7322ba-0f62-4c57-8cd0-580643a70609', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'a12a8269-5cbc-4a78-bae0-d6f166e1446d', 'cde1aedf-d794-4cc2-9bc6-6e6a3f2936b9', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'fd45e07e-7832-4f51-b46b-7ef604359b86', '0249f78a-a6dc-4154-9e61-e19ddbb4b412', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'c3bfe728-1550-4f4d-af04-12899f3b276b', '59b28c88-b9f1-4381-bc22-2524fc5a5b48', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, '607c00e4-59ff-4e97-83f7-579409fd1f6a', '37e7931d-3123-4244-a91f-2952f9aca896', true, 'Crispy chocolate wafer biscuit', 1),
  ('KitKat Biscuit', 10.00, 'd7c47e6b-f20a-4543-a6bd-000398f72df5', '8a860f1b-c72f-4b0e-8bd3-906234c99e4d', true, 'Crispy chocolate wafer biscuit', 1);