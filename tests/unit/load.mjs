// アプリ本体から「画面に依存しない部分」だけを読み込んで、テストから呼べるようにする
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const FILES = ['00-settings.js', '10-data-ja.js', '11-util.js', '12-data-dx.js', '25-rules.js'];
const EXPORTS = [
  'S',
  'DEF',
  'AREAS',
  'normNr',
  'cut',
  'lev',
  'matches',
  'pad2',
  'genDX',
  'DXE',
  'keyOf',
  'QMAX',
  'MMAX',
  'capOf',
  'validRun',
  'contestLabel',
  'modeLabel',
  'durLabel',
  'jstDay',
  'jstMonth',
  'DAY_MAX',
  'practiceOf',
  'docOf',
  'countRun',
  'TIERS',
  'tierOf',
  'validCall'
];

// now を渡すと Date.now() をその時刻に固定する
export function loadLogic({ now } = {}) {
  const store = new Map();
  const RealDate = Date;
  const FakeDate = class extends RealDate {
    constructor(...a) {
      super(...(a.length ? a : [now ?? RealDate.now()]));
    }
    static now() {
      return now ?? RealDate.now();
    }
  };
  const context = vm.createContext({
    Date: now == null ? RealDate : FakeDate,
    Math,
    JSON,
    console,
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
    window: {}
  });
  const code = FILES.map(f => fs.readFileSync(path.join(root, 'src/js', f), 'utf8')).join('\n');
  return vm.runInContext(`${code}\n;({${EXPORTS.join(',')}})`, context);
}

export function loadData() {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'data/cwr-data.js'), 'utf8'), context);
  return context.window.CWR_DATA;
}
