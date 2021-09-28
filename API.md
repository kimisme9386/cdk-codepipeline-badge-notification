# API Reference

**Classes**

Name|Description
----|-----------
[CodePipelineBadgeNotification](#cdk-pipeline-status-codepipelinebadgenotification)|*No description*


**Structs**

Name|Description
----|-----------
[CodePipelineBadgeNotificationProps](#cdk-pipeline-status-codepipelinebadgenotificationprops)|*No description*
[GitHubTokenFromSecretsManager](#cdk-pipeline-status-githubtokenfromsecretsmanager)|*No description*
[Notification](#cdk-pipeline-status-notification)|*No description*



## class CodePipelineBadgeNotification 🔹 <a id="cdk-pipeline-status-codepipelinebadgenotification"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new CodePipelineBadgeNotification(scope: Construct, id: string, props: CodePipelineBadgeNotificationProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[CodePipelineBadgeNotificationProps](#cdk-pipeline-status-codepipelinebadgenotificationprops)</code>)  *No description*
  * **pipelineArn** (<code>string</code>)  AWS CodePipeline arn. 
  * **gitHubTokenFromSecretsManager** (<code>[GitHubTokenFromSecretsManager](#cdk-pipeline-status-githubtokenfromsecretsmanager)</code>)  AWS Secret Manager id or arn. __*Optional*__
  * **notification** (<code>[Notification](#cdk-pipeline-status-notification)</code>)  Notification. __*Optional*__



### Properties


Name | Type | Description 
-----|------|-------------
**badgeUrl**🔹 | <code>string</code> | <span></span>
**codePipelineLink**🔹 | <code>string</code> | <span></span>



## struct CodePipelineBadgeNotificationProps 🔹 <a id="cdk-pipeline-status-codepipelinebadgenotificationprops"></a>






Name | Type | Description 
-----|------|-------------
**pipelineArn**🔹 | <code>string</code> | AWS CodePipeline arn.
**gitHubTokenFromSecretsManager**?🔹 | <code>[GitHubTokenFromSecretsManager](#cdk-pipeline-status-githubtokenfromsecretsmanager)</code> | AWS Secret Manager id or arn.<br/>__*Optional*__
**notification**?🔹 | <code>[Notification](#cdk-pipeline-status-notification)</code> | Notification.<br/>__*Optional*__



## struct GitHubTokenFromSecretsManager 🔹 <a id="cdk-pipeline-status-githubtokenfromsecretsmanager"></a>






Name | Type | Description 
-----|------|-------------
**secretKey**?🔹 | <code>string</code> | SecretKey.<br/>__*Optional*__
**secretsManagerArn**?🔹 | <code>string</code> | Arn with other type of secrets.<br/>__*Optional*__



## struct Notification 🔹 <a id="cdk-pipeline-status-notification"></a>






Name | Type | Description 
-----|------|-------------
**ssmGoogleChatWebHookUrl**?🔹 | <code>string</code> | google chat webhook url from ssm parameter.<br/>__*Optional*__
**ssmSlackWebHookUrl**?🔹 | <code>string</code> | Slack webhook url from ssm parameter.<br/>__*Optional*__
**ssmTelegramWebHookUrl**?🔹 | <code>string</code> | telegram webhook url from from ssm parameter the URL is not include text query string.<br/>__*Optional*__
**stageName**?🔹 | <code>string</code> | Prefix title for slack message.<br/>__*Optional*__



