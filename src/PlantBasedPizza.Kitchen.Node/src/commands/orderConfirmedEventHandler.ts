import { tracer } from "dd-trace";
import { RecipeAdapter } from "../adapters/recipeAdapter";
import { IKitchenEventPublisher } from "../entities/kitchenEventPublisher";
import { IKitchenRequestRepository } from "../entities/kitchenRepository";
import { KitchenRequest } from "../entities/kitchenRequest";
import { OrderConfirmedEvent } from "../integration-events/orderConfirmedEvent";
import { IRecipeService } from "../services/recipeService";

export class OrderConfirmedEventHandler {
  kitchenRequestRepository: IKitchenRequestRepository;
  eventPublisher: IKitchenEventPublisher;
  recipeService: IRecipeService;

  constructor(
    kitchenRequestRepository: IKitchenRequestRepository,
    eventPublisher: IKitchenEventPublisher,
    recipeService: IRecipeService,
  ) {
    this.kitchenRequestRepository = kitchenRequestRepository;
    this.eventPublisher = eventPublisher;
    this.recipeService = recipeService;
  }

  async handle(evt: OrderConfirmedEvent): Promise<void> {
    const activeSpan = tracer.scope().active();
    activeSpan?.addTags({"order.orderIdentifier": evt.OrderIdentifier});

    const existingOrder = await this.kitchenRequestRepository.retrieve(evt.OrderIdentifier);

    if (existingOrder !== null) {
      activeSpan?.addTags({"order.exists": "true"});
      return;
    }

    const recipes: RecipeAdapter[] = [];

    for (const item of evt.Items) {
      const recipe = await this.recipeService.getRecipe(item.RecipeIdentifier);

      if (recipe === undefined) {
        throw "Recipe not found";
      };

      recipes.push(recipe);
    }

    activeSpan?.addTags({"order.recipesFound": recipes.length});

    const kitchenRequest = new KitchenRequest(evt.OrderIdentifier, recipes);

    await this.kitchenRequestRepository.addNew(kitchenRequest);
    await this.eventPublisher.publishKitchenOrderConfirmedEventV1({
        orderIdentifier: evt.OrderIdentifier
    });
  }
}
