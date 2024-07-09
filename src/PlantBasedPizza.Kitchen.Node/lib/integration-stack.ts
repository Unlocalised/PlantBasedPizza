import { Stack, StackProps } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { Datadog } from "datadog-cdk-constructs-v2";
import { ApplicationListener } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { EventBus } from "aws-cdk-lib/aws-events";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { SharedProps } from "./constructs/sharedFunctionProps";
import { AttributeType, BillingMode, ProjectionType, Table, TableClass } from "aws-cdk-lib/aws-dynamodb";
import { Api } from "./api";
import { BackgroundWorker } from "./backgroundWorkers";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";

export class IntegrationTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcIdParam = StringParameter.valueFromLookup(this, "/shared/vpc-id");
    const environment = process.env.ENV ?? "test";
    const serviceName = "KitchenService";
    const version = process.env.COMMIT_HASH ?? "latest";

    const vpc = Vpc.fromLookup(this, "Vpc", {
      vpcId: vpcIdParam,
    });

    const ddApiKey = Secret.fromSecretNameV2(this, "DDApiKeySecret", "DdApiKeySecret-EAtKjZYFq40D");

    const databaseConnectionParam = StringParameter.fromSecureStringParameterAttributes(
      this,
      "DatabaseConnectionParam",
      {
        parameterName: "/shared/database-connection",
      },
    );

    const jwtKey = StringParameter.fromSecureStringParameterAttributes(
      this,
      "JwtKeyParam",
      {
        parameterName: "/shared/jwt-key",
      },
    );

    const eventBridge = new EventBus(this, "KitchenServiceTestBus", {
        eventBusName: `kitchen-service.${version}`
    });

    const datadogConfiguration = new Datadog(this, "Datadog", {
      nodeLayerVersion: 112,
      extensionLayerVersion: 58,
      site: "datadoghq.eu",
      apiKeySecret: ddApiKey,
      service: "KitchenService",
      version: process.env["COMMIT_HASH"] ?? "latest",
      env: environment,
      enableColdStartTracing: true,
      captureLambdaPayload: process.env.ENV == "prod" ? false : true
    });

    const table = new Table(this, `KitchenDataTable${version}`, {
      tableName: `kitchen-integration-test.${version}`,
      tableClass: TableClass.STANDARD,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: AttributeType.STRING
      },
    });
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      projectionType: ProjectionType.ALL,
      partitionKey: {
        name: "GSI1PK",
        type: AttributeType.STRING
      },
      sortKey: {
        name: "GSI1SK",
        type: AttributeType.STRING
      }
    });

    const httpApi = new HttpApi(this, "KitchenIntegrationTestApi", {

});

    const sharedProps: SharedProps = {
      serviceName,
      environment,
      version,
      vpc,
      apiProps: {
        // Add API Gateway resource
        apiGateway: httpApi,
        albListener: undefined
      },
      databaseConnectionParam,
      datadogConfiguration,
      table
    };

    const api = new Api(this, "KitchenApi", {
      sharedProps,
      bus: eventBridge,
      table,
      jwtKey
    });

    const backgroundWorkers = new BackgroundWorker(this, "BackgroundWorker", {
      sharedProps,
      table,
      bus: eventBridge
    });
  }
}
