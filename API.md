# API Reference

**Classes**

Name|Description
----|-----------
[CodePipelineStatus](#cdk-codepipeline-badge-notification-codepipelinestatus)|*No description*


**Structs**

Name|Description
----|-----------
[CodePipelineStatusProps](#cdk-codepipeline-badge-notification-codepipelinestatusprops)|*No description*
[GitHubTokenFromSecretsManager](#cdk-codepipeline-badge-notification-githubtokenfromsecretsmanager)|*No description*
[Notification](#cdk-codepipeline-badge-notification-notification)|*No description*



## class CodePipelineStatus 🔹 <a id="cdk-codepipeline-badge-notification-codepipelinestatus"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new CodePipelineStatus(scope: Construct, id: string, props: CodePipelineStatusProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[CodePipelineStatusProps](#cdk-codepipeline-badge-notification-codepipelinestatusprops)</code>)  *No description*
  * **pipelineArn** (<code>string</code>)  AWS CodePipeline arn. 
  * **gitHubTokenFromSecretsManager** (<code>[GitHubTokenFromSecretsManager](#cdk-codepipeline-badge-notification-githubtokenfromsecretsmanager)</code>)  AWS Secret Manager id or arn. __*Optional*__
  * **notification** (<code>[Notification](#cdk-codepipeline-badge-notification-notification)</code>)  Notification. __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**badgeUrl**🔹 | <code>string</code> | <span></span>
**codePipelineLink**🔹 | <code>string</code> | <span></span>



## struct CodePipelineStatusProps 🔹 <a id="cdk-codepipeline-badge-notification-codepipelinestatusprops"></a>






Name | Type | Description 
-----|------|-------------
**pipelineArn**🔹 | <code>string</code> | AWS CodePipeline arn.
**gitHubTokenFromSecretsManager**?🔹 | <code>[GitHubTokenFromSecretsManager](#cdk-codepipeline-badge-notification-githubtokenfromsecretsmanager)</code> | AWS Secret Manager id or arn.<br/>__*Optional*__
**notification**?🔹 | <code>[Notification](#cdk-codepipeline-badge-notification-notification)</code> | Notification.<br/>__*Optional*__



## struct GitHubTokenFromSecretsManager 🔹 <a id="cdk-codepipeline-badge-notification-githubtokenfromsecretsmanager"></a>






Name | Type | Description 
-----|------|-------------
**secretKey**?🔹 | <code>string</code> | SecretKey.<br/>__*Optional*__
**secretsManagerArn**?🔹 | <code>string</code> | Arn with other type of secrets.<br/>__*Optional*__



## struct Notification 🔹 <a id="cdk-codepipeline-badge-notification-notification"></a>






Name | Type | Description 
-----|------|-------------
**slackWebHookUrl**?🔹 | <code>string</code> | Slack webhook url.<br/>__*Optional*__
**stageName**?🔹 | <code>string</code> | Prefix title for slack message.<br/>__*Optional*__



