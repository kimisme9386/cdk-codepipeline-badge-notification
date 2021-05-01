const { AwsCdkConstructLibrary } = require('projen');

const { Automation } = require('projen-automate-it');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  author: 'Chris Yang',
  authorAddress: 'kimisem9386@gmail.com',
  cdkVersion: '1.100.0',
  defaultReleaseBranch: 'main',
  jsiiFqn: 'projen.AwsCdkConstructLibrary',
  name: 'cdk-pipeline-status',
  describe:
    'Create AWS CodePipeline badge, GitHub commit status, slack notification for AWS CDK',
  repositoryUrl: 'https://github.com/kimisme9386/cdk-codepipeline-status',
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-codepipeline',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-s3',
    '@aws-cdk/aws-codepipeline-actions',
    '@aws-cdk/aws-codebuild',
    '@aws-cdk/aws-secretsmanager',
    '@aws-cdk/aws-iam',
  ],
  devDeps: ['projen-automate-it'],
  dependabot: false,
  publishToPypi: {
    distName: 'cdk-pipeline-status',
    module: 'cdk_pipeline_status',
  },
});

project.eslint.addRules({
  'comma-dangle': [
    'error',
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    },
  ],
});

const automation = new Automation(project, {
  automationToken: AUTOMATION_TOKEN,
});

automation.projenYarnUpgrade();
automation.autoApprove();

const common_exclude = [
  'cdk.out',
  'cdk.context.json',
  'images',
  'yarn-error.log',
  'dependabot.yml',
  'lambda/codepipeline-event/dist',
];

project.npmignore.exclude(...common_exclude);
project.gitignore.exclude(...common_exclude);

project.synth();
