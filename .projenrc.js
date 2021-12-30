const {
  awscdk,
  Gitpod,
  DevEnvironmentDockerImage,
  JsonFile,
} = require('projen');

const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Chris Yang',
  authorUrl: 'https://9incloud.com/',
  cdkVersion: '2.1.0',
  majorVersion: 2,
  defaultReleaseBranch: 'main',
  releaseBranches: {
    cdkv1: { npmDistTag: 'cdkv1', majorVersion: 1 },
  },
  workflowNodeVersion: '14.17.0',
  keywords: ['aws', 'cdk', 'codepipeline', 'badge', 'notification'],
  jsiiFqn: 'projen.AwsCdkConstructLibrary',
  name: 'cdk-codepipeline-badge-notification',
  describe:
    'Create AWS CodePipeline badge, GitHub commit status, slack notification for AWS CDK',
  repositoryUrl: 'https://github.com/kimisme9386/cdk-codepipeline-badge-notification',
  python: {
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
    },
    ignoreProjen: false,
  },
});

new JsonFile(project, 'cdk.json', {
  obj: {
    app: 'npx ts-node --prefer-ts-exts src/integ.default.ts',
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
gitpodPrebuild.exec('npx projen upgrade');
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
