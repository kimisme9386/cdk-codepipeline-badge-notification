[![NPM version](https://badge.fury.io/js/cdk-codepipeline-badge-notification.svg)](https://badge.fury.io/js/cdk-codepipeline-badge-notification)
[![PyPI version](https://badge.fury.io/py/cdk-codepipeline-badge-notification.svg)](https://badge.fury.io/py/cdk-codepipeline-badge-notification)
[![Release](https://github.com/kimisme9386/cdk-codepipeline-badge-notification/actions/workflows/release.yml/badge.svg)](https://github.com/kimisme9386/cdk-codepipeline-badge-notification/actions/workflows/release.yml)

# CDK-CodePipeline-Badge-Notification

## Feature

- Generate badge when AWS CodePipeline state change

- Update GitHub commit status when AWS CodePipeline state change

- Slack notification when AWS CodePipeline state change

## Usage

```ts
import { CodePipelineBadgeNotification } from 'cdk-pipeline-badge-notification';
import * as cdk from '@aws-cdk/core';
import * as codePipeline from '@aws-cdk/aws-codepipeline';

const app = new cdk.App();
const env = {
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT,
};
const stack = new cdk.Stack(app, 'codepipeline-badge-notification', { env });

const pipeline = new codePipeline.Pipeline(stack, 'TestPipeline', {
  pipelineName: 'testCodePipeline',
  crossAccountKeys: false,
});

new CodePipelineBadgeNotification(stack, 'CodePipelineBadgeNotification', {
  pipelineArn: pipeline.pipelineArn,
  gitHubTokenFromSecretsManager: {
    secretsManagerArn:
      'arn:aws:secretsmanager:ap-northeast-1:111111111111:secret:codepipeline/lambda/github-token-YWWmII',
    secretKey: 'codepipeline/lambda/github-token',
  },
  notification: {
    stageName: 'production',
    slackWebHookUrl: 'slack url webhook',
  },
});
```

> gitHubTokenFromSecretsManager and notification is optional

#### Only badge

```ts
new CodePipelineBadgeNotification(stack, 'CodePipelineBadgeNotification', {
  pipelineArn: pipeline.pipelineArn,
});
```
