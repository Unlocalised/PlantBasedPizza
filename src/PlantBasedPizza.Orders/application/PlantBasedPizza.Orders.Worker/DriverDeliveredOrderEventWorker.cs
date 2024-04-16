using System.Diagnostics;
using PlantBasedPizza.Events;
using PlantBasedPizza.Orders.Worker.Handlers;
using PlantBasedPizza.Orders.Worker.IntegrationEvents;
using RabbitMQ.Client;

namespace PlantBasedPizza.Orders.Worker;

public class DriverDeliveredOrderEventWorker : BackgroundService
{
    private readonly RabbitMqEventSubscriber _eventSubscriber;
    private readonly ActivitySource _source;
    private readonly DriverDeliveredOrderEventHandler _eventHandler;

    public DriverDeliveredOrderEventWorker(RabbitMqEventSubscriber eventSubscriber, ActivitySource source,
        DriverDeliveredOrderEventHandler eventHandler)
    {
        _eventSubscriber = eventSubscriber;
        _source = source;
        _eventHandler = eventHandler;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var queueName = "orders-driverDeliveredOrder-worker";

        var subscription = _eventSubscriber.CreateEventConsumer(queueName, "delivery.driverDeliveredOrder.v1");

        subscription.Consumer.Received += async (model, ea) =>
        {
            try
            {
                var evtDataResponse =
                    await _eventSubscriber.ParseEventFrom<DriverDeliveredOrderEventV1>(ea.Body.ToArray());

                using var processingActivity = _source.StartActivity("processing-order-completed-event",
                    ActivityKind.Server, evtDataResponse.TraceParent);
                processingActivity.AddTag("queue.time", evtDataResponse.QueueTime);

                processingActivity.SetTag("orderIdentifier", evtDataResponse.EventData.OrderIdentifier);

                await _eventHandler.Handle(evtDataResponse.EventData);

                subscription.Channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception e)
            {
                subscription.Channel.BasicReject(ea.DeliveryTag, true);
            }
        };

        while (!stoppingToken.IsCancellationRequested)
        {
            subscription.Channel.BasicConsume(
                queueName,
                false,
                subscription.Consumer);

            await Task.Delay(1000, stoppingToken);
        }
    }
}