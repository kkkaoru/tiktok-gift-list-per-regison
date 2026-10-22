// Runs with bun.
// The report (Markdown): Japan's TikTok LIVE gift list read without and with a signed-in session,
// for one live (its room) and without a live. Only the signed-in list says which gifts the live
// screen shows (is_displayed_on_panel), so each comparison lists those, the anonymous gifts the
// screen does not show, and the report says how the lists are read. Table rows follow the atlas
// cells (left to right, top to bottom).
import { GATEWAY_LIMITS } from '../regions/regions'
import { diffPanels } from '../tiktok/tiktok'
import type { TikTokGift } from '../tiktok/tiktok'

interface AnonymousPanel {
  readonly awsRegion: string
  readonly fetchedAt: string
  readonly gifts: readonly TikTokGift[]
}

// The signed-in list: only the gifts the live screen shows, and how many the list had.
interface SignedInPanel {
  readonly fetchedAt: string
  readonly gifts: readonly TikTokGift[]
  readonly listed: number
}

// The live both lists were read for (its room_id).
interface LiveRoom {
  readonly roomId: string
  // The live's page, when it was given as a user.
  readonly url: string | null
}

// One signed-out / signed-in pair; live null: read without a live.
interface Comparison {
  readonly anonymous: AnonymousPanel
  readonly live: LiveRoom | null
  readonly signedIn: SignedInPanel
}

interface ReportInput {
  readonly comparisons: readonly Comparison[]
}

interface ComparisonPaths {
  readonly anonymousAtlas: string
  readonly anonymousJson: string
  readonly hiddenAtlas: string
  readonly hiddenCsv: string
  readonly shownCsv: string
  readonly signedInAtlas: string
  readonly signedInJson: string
  readonly signedInOnlyCsv: string
}

interface GiftSection {
  readonly csv: string
  readonly gifts: readonly TikTokGift[]
  // null: a list without an atlas.
  readonly image: string | null
  readonly title: string
}

// The language code both lists are read with. Only webcast_language sets the gift names
// (app_language does not; without it TikTok answers in English); both are sent with this value.
export const NAME_LANGUAGE: string = 'ja-JP'

// A comparison's files next to the report: live/ for the live, no-live/ without one.
export const comparisonPaths = (live: LiveRoom | null): ComparisonPaths => {
  const folder = live === null ? 'no-live' : 'live'
  return {
    anonymousAtlas: `${folder}/anonymous.png`,
    anonymousJson: `${folder}/anonymous.json`,
    hiddenAtlas: `${folder}/hidden.png`,
    hiddenCsv: `${folder}/hidden.csv`,
    shownCsv: `${folder}/shown.csv`,
    signedInAtlas: `${folder}/signed-in.png`,
    signedInJson: `${folder}/signed-in.json`,
    signedInOnlyCsv: `${folder}/signed-in-only.csv`,
  }
}

const ROOM_QUERY: string = '&room_id=<配信の room（配信を指定するときだけ）>'

// How the anonymous list is read from Japan's IP (no gateway URL: it stays in .relay/).
const ANONYMOUS_HOW: readonly string[] = [
  '### ログインなし',
  '',
  'TikTok はギフト欄の地域を接続元の IP で決めます。AWS の東京リージョン（ap-northeast-1）に置いた API Gateway（REST API、HTTP プロキシ統合）を経由し、日本の IP からログインせずに問い合わせています。',
  '',
  '```',
  `GET <東京リージョンのゲートウェイ>/gift-list?aid=1988&device_platform=web_pc&app_language=${NAME_LANGUAGE}&webcast_language=${NAME_LANGUAGE}${ROOM_QUERY}`,
  'x-api-key: <API キー>',
  '```',
  '',
  '- ゲートウェイは `https://webcast.tiktok.com/webcast/gift/list/` に転送します（クエリとヘッダーはそのまま）',
  '- 配信を指定するときは `room_id` にその配信の room を付けます（その配信を開いたときと同じ一覧）。room はユーザー名から、ゲートウェイの `/user-room`（`https://www.tiktok.com/api-live/user/room/`）で調べます。配信を指定しないときは付けません（特定の配信に依存しない一覧）',
  `- 呼び出しには API キーが必須で、${GATEWAY_LIMITS.rate} リクエスト/秒・1 日 ${GATEWAY_LIMITS.daily} リクエストに制限しています。ゲートウェイの URL と API キーは公開していません`,
  '- 構築は AWS CDK（`src/cdk/`）、`AWS_PROFILE=<プロファイル> bun run deploy` でデプロイします',
  '',
]

// How the signed-in list is read (no session values).
const SIGNED_IN_HOW: readonly string[] = [
  '### ログインあり',
  '',
  'TikTok にログインしたアカウントのセッション Cookie `sessionid`（32 桁の 16 進数）を付けて、同じ一覧を日本の IP（手元）から問い合わせています。',
  '',
  '```',
  `GET https://webcast.tiktok.com/webcast/gift/list/?aid=1988&device_platform=web_pc&app_language=${NAME_LANGUAGE}&webcast_language=${NAME_LANGUAGE}${ROOM_QUERY}`,
  'Cookie: sessionid=<ログイン済みアカウントのセッション>',
  '```',
  '',
  '- ログインありの一覧では、配信画面のギフト欄（下のバーと「More」）に出すギフトだけ `is_displayed_on_panel` が true になります。ログインなしではすべて false です',
  '- セッションは Git 管理外のファイル（`private/tiktok-sessionid.secret`、権限 0600）から環境変数 `TIKTOK_SESSIONID` に読み込みます。値はログ・結果に書かず、AWS にも送りません',
  '',
]

// Which query values change the gift names, as observed on the gift list.
const LANGUAGE_SECTION: readonly string[] = [
  '## ギフト名の言語コード',
  '',
  'ギフト名（`name`）は、ギフト一覧 API のクエリの言語コードで決まります。この取得では次の値を送っています（ログインなし・ありとも同じ）。',
  '',
  '| クエリ | 送った値 | ギフト名への影響 |',
  '| --- | --- | --- |',
  `| \`webcast_language\` | \`${NAME_LANGUAGE}\` | ギフト名の言語を決める。省略すると英語になる |`,
  `| \`app_language\` | \`${NAME_LANGUAGE}\` | ギフト名には影響しない（\`webcast_language\` と同じ値をそろえて送っている） |`,
  '',
  '- 確認例: `webcast_language=ja-JP` では「バラ」「天才」、`en-US` または省略では「Rose」「Genius」。`app_language` だけを変えても名前は変わりません',
  '- どのギフトが一覧に並ぶか（giftId の集合）は言語コードでは変わらず、接続元の IP で決まります。比較は giftId で行うため、言語コードは差分に影響しません',
  '- 値は `src/report/report.ts` の `NAME_LANGUAGE` で定義しています',
  '',
]

const CSV_HEADER: string = 'no,giftId,name,coins,imageUrl'

// RFC 4180: a field with a comma, quote or line break is quoted, quotes doubled (TikTok names can
// carry line breaks).
const csvField = (value: string | number): string => {
  const text = String(value)
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

const fewerCoins = (a: TikTokGift, b: TikTokGift): number => a.coins - b.coins

// Atlas and CSV order: coins ascending; a stable sort keeps the panel order among equal prices.
export const byCoins = (gifts: readonly TikTokGift[]): readonly TikTokGift[] =>
  gifts.toSorted(fewerCoins)

// A gift list as CSV, in the given order (byCoins: the atlas order), with a header row.
export const giftCsv = (gifts: readonly TikTokGift[]): string =>
  `${[
    CSV_HEADER,
    ...gifts.map((gift, index) =>
      [index + 1, gift.giftId, gift.name, gift.coins, gift.imageUrl].map(csvField).join(','),
    ),
  ].join('\r\n')}\r\n`

// Results folder of a fetch: its date in Japan (where the fetches are run), not in UTC.
export const resultDate = (fetchedAt: string): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date(fetchedAt))

// What a comparison was read for.
export const targetName = (live: LiveRoom | null): string => {
  if (live === null) {
    return '配信を指定しない一覧'
  }
  return live.url === null
    ? `配信（room ${live.roomId}）の一覧`
    : `配信 ${live.url}（room ${live.roomId}）の一覧`
}

// The list itself lives in the CSV; the report keeps the count, the atlas and the link.
const section = ({ csv, gifts, image, title }: GiftSection): readonly string[] =>
  gifts.length === 0
    ? [`### ${title}: なし`, '']
    : [
        `### ${title}: ${gifts.length} 種類`,
        '',
        ...(image === null ? [] : [`![${title}](${image})`, '']),
        `リスト: [${csv}](${csv})`,
        '',
      ]

// The anonymous gifts the live screen does not show (anonymous order).
export const hiddenGifts = ({ anonymous, signedIn }: Comparison): readonly TikTokGift[] =>
  diffPanels(signedIn.gifts, anonymous.gifts).added

// The gifts the live screen shows that the signed-out list lacks.
export const signedInOnly = ({ anonymous, signedIn }: Comparison): readonly TikTokGift[] =>
  diffPanels(anonymous.gifts, signedIn.gifts).added

const overviewRows = ({ anonymous, live, signedIn }: Comparison): readonly string[] => {
  const paths = comparisonPaths(live)
  return [
    `| ${targetName(live)} | ログインなし（AWS の API Gateway ${anonymous.awsRegion} 経由） | ${anonymous.gifts.length} | 判別できない（\`is_displayed_on_panel\` がすべて false） | [画像](${paths.anonymousAtlas})・[JSON](${paths.anonymousJson}) |`,
    `| ${targetName(live)} | ログインあり（セッション Cookie、手元から） | ${signedIn.listed} | ${signedIn.gifts.length} | [画像](${paths.signedInAtlas})・[JSON](${paths.signedInJson}) |`,
  ]
}

const comparisonSection = (comparison: Comparison): readonly string[] => {
  const { anonymous, live, signedIn } = comparison
  const paths = comparisonPaths(live)
  return [
    `## ${targetName(live)}`,
    '',
    `取得: ログインなし ${anonymous.fetchedAt}、ログインあり ${signedIn.fetchedAt}`,
    '',
    ...section({
      csv: paths.shownCsv,
      gifts: signedIn.gifts,
      image: paths.signedInAtlas,
      title: 'ログインありで配信画面に出るギフト',
    }),
    ...section({
      csv: paths.hiddenCsv,
      gifts: hiddenGifts(comparison),
      image: paths.hiddenAtlas,
      title: 'ログインなしの一覧にあり、ログインありでは配信画面に出ないギフト',
    }),
    ...section({
      csv: paths.signedInOnlyCsv,
      gifts: signedInOnly(comparison),
      image: null,
      title: 'ログインありで配信画面に出て、ログインなしの一覧にないギフト',
    }),
  ]
}

export const reportMarkdown = ({ comparisons }: ReportInput): string =>
  [
    '# TikTok LIVE のギフト欄（日本、ログインあり・なしの差）',
    '',
    `日本の IP から取得したギフト一覧を、ログインなしとログインありで比べています（${comparisons.map((comparison) => targetName(comparison.live)).join('、')}）。比較は giftId、ギフト名は \`webcast_language=${NAME_LANGUAGE}\` で取得した日本語です（「ギフト名の言語コード」参照）。リストは CSV（\`no,giftId,name,coins,imageUrl\`）で、CSV と画像はコインの少ない順（同じコインならギフト欄の表示順）、画像は左上から右へ、行ごとです。`,
    '',
    '## 概要',
    '',
    '| 対象 | 取得方法 | API の一覧 | 配信画面に出るギフト | 画像・データ |',
    '| --- | --- | ---: | ---: | --- |',
    ...comparisons.flatMap(overviewRows),
    '',
    '配信画面のギフト欄に出るのは、ログインありの一覧で `is_displayed_on_panel` が true のギフトだけです（配信を開いて数えたギフト欄の件数が、その配信を指定したログインありの一覧で true の件数と一致することを確認済み）。ログインなしの一覧には、配信画面に出ないギフトも含まれます。',
    '',
    ...comparisons.flatMap(comparisonSection),
    '## 取得方法',
    '',
    ...ANONYMOUS_HOW,
    ...SIGNED_IN_HOW,
    ...LANGUAGE_SECTION,
  ].join('\n')

export type { AnonymousPanel, Comparison, LiveRoom, ReportInput, SignedInPanel }
