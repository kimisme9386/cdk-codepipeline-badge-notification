import * as cdk from 'aws-cdk-lib';
import {
  aws_codebuild as codebuild,
  aws_codepipeline as codePipeline,
  aws_codepipeline_actions as codepipeline_actions,
} from 'aws-cdk-lib';
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
      'CodePipelineBadgeNotification',
      {
        pipelineArn: pipeline.pipelineArn,
        gitHubTokenFromSecretsManager: {
          secretsManagerArn:
            `arn:aws:secretsmanager:ap-northeast-1:${cdk.Aws.ACCOUNT_ID}:secret:codepipeline/lambda/github-token-YnCnne`,
          secretKey: 'codepipeline/lambda/github-token',
        },
        notification: {
          stageName: 'production',
          // ssmSlackWebHookUrl: 'ssm_slack_webhook',
          ssmGoogleChatWebHookUrl: '/chat/google/webhook',
          ssmTelegramWebHookUrl: '/chat/telegram/webhook',
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
          repo: 'cdk-codepipeline-badge-notification',
          output: sourceOutput,
          connectionArn: `arn:aws:codestar-connections:ap-northeast-1:${cdk.Aws.ACCOUNT_ID}:connection/e97c0228-6aee-46df-a0a5-8ddbd3c94679`,
          variablesNamespace: 'GitHubSourceVariables',
          branch: 'feature/google-chat-notification',
          codeBuildCloneOutput: true,
        }),
      ],
    });

    const project = this.createCodeBuildProjectWithinCodePipeline(
      stack
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
    stack: cdk.Stack
  ) {
    const project = new codebuild.PipelineProject(
      stack,
      'CodeBuildWithinCodePipeline',
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          env: {
            shell: 'bash',
          },
          phases: {
            build: {
              'on-failure': 'ABORT',
              'commands': [
                'echo "test build"',
              ],
            },
          },
          artifacts: {
            files: 'imagedefinitions.json',
          },
        }),
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
