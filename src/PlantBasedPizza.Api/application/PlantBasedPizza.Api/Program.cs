using MongoDB.Driver;
using PlantBasedPizza.Api;
using PlantBasedPizza.Deliver.Infrastructure;
using PlantBasedPizza.Events;
using PlantBasedPizza.Recipes.Infrastructure;
using PlantBasedPizza.Shared;
using PlantBasedPizza.Shared.Logging;

var builder = WebApplication.CreateBuilder(args);
builder
    .Configuration
    .AddEnvironmentVariables();

var client = new MongoClient(builder.Configuration["DatabaseConnection"]);

builder.Services.AddSingleton(client);

builder.Services.AddRecipeInfrastructure(builder.Configuration);
builder.Services.AddDeliveryModuleInfrastructure(builder.Configuration);
builder.Services.AddSharedInfrastructure(builder.Configuration, "PlantBasedPizza")
    .AddMessaging(builder.Configuration);

builder.Services.AddHttpClient();

builder.Services.AddControllers();

var app = builder.Build();

DomainEvents.Container = app.Services;

app.Map("/health", async () =>
{
    var healthCheckResult = new HealthCheckResult();
    
    return Results.Ok(healthCheckResult);
});

app.Use(async (context, next) =>
{
    var observability = app.Services.GetService<IObservabilityService>();

    var correlationId = string.Empty;

    if (context.Request.Headers.ContainsKey(CorrelationContext.DefaultRequestHeaderName))
    {
        correlationId = context.Request.Headers[CorrelationContext.DefaultRequestHeaderName].ToString();
    }
    else
    {
        correlationId = Guid.NewGuid().ToString();

        context.Request.Headers.Append(CorrelationContext.DefaultRequestHeaderName, correlationId);
    }

    CorrelationContext.SetCorrelationId(correlationId);

    observability?.Info($"Request received to {context.Request.Path.Value}");

    context.Response.Headers.Append(CorrelationContext.DefaultRequestHeaderName, correlationId);

    // Do work that doesn't write to the Response.
    await next.Invoke();
});

app.MapControllers();

app.Run();