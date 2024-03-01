using System.Text.Json.Serialization;

namespace PlantBasedPizza.Recipes.Core.Entities
{
    using PlantBasedPizza.Recipes.Core.Events;
    using PlantBasedPizza.Shared.Events;

    public class Recipe
    {
        private List<Ingredient> _ingredients;
        
        [JsonConstructor]
        private Recipe()
        {
        }
        
        public Recipe(string recipeIdentifier, string name, decimal price)
        {
            this.RecipeIdentifier = recipeIdentifier;
            this.Name = name;
            this.Price = price;

            DomainEvents.Raise(new RecipeCreatedEvent(this));
        }
        
        [JsonPropertyName("recipeIdentifier")]
        public string RecipeIdentifier { get; private set; }
        
        [JsonPropertyName("name")]
        public string Name { get; private set; }
        
        [JsonPropertyName("price")]
        public decimal Price { get; private set; }

        [JsonPropertyName("ingredients")]
        public IReadOnlyCollection<Ingredient> Ingredients => this._ingredients;

        public void AddIngredient(string name, int quantity)
        {
            if (this._ingredients == null)
            {
                this._ingredients = new List<Ingredient>();
            }
            
            this._ingredients.Add(new Ingredient(name, quantity));
        }
    }
}