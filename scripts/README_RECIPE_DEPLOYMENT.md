# Recipe Deployment Scripts

This directory contains scripts for deploying recipe templates and their associated data between stores in the croffle-store-sync system.

## Scripts

### 1. `deployRecipesToNewStores.cjs`

**Purpose**: Deploys all recipe templates from "Sugbo Mercado (IT Park, Cebu)" to specified target stores with complete ingredient mapping and choice group configurations.

**Features**:
- Authenticates using admin credentials
- Fetches all active recipe templates from the system
- Gets recipe template ingredients with choice group configurations
- Maps ingredients to target store inventory automatically
- Creates store-specific recipes with proper ingredient relationships
- Handles duplicate detection (skips existing recipes)
- Creates deployment tracking records
- Provides detailed logging and progress reports
- Supports partial ingredient mapping with warnings

**Usage**:
```bash
node scripts/deployRecipesToNewStores.cjs
```

**What it deploys**:
- Recipe templates (name, description, instructions, pricing)
- Recipe template ingredients with choice groups
- Store-specific recipe records
- Recipe ingredients linked to store inventory
- Deployment tracking records
- Cost calculations based on ingredient mapping

### 2. `verifyRecipeDeployment.cjs`

**Purpose**: Verifies that recipes were successfully deployed and provides detailed analysis of deployment completeness and quality.

**Features**:
- Compares recipe templates with deployed recipes
- Analyzes deployment by category
- Checks ingredient mapping quality
- Reports deployment record statistics
- Identifies missing recipes
- Provides completeness percentages

**Usage**:
```bash
node scripts/verifyRecipeDeployment.cjs
```

## Configuration

Both scripts are configured to work with:

**Source Store**: `Sugbo Mercado (IT Park, Cebu)`

**Target Stores**:
- `SM City Cebu`
- `SM Savemore Tacloban`

To modify the target stores, edit the `TARGET_STORES` array in both scripts.

## Database Tables

The scripts work with the following database structure:

### Recipe System Tables

#### `recipe_templates`
- Central recipe definitions
- Category information
- Pricing and yield data
- Choice group configurations

#### `recipe_template_ingredients`
- Template ingredient specifications
- Choice group assignments (`choice_group_name`)
- Ingredient types and selection rules
- Cost and quantity information

#### `recipes` (Store-specific)
- Store-specific recipe instances
- Links to recipe templates via `template_id`
- Store-specific pricing and costs
- Approval status and activation

#### `recipe_ingredients` (Store-specific)
- Store recipe ingredient relationships
- Links to store inventory via `inventory_stock_id`
- Quantity and cost per ingredient
- Unit specifications

#### `recipe_deployments`
- Deployment tracking records
- Cost and price snapshots
- Deployment metadata and notes

### Supporting Tables

#### `stores`
- Store information and metadata

#### `inventory_stock`
- Store-level inventory items
- Used for ingredient mapping

## Ingredient Mapping Process

The deployment script uses intelligent ingredient mapping:

1. **Exact Name Matching**: Matches ingredient names exactly with inventory items
2. **Partial Name Matching**: Falls back to partial string matching for similar names
3. **Case-Insensitive**: All matching is case-insensitive
4. **Mapping Validation**: Reports mapped vs unmapped ingredients
5. **Cost Calculation**: Calculates recipe costs based on mapped ingredients

### Mapping Examples
```
Template Ingredient → Store Inventory
"REGULAR CROISSANT" → "REGULAR CROISSANT" (exact match)
"Chocolate" → "Chocolate" (exact match)
"Whipped Cream" → "WHIPPED CREAM" (case-insensitive match)
```

## Choice Group Support

The system supports recipe choice groups for addon functionality:

### Choice Group Types
- **Base Ingredients**: Required components (`choice_group_name: "Base Ingredients"`)
- **Flavor Choice**: Optional selections (`choice_group_name: "Flavor Choice"`)
- **Packaging**: Required packaging items (`choice_group_name: "Packaging"`)

### Selection Types
- `required_one`: Must select exactly one option
- `optional_one`: Can select zero or one option
- `multiple`: Can select multiple options

## Authentication

Scripts use admin credentials:
- Email: `admin@example.com`
- Password: `password123`

## Error Handling

The scripts include comprehensive error handling for:
- Authentication failures
- Network connectivity issues
- Database constraint violations
- Missing stores or templates
- Ingredient mapping failures
- Unit validation errors

## Logging

Both scripts provide detailed console output including:
- Step-by-step progress with emojis
- Success/failure indicators
- Ingredient mapping statistics
- Category-wise deployment results
- Error messages with context
- Summary reports with percentages

## Example Output

### Deployment Operation
```
🚀 Starting recipe deployment process...

🔐 Authenticating as admin...
✅ Authentication successful

📋 Fetching recipe templates...
✅ Found 42 recipe templates

📊 Templates by category:
   - espresso: 9 templates
   - premium: 7 templates
   - addon: 12 templates
   - classic: 4 templates

🏪 Processing target store: SM City Cebu
   ✅ Found store: SM City Cebu (ID: c3bfe728-1550-4f4d-af04-12899f3b276b)
   📦 Loading inventory for ingredient mapping...
   ✅ Loaded 37 inventory items

📦 Deploying "Cookies & Cream Croffle" to SM City Cebu...
   ✅ Successfully deployed "Cookies & Cream Croffle"
      - Recipe ID: f5e6b338-daf0-4441-93c1-c49df51d68f6
      - Mapped ingredients: 6/6
      - Total cost: ₱41.30

📊 Deployment summary for SM City Cebu:
   ✅ Deployed: 40 recipes
   ⚠️  Skipped: 2 recipes (already existed)
   ❌ Failed: 0 recipes

📈 Overall Results:
   - Total Deployed: 80 recipes
   - Total Skipped: 4 recipes
   - Total Failed: 0 recipes

✅ Recipe deployment completed successfully!
```

### Verification
```
🔍 Starting recipe deployment verification...

📊 VERIFICATION SUMMARY
============================================================
Total Recipe Templates: 42

✅ SM City Cebu:
   - Deployed recipes: 42/42 (100.0%)
   - Missing recipes: 0
   - Deployment records: 84
   - Ingredient mapping: 100%

✅ SM Savemore Tacloban:
   - Deployed recipes: 42/42 (100.0%)
   - Missing recipes: 0
   - Deployment records: 84
   - Ingredient mapping: 100%

🎉 All recipe deployments are complete and verified!

🚀 System ready for:
   - POS operations with full recipe catalog
   - Inventory deduction during order processing
   - Recipe cost calculations and pricing
```

## Known Issues and Solutions

### Unit Validation Errors
Some ingredients may have unit validation issues (e.g., "portion" vs "Portion"). The script continues deployment but logs warnings for manual review.

### Missing Espresso Ingredients
Espresso-based recipes may have unmapped ingredients like "Espresso Shot", "Steamed Milk" if these aren't in store inventory. Consider adding these items to inventory first.

### Deployment Record Failures
Some deployment records may fail to create due to missing user references. This doesn't affect recipe functionality but impacts tracking.

## Integration with POS System

Deployed recipes integrate with:
- **Product Catalog**: Recipes can be converted to POS products
- **Inventory Management**: Ingredient deduction during orders
- **Choice Groups**: Addon selection in POS interface
- **Cost Calculation**: Real-time recipe costing
- **Category Management**: Recipe organization in POS

## Notes

- Scripts are designed to be idempotent (safe to run multiple times)
- Existing recipes are skipped to prevent duplicates
- All operations are logged for audit purposes
- Scripts follow the existing project patterns for database operations
- Ingredient mapping is intelligent but may require manual review for complex cases
- Choice group configurations are preserved during deployment
- Cost calculations are based on current inventory costs
