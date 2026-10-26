#!/usr/bin/env bash
set -euo pipefail

: "${EDGE_API_KEY:?Missing EDGE_API_KEY secret}"
: "${EDGE_CLIENT_ID:?Missing EDGE_CLIENT_ID secret}"
: "${EDGE_PRODUCT_ID:?Missing EDGE_PRODUCT_ID secret}"

zip_path="$(find release-assets -type f -name 'chatgpt-audio-controls-v*.zip' -print -quit)"
: "${zip_path:?Release ZIP was not found}"
api_root="https://api.addons.microsoftedge.microsoft.com/v1/products/$EDGE_PRODUCT_ID"
auth_args=(
  --header "Authorization: ApiKey $EDGE_API_KEY"
  --header "X-ClientID: $EDGE_CLIENT_ID"
)

poll_operation() {
  local operation_url="$1"
  local operation_name="$2"
  local operation_response
  local operation_status

  for attempt in {1..60}; do
    operation_response="$(curl --fail-with-body --silent --show-error \
      --request GET \
      "${auth_args[@]}" \
      "$operation_url")"
    operation_status="$(jq -er '.status' <<< "$operation_response")"
    echo "Edge $operation_name status ($attempt/60): $operation_status"

    case "$operation_status" in
      Succeeded)
        return 0
        ;;
      Failed)
        if jq -e '.errorCode == "ModuleStateUnPublishable" and any(.errors[]?; (.message // "") | contains("LISTING"))' <<< "$operation_response" >/dev/null; then
          echo '::error title=Edge store listings incomplete::Package upload does not populate store descriptions or logos. Complete every included language in Partner Center > Store listings, save each draft, then retry only Edge. Use the edge-store-listings artifact for localized text and logos.' >&2
          if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
            cat >> "$GITHUB_STEP_SUMMARY" <<'SUMMARY'
### Edge submission blocked by store listings

The package processing step and the listing validation step are separate. Edge rejected the LISTING module.
Download this run's **edge-store-listings** artifact, then complete the description and logo for every included language in Partner Center and save each draft.
The [Edge Update REST API does not support metadata updates](https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api#using-the-api-endpoints).
After saving valid listings, retry the workflow on **master** with **publish_to_stores=yes** and **store=edge**. Do not rerun Chrome for this failure.
SUMMARY
          fi
        fi
        echo "$operation_response" | jq . >&2
        return 1
        ;;
      InProgress)
        sleep 5
        ;;
      *)
        echo "$operation_response" | jq . >&2
        return 1
        ;;
    esac
  done

  echo "Edge $operation_name did not finish within the polling window." >&2
  return 1
}

upload_headers="$(mktemp)"
upload_body="$(mktemp)"
curl --fail-with-body --silent --show-error \
  --dump-header "$upload_headers" \
  --output "$upload_body" \
  --request POST \
  "${auth_args[@]}" \
  --header "Content-Type: application/zip" \
  --upload-file "$zip_path" \
  "$api_root/submissions/draft/package"

upload_location="$(awk 'BEGIN { IGNORECASE=1 } /^Location:/ { sub(/\r$/, ""); sub(/^[^:]+:[[:space:]]*/, ""); print; exit }' "$upload_headers")"
: "${upload_location:?Edge upload did not return an operation Location header}"
upload_operation_id="${upload_location##*/}"
poll_operation "$api_root/submissions/draft/package/operations/$upload_operation_id" "package upload"

publish_headers="$(mktemp)"
publish_body="$(mktemp)"
curl --fail-with-body --silent --show-error \
  --dump-header "$publish_headers" \
  --output "$publish_body" \
  --request POST \
  "${auth_args[@]}" \
  --header "Content-Type: application/json" \
  --data "{\"notes\":\"Automated release from GitHub Actions: $GITHUB_REF_NAME\"}" \
  "$api_root/submissions"

publish_location="$(awk 'BEGIN { IGNORECASE=1 } /^Location:/ { sub(/\r$/, ""); sub(/^[^:]+:[[:space:]]*/, ""); print; exit }' "$publish_headers")"
: "${publish_location:?Edge publish did not return an operation Location header}"
publish_operation_id="${publish_location##*/}"
poll_operation "$api_root/submissions/operations/$publish_operation_id" "submission"

echo "Microsoft Edge Add-ons submission accepted for certification."
