import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "node:path";
import { Duration } from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, "MeliEventsQueue", {
      visibilityTimeout: Duration.seconds(60),
      retentionPeriod: Duration.days(4),
    });

    const eventsTable = new dynamodb.Table(this, "MeliEventsTable", {
      tableName: "meli-notifier-events",
      partitionKey: { name: "eventId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const producerLambda = new lambdaNode.NodejsFunction(this, "WebhookProducerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(process.cwd(), "src/functions/producer/handler.ts"),
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

    const telegramSecret = new secretsmanager.Secret(this, "TelegramSecret", {
      secretName: "/meli-notifier/telegram",
      description: "Credentials for Telegram notifications",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const meliAuthSecret = new secretsmanager.Secret(this, "MercadoLibreAuthSecret", {
      secretName: "/meli-metrics/mercadolibre/auth",
      description: "MercadoLibre OAuth static credentials",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const workerLambda = new lambdaNode.NodejsFunction(this, "WorkerLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(process.cwd(), "src/functions/worker/handler.ts"),
      handler: "handler",
      timeout: Duration.seconds(30),
      memorySize: 512,
      bundling: {
        minify: true,
        target: "es2022",
      },
    });

    eventsTable.grantReadWriteData(workerLambda);
    telegramSecret.grantRead(workerLambda);
    meliAuthSecret.grantRead(workerLambda);
    workerLambda.addEnvironment("TELEGRAM_SECRET_ARN", telegramSecret.secretArn);
    workerLambda.addEnvironment("MELI_AUTH_SECRET_ARN", meliAuthSecret.secretArn);
    workerLambda.addEnvironment("DYNAMO_TABLE", eventsTable.tableName);

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

    new cdk.CfnOutput(this, "TelegramSecretArn", {
      value: telegramSecret.secretArn,
    });
  }
}
