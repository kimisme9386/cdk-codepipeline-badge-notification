import {
  CodePipelineClient,
  GetPipelineExecutionCommand,
} from '@aws-sdk/client-codepipeline';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Callback, CodePipelineCloudWatchEvent, Context } from 'aws-lambda';
import { default as axios } from 'axios';
import url from 'url';

enum ChatProvider {
  SLACK = 'slack',
  GOOGLE_CHAT = 'google_chat',
  TELEGRAM = 'telegram',
}

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
  const stageTitle = process.env.STAGE ? `[${process.env.STAGE}] \n` : '';
  const subject = `CodePIpeline Name: ${event.detail.pipeline} \n`;
  const codePipelineLink = `https://ap-northeast-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/${event.detail.pipeline}/view`;
  const stateMessage = getStateMessage(state, event['detail-type'], codePipelineLink);
  const slackUrl = (process.env.SLACK_WEBHOOK_URL as string) ?? '';
  const googleChatUrl = (process.env.GOOGLE_CHAT_WEBHOOK_URL as string) ?? '';
  const telegramUrl = (process.env.TELEGRAM_WEBHOOK_URL as string) ?? '';
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

  if (slackUrl) {
    await sendMessageToWebHook(ChatProvider.SLACK, slackUrl, `${stageTitle}${subject}${stateMessage}`);
  }

  if (googleChatUrl) {
    await sendMessageToWebHook(ChatProvider.GOOGLE_CHAT, googleChatUrl, `${stageTitle}${subject}${stateMessage}`);
  }

  if (telegramUrl) {
    await sendMessageToWebHook(ChatProvider.TELEGRAM, telegramUrl, `${stageTitle}${subject}${stateMessage}`);
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

const getStateMessage = (
  state: string,
  title: string,
  codePipelineLink: string,
): string => {
  let returnMessage = '';
  switch (state) {
    case CodePipelineState.STARTED:
      returnMessage = `${title}: ${state} 🚀 \n `;
      break;

    case CodePipelineState.SUCCEEDED:
      returnMessage = `${title}: ${state} ✅ \n `;
      break;

    case CodePipelineState.FAILED:
      returnMessage = `${title}: ${state} ❌ \n See more details: ${codePipelineLink} \n `;
      break;

    default:
      returnMessage = `${title}: ${state}`;
  }
  return returnMessage;
}

const sendMessageToWebHook = async (
  serviceType: string,
  webhookRUL: string,
  message: string,
):Promise<void> => {
  let respData: string;
  switch (serviceType) {
    case ChatProvider.SLACK:
    case ChatProvider.GOOGLE_CHAT:
      respData = await axios
          .create({
            headers: { 'Context-Type': 'application/json; charset=UTF-8' },
          })
          .post(webhookRUL, { text: message });      
    break;

    case ChatProvider.TELEGRAM:
      respData = await axios
          .create({
            headers: { 'Context-Type': 'application/json; charset=UTF-8' },
          })
          .get(`${webhookRUL}&text=${encodeURIComponent(message)}`);
      break;

    default:
      respData = '';
  }
  console.log(`webhookUrl response:\n ${respData}`);
}

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
