const {
  AwsCdkConstructLibrary,
  DependenciesUpgradeMechanism,
  Gitpod,
  DevEnvironmentDockerImage,
} = require('projen');

const AUTOMATION_TOKEN = 'PROJEN_GITHUB_TOKEN';

const project = new AwsCdkConstructLibrary({
  author: 'Chris Yang',
  authorUrl: 'https://9incloud.com/',
  cdkVersion: '1.100.0',
  defaultReleaseBranch: 'main',
  keywords: ['aws', 'cdk', 'codepipeline', 'badge', 'notification'],
  jsiiFqn: 'projen.AwsCdkConstructLibrary',
  name: 'cdk-codepipeline-badge-notification',
  describe:
    'Create AWS CodePipeline badge, GitHub commit status, slack notification for AWS CDK',
  repositoryUrl: 'https://github.com/kimisme9386/cdk-codepipeline-badge-notification',
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
    '@aws-cdk/aws-ssm',
  ],
  devDeps: ['projen-automate-it'],
  publishToPypi: {
    distName: 'cdk-codepipeline-badge-notification',
    module: 'cdk_codepipeline_badge_notification',
  },
  catalog: {
    announce: true,
  },
  stability: 'experimental',
  autoApproveOptions: {
    secret: 'GITHUB_TOKEN',
    allowedUsernames: ['kimisme9386-bot'],
  },
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ['auto-approve'],
      secret: AUTOMATION_TOKEN,
    },
    ignoreProjen: false,
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

const common_include = ['/lambda/codepipeline-event/tsconfig.json'];

project.npmignore.include(...common_include);
project.gitignore.include(...common_include);

// integration test
const cdkDiffInteg = project.addTask('cdk:diff-integ', {
  description: 'cdk diff for integration test',
});

cdkDiffInteg.exec('cdk diff --app "npx ts-node --prefer-ts-exts src/integ.default.ts" -R --require-approval never');

const cdkDeployInteg = project.addTask('cdk:deploy-integ', {
  description: 'cdk diff for integration test',
});

cdkDeployInteg.exec('cdk deploy --app "npx ts-node --prefer-ts-exts src/integ.default.ts" -R --require-approval never');


// gitpod
const gitpodPrebuild = project.addTask('gitpod:prebuild', {
  description: 'Prebuild setup for Gitpod',
});
gitpodPrebuild.exec('npm -g i aws-cdk');
gitpodPrebuild.exec('yarn install --frozen-lockfile --check-files');

let gitpod = new Gitpod(project, {
  dockerImage: DevEnvironmentDockerImage.fromFile('.gitpod.Dockerfile'),
  prebuilds: {
    addCheck: true,
    addBadge: true,
    addLabel: true,
    branches: true,
    pullRequests: true,
    pullRequestsFromForks: true,
  },
});

gitpod.addCustomTask({
  name: 'install package and check zsh and zsh plugin',
  init: `yarn gitpod:prebuild
sudo chmod +x ./.gitpod/oh-my-zsh.sh && ./.gitpod/oh-my-zsh.sh`,
});

gitpod.addCustomTask({
  name: 'change default shell to zsh and start zsh shell',
  command: 'sudo chsh -s $(which zsh) && zsh',
});

/* spellchecker: disable */
gitpod.addVscodeExtensions(
  'dbaeumer.vscode-eslint'
);


project.synth();
