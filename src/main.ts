import * as path from 'path';
import {
  aws_codepipeline as codePipeline,
  aws_events_targets as targets,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_s3 as s3,
  aws_ssm as ssm,
} from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface Notification {
  /**
   * Prefix title for slack message
   */
  readonly stageName?: string;
  /**
   * Slack webhook url from ssm parameter
   */
  readonly ssmSlackWebHookUrl?: string;
  /**
   * google chat webhook url from ssm parameter
   */
  readonly ssmGoogleChatWebHookUrl?: string;
  /**
   * telegram webhook url from from ssm parameter
   * the URL is not include text query string
   */
  readonly ssmTelegramWebHookUrl?: string;
}

export interface GitHubTokenFromSecretsManager {
  /**
   * Arn with other type of secrets
   */
  readonly secretsManagerArn?: string;

  /**
   * SecretKey
   */
  readonly secretKey?: string;
}

export interface CodePipelineBadgeNotificationProps {
  /**
   * AWS CodePipeline arn
   */
  readonly pipelineArn: string;
  /**
   * AWS Secret Manager id or arn
   */
  readonly gitHubTokenFromSecretsManager?: GitHubTokenFromSecretsManager;
  /**
   * Notification
   */
  readonly notification?: Notification;
}

export class CodePipelineBadgeNotification extends Construct {
  badgeUrl: string = '';
  codePipelineLink: string = '';

  constructor(
    scope: Construct,
    id: string,
    props: CodePipelineBadgeNotificationProps
  ) {
    super(scope, id);

    const pipeline = codePipeline.Pipeline.fromPipelineArn(
      this,
      'CodePipeline',
      props.pipelineArn
    );

    const gitHubToken =
      props?.gitHubTokenFromSecretsManager?.secretsManagerArn &&
      props?.gitHubTokenFromSecretsManager?.secretKey
        ? cdk.SecretValue.secretsManager(
          props.gitHubTokenFromSecretsManager.secretsManagerArn,
          {
            jsonField: props.gitHubTokenFromSecretsManager.secretKey,
          }
        )
        : null;

    const targetLambda = this.createCodePipelineEventLambdaFunction(
      pipeline.pipelineName,
      gitHubToken,
      props?.notification?.stageName,
      props?.notification?.ssmSlackWebHookUrl,
      props?.notification?.ssmGoogleChatWebHookUrl,
      props?.notification?.ssmTelegramWebHookUrl
    );

    pipeline.onStateChange('CodePipelineChange', {
      eventPattern: {
        source: ['aws.codepipeline'],
        detailType: ['CodePipeline Pipeline Execution State Change'],
      },
      target: new targets.LambdaFunction(targetLambda),
    });
  }

  private createCodePipelineEventLambdaFunction(
    codePipelineName: string,
    gitHubToken: cdk.SecretValue | null,
    stage: string | undefined,
    ssmSlackWebHookUrl: string | undefined,
    ssmGoogleChatWebHookUrl: string | undefined,
    ssmTelegramWebHookUrl: string | undefined
  ): lambda.Function {
    const badgeBucket = new s3.Bucket(this, 'BadgeBucket', {
      publicReadAccess: true,
    });

    const stageKeyName = stage ? `${stage}-` : '';
    const badgeBucketImageKeyName = `${stageKeyName}latest-build.svg`;

    const lambdaFunc = new lambda.DockerImageFunction(
      this,
      'CodepipelineEventLambda',
      {
        code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambda/codepipeline-event'),
          {
            cmd: ['codepipelineEventLambda.handler'],
          }
        ),
        environment: {
          STAGE: stage ?? '',
          SLACK_WEBHOOK_URL: ssmSlackWebHookUrl ?
            ssm.StringParameter.valueForStringParameter(this, ssmSlackWebHookUrl) : '',
          GOOGLE_CHAT_WEBHOOK_URL: ssmGoogleChatWebHookUrl ?
            ssm.StringParameter.valueForStringParameter(this, ssmGoogleChatWebHookUrl) : '',
          TELEGRAM_WEBHOOK_URL: ssmTelegramWebHookUrl ?
            ssm.StringParameter.valueForStringParameter(this, ssmTelegramWebHookUrl) : '',
          BADGE_BUCKET_NAME: badgeBucket.bucketName,
          BADGE_BUCKET_IMAGE_KEY_NAME: badgeBucketImageKeyName,
          CODE_PIPELINE_NAME: codePipelineName,
          GITHUB_PERSONAL_TOKEN: gitHubToken ? `${gitHubToken}` : '',
        },
        timeout: cdk.Duration.seconds(30),
      }
    );

    badgeBucket.grantReadWrite(lambdaFunc);

    if (ssmSlackWebHookUrl && lambdaFunc.role) {
      lambdaFunc.role.attachInlinePolicy(
        new iam.Policy(this, 'ssmSlackWebHookUrl', {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/${ssmSlackWebHookUrl}`],
            }),
          ],
        })
      );
    }

    if (ssmGoogleChatWebHookUrl && lambdaFunc.role) {
      lambdaFunc.role.attachInlinePolicy(
        new iam.Policy(this, 'ssmGoogleChatWebHookUrl', {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/${ssmGoogleChatWebHookUrl}`],
            }),
          ],
        })
      );
    }

    if (ssmTelegramWebHookUrl && lambdaFunc.role) {
      lambdaFunc.role.attachInlinePolicy(
        new iam.Policy(this, 'ssmTelegramWebHookUrl', {
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ssm:GetParameter', 'ssm:GetParameters'],
              resources: [`arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/${ssmTelegramWebHookUrl}`],
            }),
          ],
        })
      );
    }

    const region = cdk.Aws.REGION ?? 'ap-northeast-1';
    this.badgeUrl = `https://${badgeBucket.bucketName}.s3-ap-northeast-1.amazonaws.com/${badgeBucketImageKeyName}#1`;
    this.codePipelineLink = `https://${region}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipelineName}/view`;

    new cdk.CfnOutput(this, 'badgeMarkdownLink', {
      value: `[![Build Status](${this.badgeUrl})](${this.codePipelineLink})`,
    });

    lambdaFunc.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AWSCodePipeline_ReadOnlyAccess'
      )
    );

    this.tagResource(lambdaFunc);

    return lambdaFunc;
  }

  private tagResource(scope: Construct): void {
    cdk.Tags.of(scope).add('CDK-CfnStackId', cdk.Aws.STACK_ID);
    cdk.Tags.of(scope).add('CDK-CfnStackName', cdk.Aws.STACK_NAME);
  }
}
