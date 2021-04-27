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
  describe: '',
  repositoryUrl: 'git@github.com:owner/repo.git',
  cdkDependencies: [
    '@aws-cdk/core',
    '@aws-cdk/aws-codepipeline',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-events-targets',
    '@aws-cdk/aws-s3',
  ],
  devDeps: ['projen-automate-it'],
  dependabot: false,
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
