import {
  CodePipelineClient,
  GetPipelineExecutionCommand,
} from '@aws-sdk/client-codepipeline';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Callback, CodePipelineCloudWatchEvent, Context } from 'aws-lambda';
import { default as axios } from 'axios';
import url from 'url';

enum CodePipelineState {
  STARTED = 'STARTED',
  RESUMED = 'RESUMED',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  SUCCEEDED = 'SUCCEEDED',
  SUPERSEDED = 'SUPERSEDED',
}

interface SourceActionData {
  owner: string;
  repository: string;
  sha: string;
}

const CodePipelineFailState = [
  CodePipelineState.CANCELED as string,
  CodePipelineState.FAILED as string,
  CodePipelineState.SUCCEEDED as string,
];

export const handler = async (
  event: CodePipelineCloudWatchEvent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: Context,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  callback: Callback
): Promise<void> => {
  console.info('Debug event\n' + JSON.stringify(event, null, 2));
  const state = event.detail.state;
  const subject = `project: ${event.detail.pipeline} \n ${event['detail-type']}: ${state}`;
  const codePipelineLink = `https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/${event.detail.pipeline}/view`;
  const webhookUrl = (process.env.SLACK_WEBHOOK_URL as string) ?? '';
  const badgeBucket = process.env.BADGE_BUCKET_NAME as string;
  const badgeBucketImageKeyName = process.env
    .BADGE_BUCKET_IMAGE_KEY_NAME as string;
  const passingSvgUrl =
    'https://img.shields.io/badge/AWS%20CodePipeline-passing-green.svg';
  const failSvgUrl =
    'https://img.shields.io/badge/AWS%20CodePipeline-fail-red.svg';
  const executionId = event.detail['execution-id'];
  const codePipelineName = process.env.CODE_PIPELINE_NAME as string;
  const githubPersonalToken =
    (process.env.GITHUB_PERSONAL_TOKEN as string) ?? '';
  const stageTitle = process.env.STAGE ? `${process.env.STAGE}: ` : '';

  if (webhookUrl) {
    const respData = await axios
      .create({
        headers: { 'Context-Type': 'application/json' },
      })
      .post(webhookUrl, { text: `${stageTitle}${subject}` });
    console.log(`webhookUrl response:\n ${respData}`);
  }

  let imageUrl: string | null = null;
  if (state == CodePipelineState.SUCCEEDED) {
    imageUrl = passingSvgUrl;
  } else if (CodePipelineFailState.includes(state)) {
    imageUrl = failSvgUrl;
  }

  console.log(`debug badge update image: ${imageUrl}`);
  if (imageUrl) {
    const imageResp = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    });

    const s3 = new S3Client({ region: 'ap-northeast-1' });
    await s3.send(
      new PutObjectCommand({
        Bucket: badgeBucket,
        Key: badgeBucketImageKeyName,
        Body: Buffer.from(imageResp.data),
        ContentType: 'image/svg+xml',
        CacheControl: 'cache-control: no-cache',
        Expires: new Date(Date.now()),
      })
    );
  }

  const sourceActionData = await getPipelineSourceActionData(
    executionId,
    codePipelineName
  );

  let sourceActionState: string | null = null;

  switch (state) {
    case CodePipelineState.STARTED:
    case CodePipelineState.RESUMED:
    case CodePipelineState.SUPERSEDED:
      sourceActionState = 'pending';
      break;

    case CodePipelineState.SUCCEEDED:
      sourceActionState = 'success';
      break;

    case CodePipelineState.CANCELED:
    case CodePipelineState.FAILED:
      sourceActionState = 'error';
      break;
  }

  console.log(`debug state: ${state}`);
  console.log(`debug sourceActionData: ${JSON.stringify(sourceActionData)}`);
  if (githubPersonalToken && sourceActionData && sourceActionState) {
    console.log(
      `sourceActionCommitStatusUrl:\n https://api.github.com/repos/${sourceActionData?.owner}/${sourceActionData?.repository}/statuses/${sourceActionData?.sha}`
    );
    const respSourceActionData = await axios
      .create({
        headers: {
          'Context-Type': 'application/json',
          Authorization: `token ${githubPersonalToken}`,
        },
      })
      .post(
        `https://api.github.com/repos/${sourceActionData?.owner}/${sourceActionData?.repository}/statuses/${sourceActionData?.sha}`,
        {
          state: sourceActionState,
          target_url: `https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/${codePipelineName}/view`,
          context: 'continuous-integration/codepipeline',
          description: `Build ${sourceActionState}`,
        }
      );
    console.log(respSourceActionData);
  }
};

const getPipelineSourceActionData = async (
  executionId: string,
  pipelineName: string
): Promise<SourceActionData | null> => {
  const client = new CodePipelineClient({
    region: 'ap-northeast-1',
  });
  const result = await client.send(
    new GetPipelineExecutionCommand({
      pipelineExecutionId: executionId,
      pipelineName: pipelineName,
    })
  );
  console.log(`pipeline data:\n ${JSON.stringify(result)}`);
  const artifactRevision = result.pipelineExecution?.artifactRevisions
    ? result.pipelineExecution?.artifactRevisions[0]
    : null;

  if (artifactRevision) {
    const revisionURL = artifactRevision.revisionUrl;
    const sha = artifactRevision.revisionId;
    const fullRepositoryId = new url.URL(
      revisionURL as string
    ).searchParams.get('FullRepositoryId') as string;

    return {
      owner: fullRepositoryId ? fullRepositoryId.split('/')[0] : '',
      repository: fullRepositoryId ? fullRepositoryId.split('/')[1] : '',
      sha: sha ? sha : '',
    };
  }

  return null;
};
