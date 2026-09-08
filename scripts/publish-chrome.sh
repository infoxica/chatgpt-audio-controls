#!/usr/bin/env bash
set -euo pipefail

: "${CHROME_CLIENT_ID:?Missing CHROME_CLIENT_ID secret}"
: "${CHROME_CLIENT_SECRET:?Missing CHROME_CLIENT_SECRET secret}"
: "${CHROME_REFRESH_TOKEN:?Missing CHROME_REFRESH_TOKEN secret}"
: "${CHROME_PUBLISHER_ID:?Missing CHROME_PUBLISHER_ID secret}"
: "${CHROME_EXTENSION_ID:?Missing CHROME_EXTENSION_ID secret}"

zip_path="$(find release-assets -type f -name 'chatgpt-audio-controls-v*.zip' -print -quit)"
: "${zip_path:?Release ZIP was not found}"

token_response="$(curl --fail-with-body --silent --show-error \
  --request POST \
  --data-urlencode "client_id=$CHROME_CLIENT_ID" \
  --data-urlencode "client_secret=$CHROME_CLIENT_SECRET" \
  --data-urlencode "refresh_token=$CHROME_REFRESH_TOKEN" \
  --data-urlencode "grant_type=refresh_token" \
  https://oauth2.googleapis.com/token)"
access_token="$(jq -er '.access_token' <<< "$token_response")"

echo "::add-mask::$access_token"

item_path="publishers/$CHROME_PUBLISHER_ID/items/$CHROME_EXTENSION_ID"
upload_response="$(curl --fail-with-body --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $access_token" \
  --header "Content-Type: application/zip" \
  --upload-file "$zip_path" \
  "https://chromewebstore.googleapis.com/upload/v2/$item_path:upload")"
upload_state="$(jq -er '.uploadState' <<< "$upload_response")"
echo "Chrome Web Store upload state: $upload_state"

if [[ "$upload_state" == "IN_PROGRESS" ]]; then
  for attempt in {1..30}; do
    sleep 5
    status_response="$(curl --fail-with-body --silent --show-error \
      --request GET \
      --header "Authorization: Bearer $access_token" \
      "https://chromewebstore.googleapis.com/v2/$item_path:fetchStatus")"
    upload_state="$(jq -er '.lastAsyncUploadState' <<< "$status_response")"
    echo "Chrome Web Store upload state ($attempt/30): $upload_state"
    [[ "$upload_state" == "SUCCEEDED" ]] && break
    [[ "$upload_state" == "FAILED" || "$upload_state" == "NOT_FOUND" ]] && {
      echo "$status_response" | jq . >&2
      exit 1
    }
  done
fi

[[ "$upload_state" == "SUCCEEDED" ]] || {
  echo "Chrome Web Store upload did not succeed: $upload_response" >&2
  exit 1
}

publish_response="$(curl --fail-with-body --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $access_token" \
  "https://chromewebstore.googleapis.com/v2/$item_path:publish")"
echo "Chrome Web Store submission accepted:"
echo "$publish_response" | jq .

