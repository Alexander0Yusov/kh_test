#!/bin/sh

set -eu

configure_storage_events() {
  bucket="$1"
  queue_name="$2"
  dlq_name="$3"

  awslocal s3api head-bucket --bucket "$bucket" >/dev/null 2>&1 ||
    awslocal s3api create-bucket --bucket "$bucket" >/dev/null

  queue_url="$(awslocal sqs create-queue \
    --queue-name "$queue_name" \
    --query QueueUrl \
    --output text)"
  dlq_url="$(awslocal sqs create-queue \
    --queue-name "$dlq_name" \
    --query QueueUrl \
    --output text)"
  dlq_arn="$(awslocal sqs get-queue-attributes \
    --queue-url "$dlq_url" \
    --attribute-names QueueArn \
    --query Attributes.QueueArn \
    --output text)"
  queue_arn="$(awslocal sqs get-queue-attributes \
    --queue-url "$queue_url" \
    --attribute-names QueueArn \
    --query Attributes.QueueArn \
    --output text)"

  policy="$(printf \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"s3.amazonaws.com"},"Action":"sqs:SendMessage","Resource":"%s","Condition":{"ArnLike":{"aws:SourceArn":"arn:aws:s3:::%s"}}}]}' \
    "$queue_arn" \
    "$bucket")"
  escaped_policy="$(printf '%s' "$policy" | sed 's/"/\\"/g')"
  attributes_file="/tmp/$queue_name-attributes.json"
  redrive_policy="$(printf \
    '{"deadLetterTargetArn":"%s","maxReceiveCount":"5"}' \
    "$dlq_arn")"
  escaped_redrive_policy="$(printf '%s' "$redrive_policy" | sed 's/"/\\"/g')"
  printf '{"Policy":"%s","RedrivePolicy":"%s"}' \
    "$escaped_policy" \
    "$escaped_redrive_policy" >"$attributes_file"
  awslocal sqs set-queue-attributes \
    --queue-url "$queue_url" \
    --attributes "file://$attributes_file"

  notification="$(printf \
    '{"QueueConfigurations":[{"Id":"object-created","QueueArn":"%s","Events":["s3:ObjectCreated:*"],"Filter":{"Key":{"FilterRules":[{"Name":"prefix","Value":"files/"}]}}}]}' \
    "$queue_arn")"
  configured_queue_arn="$(awslocal s3api get-bucket-notification-configuration \
    --bucket "$bucket" \
    --query "QueueConfigurations[?Id=='object-created'].QueueArn | [0]" \
    --output text)"
  configured_event="$(awslocal s3api get-bucket-notification-configuration \
    --bucket "$bucket" \
    --query "QueueConfigurations[?Id=='object-created'].Events[0] | [0]" \
    --output text)"
  configured_prefix="$(awslocal s3api get-bucket-notification-configuration \
    --bucket "$bucket" \
    --query "QueueConfigurations[?Id=='object-created'].Filter.Key.FilterRules[?Name=='Prefix'].Value | [0]" \
    --output text)"

  if [ "$configured_queue_arn" != "$queue_arn" ] ||
    [ "$configured_event" != 's3:ObjectCreated:*' ] ||
    [ "$configured_prefix" != 'files/' ]; then
    awslocal s3api put-bucket-notification-configuration \
      --bucket "$bucket" \
      --notification-configuration "$notification"
  fi
}

configure_storage_events \
  'dzencode-files' \
  'dzencode-file-upload-events-dev' \
  'dzencode-file-upload-events-dlq-dev'
configure_storage_events \
  'dzencode-files-test' \
  'dzencode-file-upload-events-test' \
  'dzencode-file-upload-events-dlq-test'
