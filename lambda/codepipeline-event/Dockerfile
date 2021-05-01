FROM public.ecr.aws/lambda/nodejs:14

COPY codepipelineEventLambda.ts tsconfig.json package.json package-lock.json ${LAMBDA_TASK_ROOT}/

RUN npm install && npm run build && npm install --only=production