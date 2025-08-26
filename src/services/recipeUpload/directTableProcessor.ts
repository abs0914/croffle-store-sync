import { processTableRecipes } from './tableRecipeProcessor';

// Direct function to process your table data
export const processYourRecipeTable = async (): Promise<boolean> => {
  const tableData = `| Product             | category | Ingredient Name     | Unit of Measure | Quantity | Cost per Unit | price |
|---------------------|----------|---------------------|-----------------|----------|---------------|-------|
| Tiramisu            | Classic  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Tiramisu            | Classic  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Tiramisu            | Classic  | Tiramisu            | portion         | 1        | 3.5           | 125   |
| Tiramisu            | Classic  | Choco Flakes        | portion         | 1        | 2.5           | 125   |
| Tiramisu            | Classic  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Tiramisu            | Classic  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Choco Nut           | Classic  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Choco Nut           | Classic  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Choco Nut           | Classic  | Chocolate           | portion         | 1        | 2.5           | 125   |
| Choco Nut           | Classic  | Peanut              | portion         | 1        | 2.5           | 125   |
| Choco Nut           | Classic  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Choco Nut           | Classic  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Caramel Delight     | Classic  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Caramel Delight     | Classic  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Caramel Delight     | Classic  | Caramel             | portion         | 1        | 2.5           | 125   |
| Caramel Delight     | Classic  | Colored Sprinkles   | portion         | 1        | 2.5           | 125   |
| Caramel Delight     | Classic  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Caramel Delight     | Classic  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Choco Marshmallow   | Classic  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Choco Marshmallow   | Classic  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Choco Marshmallow   | Classic  | Chocolate           | portion         | 1        | 2.5           | 125   |
| Choco Marshmallow   | Classic  | Marshmallow         | portion         | 1        | 2.5           | 125   |
| Choco Marshmallow   | Classic  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Choco Marshmallow   | Classic  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Strawberry          | Fruity   | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Strawberry          | Fruity   | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Strawberry          | Fruity   | Strawberry Jam      | scoop           | 1        | 5             | 125   |
| Strawberry          | Fruity   | Chopstick           | pair            | 1        | 0.6           | 125   |
| Strawberry          | Fruity   | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Mango               | Fruity   | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Mango               | Fruity   | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Mango               | Fruity   | Mango Jam           | scoop           | 1        | 7             | 125   |
| Mango               | Fruity   | Graham Crushed      | portion         | 1        | 2.5           | 125   |
| Mango               | Fruity   | Chopstick           | pair            | 1        | 0.6           | 125   |
| Mango               | Fruity   | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Blueberry           | Fruity   | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Blueberry           | Fruity   | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Blueberry           | Fruity   | Blueberry Jam       | scoop           | 1        | 7.5           | 125   |
| Blueberry           | Fruity   | Graham Crushed      | portion         | 1        | 2.5           | 125   |
| Blueberry           | Fruity   | Chopstick           | pair            | 1        | 0.6           | 125   |
| Blueberry           | Fruity   | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Biscoff             | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Biscoff             | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Biscoff             | Premium  | Biscoff Crushed     | portion         | 1        | 2.5           | 125   |
| Biscoff             | Premium  | Biscoff             | piece           | 1        | 5.62          | 125   |
| Biscoff             | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Biscoff             | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Nutella             | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Nutella             | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Nutella             | Premium  | Nutella             | portion         | 1        | 4.5           | 125   |
| Nutella             | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Nutella             | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Kitkat              | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Kitkat              | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Kitkat              | Premium  | Chocolate           | portion         | 1        | 2.5           | 125   |
| Kitkat              | Premium  | Kitkat              | piece           | 0.5      | 6.25          | 125   |
| Kitkat              | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Kitkat              | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Cookies & Cream     | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Cookies & Cream     | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Cookies & Cream     | Premium  | Oreo Crushed        | portion         | 1        | 2.5           | 125   |
| Cookies & Cream     | Premium  | Oreo Cookies        | piece           | 1        | 2.9           | 125   |
| Cookies & Cream     | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Cookies & Cream     | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Choco Overload      | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Choco Overload      | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Choco Overload      | Premium  | Chocolate           | portion         | 1        | 2.5           | 125   |
| Choco Overload      | Premium  | Choco Flakes        | portion         | 1        | 2.5           | 125   |
| Choco Overload      | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Choco Overload      | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Matcha              | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Matcha              | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Matcha              | Premium  | Matcha crumble      | portion         | 1        | 2.5           | 125   |
| Matcha              | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Matcha              | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |
| Dark Chocolate      | Premium  | REGULAR CROISSANT   | piece           | 1        | 30            | 125   |
| Dark Chocolate      | Premium  | WHIPPED CREAM       | serving         | 1        | 8             | 125   |
| Dark Chocolate      | Premium  | Dark Chocolate      | portion         | 1        | 2.5           | 125   |
| Dark Chocolate      | Premium  | Chocolate crumble   | portion         | 1        | 2.5           | 125   |
| Dark Chocolate      | Premium  | Chopstick           | pair            | 1        | 0.6           | 125   |
| Dark Chocolate      | Premium  | Wax Paper           | piece           | 1        | 0.7           | 125   |`;

  return await processTableRecipes(tableData);
};