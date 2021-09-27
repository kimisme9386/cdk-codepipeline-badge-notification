import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codePipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { CodePipelineBadgeNotification } from './index';

export class IntegTesting {
  readonly stack: cdk.Stack[];
  constructor() {
    const app = new cdk.App();

    const env = {
      region: process.env.CDK_DEFAULT_REGION,
      account: process.env.CDK_DEFAULT_ACCOUNT,
    };

    const stack = new cdk.Stack(app, 'my-codepipeline-badge-notification-stack', { env });

    const pipeline = this.createCodePipeline(stack);

    const codePipelineStatus = new CodePipelineBadgeNotification(
      stack,
      'CodePipelineStatus',
      {
        pipelineArn: pipeline.pipelineArn,
        gitHubTokenFromSecretsManager: {
          secretsManagerArn:
            'arn:aws:secretsmanager:ap-northeast-1:482631629698:secret:codepipeline/lambda/github-token-YWWmII',
          secretKey: 'codepipeline/lambda/github-token',
        },
        notification: {
          stageName: 'production',
          ssmSlackWebHookUrl: 'ssm_slack_webhook',
          ssmGoogleChatWebHookUrl: 'ssm_google_chat_webhook',
          ssmTelegramWebHookUrl: 'ssm_telegram_webhook',
        },
      }
    );

    new cdk.CfnOutput(stack, 'BadgeUrl', {
      value: codePipelineStatus.badgeUrl,
    });
    new cdk.CfnOutput(stack, 'CodePipelineLink', {
      value: codePipelineStatus.codePipelineLink,
    });

    app.synth();
    this.stack = [stack];
  }

  private createCodePipeline(stack: cdk.Stack): codePipeline.IPipeline {
    const pipeline = new codePipeline.Pipeline(stack, 'TestPipeline', {
      pipelineName: 'integTestCodePipeline',
      crossAccountKeys: false,
    });

    const sourceOutput = new codePipeline.Artifact();

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: 'GitHub_Source',
          owner: 'kimisme9386',
          repo: 'cdk-codepipeline-status',
          output: sourceOutput,
          connectionArn: `arn:aws:codestar-connections:ap-northeast-1:${cdk.Aws.ACCOUNT_ID}:connection/XXxxxxxxxxxx`,
          variablesNamespace: 'GitHubSourceVariables',
          branch: 'dev',
          codeBuildCloneOutput: true,
        }),
      ],
    });

    const project = this.createCodeBuildProjectWithinCodePipeline(
      stack,
      'buildspec.yml'
    );

    const afterBuildArtifact = new codePipeline.Artifact();

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'AWS_CodeBuild',
          input: sourceOutput,
          project: project,
          type: codepipeline_actions.CodeBuildActionType.BUILD,
          outputs: [afterBuildArtifact],
        }),
      ],
    });

    return pipeline;
  }

  private createCodeBuildProjectWithinCodePipeline(
    stack: cdk.Stack,
    buildSpecPath: string
  ) {
    const project = new codebuild.PipelineProject(
      stack,
      'CodeBuildWithinCodePipeline',
      {
        buildSpec: codebuild.BuildSpec.fromSourceFilename(buildSpecPath),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
          computeType: codebuild.ComputeType.SMALL,
          privileged: true,
        },
        cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
      }
    );
    return project;
  }
}

new IntegTesting();
