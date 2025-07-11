import { uploadCoffeeRecipes } from './uploadCoffeeRecipes';
import { uploadComboProductTemplates } from './uploadComboProductTemplates';
import './uploadAddonRecipes';
import './uploadDrinksRecipes';

async function uploadAllRecipes() {
  try {
    console.log('🚀 Starting comprehensive recipe upload...');
    
    // Upload coffee recipes
    console.log('\n📋 Uploading coffee recipes...');
    await uploadCoffeeRecipes();
    
    // Upload combo product templates  
    console.log('\n📋 Uploading combo product templates...');
    await uploadComboProductTemplates();
    
    // Addon and drinks recipes will auto-execute when imported
    console.log('\n📋 Addon and drinks recipes uploading...');
    
    console.log('\n✅ All recipe uploads completed!');
    console.log('🎉 You can now check the Recipe Management page to see your templates.');
    
  } catch (error) {
    console.error('❌ Error during recipe uploads:', error);
  }
}

// Run all uploads
uploadAllRecipes();