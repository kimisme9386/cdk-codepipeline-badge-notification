import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as targets from '@aws-cdk/aws-events-targets';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';

interface CodePipelineStatusProps {
  /**
   * AWS CodePipeline arn
   */
  pipelineArn: string;
  /**
   * GitHub personal token
   */
  gitHubToken?: string;
  notification?: Notification;
}

interface Notification {
  /**
   * Prefix title for slack message
   */
  stageName?: string;
  /**
   * Slack webhook url
   */
  slackWebHookUrl?: string;
}

export class CodePipelineStatus extends cdk.Construct {
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

    const gitHubToken = props.gitHubToken
      ? cdk.SecretValue.secretsManager(props.gitHubToken).toString()
      : '';

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
    gitHubToken: string,
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
        GITHUB_PERSONAL_TOKEN: gitHubToken,
      },
    });

    badgeBucket.grantReadWrite(lambdaFunc);

    new cdk.CfnOutput(this, 'badgeMarkdownLink', {
      value: `[![Build Status](https://${badgeBucket.bucketName}.s3-ap-northeast-1.amazonaws.com/${badgeBucketImageKeyName}#1)](https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipelineName}/view)`,
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
