
// Export types
export type { RecipeTemplate, RecipeTemplateIngredient, DeploymentResult } from './types';

// Export CRUD operations
export {
  createRecipeTemplate,
  updateRecipeTemplate,
  deleteRecipeTemplate,
  duplicateRecipeTemplate
} from './recipeCrudService';

// Export deployment operations
export {
  deployRecipeToStores,
  getRecipeDeployments
} from './recipeDeploymentService';

// Export data fetching
export {
  getRecipeTemplates
} from './recipeDataService';
