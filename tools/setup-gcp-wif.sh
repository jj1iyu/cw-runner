#!/bin/bash
# GitHub Actions から Firestore のルールを反映できるようにする（Google Cloud Shell で1回だけ実行）
#   鍵ファイルは作らない「Workload Identity 連携」。jj1iyu/cw-runner の main ブランチからだけ、
#   ルールの更新（と、そのための読み取り）ができる専用アカウントを用意する。何度実行しても同じ結果になる。
# 使い方（Cloud Shell で）:  bash <(curl -sL https://raw.githubusercontent.com/jj1iyu/cw-runner/main/tools/setup-gcp-wif.sh)
P=cw-runner
R=jj1iyu/cw-runner
SA=github-rules-deploy@$P.iam.gserviceaccount.com
N=$(gcloud projects describe $P --format='value(projectNumber)') || exit 1

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com firebaserules.googleapis.com --project $P

gcloud iam service-accounts describe $SA --project $P >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-rules-deploy --display-name='GitHub Actions: Firestore rules' --project $P

for role in roles/firebaserules.admin roles/firebase.viewer roles/datastore.viewer roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $P --member=serviceAccount:$SA --role=$role --condition=None -q >/dev/null &&
    echo "権限を付与: $role"
done

gcloud iam workload-identity-pools describe github --location=global --project $P >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location=global --display-name='GitHub Actions' --project $P

gcloud iam workload-identity-pools providers describe github-actions --location=global \
  --workload-identity-pool=github --project $P >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github-actions --location=global \
    --workload-identity-pool=github --display-name='jj1iyu/cw-runner main' \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' \
    --attribute-condition="assertion.repository=='$R' && assertion.ref=='refs/heads/main'" --project $P

gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$R" \
  --project $P -q >/dev/null && echo "GitHub との連携を設定しました"

echo
echo "GitHub のリポジトリ変数に次の2つを登録してください（Settings → Secrets and variables → Actions → Variables）"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER = projects/$N/locations/global/workloadIdentityPools/github/providers/github-actions"
echo "GCP_SERVICE_ACCOUNT            = $SA"
