import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { IApplicationListener } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { IStringParameter } from "aws-cdk-lib/aws-ssm";
import { Datadog } from "datadog-cdk-constructs-v2";

export interface SharedProps {
  serviceName: string;
  environment: string;
  version: string;
  datadogConfiguration: Datadog;
  apiProps: ApiProps;
  vpc: IVpc | undefined;
  databaseConnectionParam: IStringParameter;
  table: ITable
}

export interface ApiProps {
  albListener: IApplicationListener | undefined;
  apiGateway: HttpApi | undefined
}
