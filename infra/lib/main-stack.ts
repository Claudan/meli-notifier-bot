import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "node:path";
import { Duration } from "aws-cdk-lib";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, "MeliEventsQueue", {
      visibilityTimeout: Duration.seconds(60),
      retentionPeriod: Duration.days(4),
    });

    const producerLambda = new lambdaNode.NodejsFunction(this, "WebhookProducerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../functions/producer/handler.ts"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 256,
      bundling: {
        minify: true,
        target: "es2022",
      },
      environment: {
        QUEUE_URL: queue.queueUrl,
      },
    });

    queue.grantSendMessages(producerLambda);

    const workerLambda = new lambdaNode.NodejsFunction(this, "WorkerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../functions/worker/handler.ts"),
      handler: "handler",
      timeout: Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        target: "es2022",
      },
    });

    workerLambda.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
      }),
    );

    const api = new apigw.RestApi(this, "MeliWebhookApi", {
      restApiName: "meli-notifier-bot-api",
      description: "Webhook endpoint for MercadoLibre",
      deployOptions: {
        stageName: "prod",
      },
    });

    const webhookResource = api.root.addResource("webhook");
    webhookResource.addMethod("POST", new apigw.LambdaIntegration(producerLambda));

    new cdk.CfnOutput(this, "WebhookUrl", {
      value: api.urlForPath("/webhook"),
      description: "URL to configure the webhook in MercadoLibre",
    });

    new cdk.CfnOutput(this, "QueueUrl", {
      value: queue.queueUrl,
      description: "URL of the SQS queue used by the worker",
    });
  }
}
