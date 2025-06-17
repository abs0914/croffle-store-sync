
// Re-export everything from the new modular structure for backward compatibility
export type { RecipeTemplate, RecipeTemplateIngredient, DeploymentResult } from './types';

export {
  createRecipeTemplate,
  updateRecipeTemplate,
  deleteRecipeTemplate,
  duplicateRecipeTemplate,
  deployRecipeToStores,
  getRecipeDeployments,
  getRecipeTemplates
} from './index';
