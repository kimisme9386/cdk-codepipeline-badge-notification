import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

export interface Notification {
  /**
   * Prefix title for slack message
   */
  readonly stageName?: string;
  /**
   * Slack webhook url
   */
  readonly slackWebHookUrl?: string;
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

export interface CodePipelineStatusProps {
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

export class CodePipelineStatus extends cdk.Construct {
  badgeUrl: string = '';
  codePipelineLink: string = '';

  constructor(
    scope: cdk.Construct,
    id: string,
    props: CodePipelineStatusProps
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
      props?.notification?.slackWebHookUrl
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
    slackWebhookURL: string | undefined
  ): lambda.Function {
    const badgeBucket = new s3.Bucket(this, 'BadgeBucket', {
      publicReadAccess: true,
    });

    const stageKeyName = stage ? `${stage}-` : '';
    const badgeBucketImageKeyName = `${stageKeyName}latest-build.svg`;

    const lambdaFunc = new lambda.Function(this, 'CodepipelineEventLambda', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/codepipeline-event'),
        {
          bundling: {
            user: 'root',
            image: lambda.Runtime.NODEJS_14_X.bundlingImage,
            command: [
              'bash',
              '-c',
              [
                'ls -al /asset-input',
                'cd /asset-input',
                'npm install',
                'npm run build',
                'cp -r /asset-input/dist /asset-output/',
                'npm install --only=production',
                'cp -a /asset-input/node_modules /asset-output/',
              ].join(' && '),
            ],
          },
        }
      ),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'dist/codepipelineEventLambda.handler',
      environment: {
        STAGE: stage ?? '',
        SLACK_WEBHOOK_URL: slackWebhookURL ?? '',
        BADGE_BUCKET_NAME: badgeBucket.bucketName,
        BADGE_BUCKET_IMAGE_KEY_NAME: badgeBucketImageKeyName,
        CODE_PIPELINE_NAME: codePipelineName,
        GITHUB_PERSONAL_TOKEN: gitHubToken ? `${gitHubToken}` : '',
      },
    });

    badgeBucket.grantReadWrite(lambdaFunc);

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

  private tagResource(scope: cdk.Construct): void {
    cdk.Tags.of(scope).add('CDK-CfnStackId', cdk.Aws.STACK_ID);
    cdk.Tags.of(scope).add('CDK-CfnStackName', cdk.Aws.STACK_NAME);
  }
}
