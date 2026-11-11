// JA CW Runner：届いた意見を10分おきに確認してGmailで知らせる
var PROJECT_ID = 'cw-runner';
// 通知先のメールアドレス。リポジトリは公開なので、ここには書かず Apps Script 側にだけ書く
var TO = 'ここに通知先のメールアドレス';
var CAT = {bug: '不具合', idea: '要望・アイデア', other: 'その他'};

// 最初に1回だけ実行：10分おきの自動チェックを登録する
function setup() {
ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
PropertiesService.getScriptProperties().setProperty('lastAt', String(Date.now() - 24 * 60 * 60 * 1000));
ScriptApp.newTrigger('checkFeedback').timeBased().everyMinutes(10).create();
checkFeedback();
}

function checkFeedback() {
var props = PropertiesService.getScriptProperties();
var last = Number(props.getProperty('lastAt') || Date.now());
var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents:runQuery';
var query = {structuredQuery: {from: [{collectionId: 'feedback'}], where: {fieldFilter: {field: {fieldPath: 'at'}, op: 'GREATER_THAN', value: {integerValue: String(last)}}}, orderBy: [{field: {fieldPath: 'at'}, direction: 'ASCENDING'}], limit: 50}};
var res = UrlFetchApp.fetch(url, {method: 'post', contentType: 'application/json', payload: JSON.stringify(query), headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Goog-User-Project': PROJECT_ID}, muteHttpExceptions: true});
if (res.getResponseCode() !== 200) throw new Error('Firestore ' + res.getResponseCode() + ': ' + res.getContentText());
var rows = JSON.parse(res.getContentText()).filter(function (r) { return r.document; });
rows.forEach(function (r) {
var f = r.document.fields || {};
var v = function (k) { var x = f[k] || {}; return x.stringValue || x.integerValue || ''; };
var at = Number(v('at'));
var when = Utilities.formatDate(new Date(at), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
var cat = CAT[v('cat')] || v('cat');
var body = '種類：' + cat + '\nコールサイン：' + v('call') + '\n日時：' + when + '\n状況：' + v('info') + '\n\n' + v('text') + '\n\n---\nFirebaseで見る：https://console.firebase.google.com/project/' + PROJECT_ID + '/firestore/databases/-default-/data/~2Ffeedback';
MailApp.sendEmail({to: TO, subject: '【JA CW Runner】意見が届きました（' + cat + '）' + v('call'), body: body});
if (at > last) last = at;
});
props.setProperty('lastAt', String(last));
}
