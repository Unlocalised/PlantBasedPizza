using Amazon;
using Amazon.CloudWatch;
using Amazon.XRay.Recorder.Core;
using Amazon.XRay.Recorder.Handlers.AwsSdk;
using Amazon.XRay.Recorder.Handlers.System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlantBasedPizza.Shared.Logging;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Json;

namespace PlantBasedPizza.Shared
{
    public static class Setup
    {
        public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services,
            IConfiguration configuration)
        {
            AWSXRayRecorder.RegisterLogger(LoggingOptions.Console);
            AWSXRayRecorder.InitializeInstance(configuration);
            AWSSDKHandler.RegisterXRayForAllServices();
            
            ApplicationLogger.Init();

            services.AddSingleton(new AmazonCloudWatchClient());
            services.AddTransient<IObservabilityService, ObservabiityService>();
            services.AddHttpContextAccessor();

            return services;
        }
        
        public static WebApplicationBuilder AddSharedInfrastructure(this WebApplicationBuilder builder)
        {
            builder.Host.UseSerilog((ctx, lc) => lc
                .MinimumLevel.Debug()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Error)
                .Enrich.FromLogContext()
                .WriteTo.Console()
                .WriteTo.File(new JsonFormatter(), "logs/myapp-{Date}.json"));

            return builder;
        }
    }
}