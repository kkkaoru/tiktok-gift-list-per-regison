# TikTok LIVE のギフト欄（地域別）

取得 2026-10-22T10:56:12.870Z。各地域のギフト欄は、その AWS リージョンの API Gateway から配信を指定せずに取得した一覧（TikTok は接続元の IP で地域を決める）。
ギフト名はその地域の言語で、比較は giftId で JP を基準にしています。画像は表の順（左上から右へ、行ごと）。

## 概要

| 地域 | AWS リージョン | 言語 | ギフト数 | JP と共通 | JP になし | 画像 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| JP | ap-northeast-1 | ja-JP | 689 | 689 | 0 | [一覧](images/JP.png) |
| US | us-east-1 | en-US | 691 | 598 | 93 | [一覧](images/US.png) |
| GB | eu-west-2 | en-GB | 765 | 598 | 167 | [一覧](images/GB.png) |
| SG | ap-southeast-1 | en-SG | 652 | 599 | 53 | [一覧](images/SG.png) |

## ギフト名の言語

ギフト一覧 API（`https://webcast.tiktok.com/webcast/gift/list/`）のクエリ `app_language` と `webcast_language` に言語コード（`ja-JP`・`en-US`・`en-GB`・`zh-Hans` など）を指定すると、`name` がその言語で返ります。

```
https://webcast.tiktok.com/webcast/gift/list/?aid=1988&device_platform=web_pc&app_language=en-US&webcast_language=en-US
```

- どのギフトが並ぶかは言語ではなく接続元の IP（地域）で決まります。言語コードを変えても giftId の集合は変わらず、名前だけが変わります
- `region` などの地域パラメーターは無視されます。地域は API Gateway のリージョンで切り替えています
- 各地域で使う言語コードは `src/regions/regions.ts` の `language` で変更できます（上の概要の「言語」列）

## JP との差分

### US（us-east-1、en-US）

#### JP になく US にある: 93 種類

![JP になく US にある](images/US-added.png)

| # | giftId | 名前 | コイン |
| ---: | ---: | --- | ---: |
| 1 | 8568 | Bran Castle | 15000 |
| 2 | 8970 | Pyramids | 15000 |
| 3 | 17428 | Amethyst Tiger | 15000 |
| 4 | 18189 | Time for Family | 15000 |
| 5 | 10619 | Gimme The Mic | 12000 |
| 6 | 10649 | Convertible | 12000 |
| 7 | 12693 | Boo's Town | 10000 |
| 8 | 12428 | LIVE Pro Trophy | 5000 |
| 9 | 12663 | Wanda the Witch | 5000 |
| 10 | 13407 | Gamer's EVE | 5000 |
| 11 | 17444 | Aqua Gun | 5000 |
| 12 | 56253 | Award | 4500 |
| 13 | 9154 | Baby Dragon | 2000 |
| 14 | 13165 | Crystal Crown | 2000 |
| 15 | 11109 | EWC Trophy | 1500 |
| 16 | 15649 | Galaxy Globe | 1500 |
| 17 | 17308 | Viking Hammer | 1500 |
| 18 | 8042 | Travel in the US | 1200 |
| 19 | 9104 | Epic GG | 1200 |
| 20 | 16080 | Starlight Sceptre | 1200 |
| 21 | 1401041 | Spooky Cat | 1200 |
| 22 | 16344 | Diamond | 1099 |
| 23 | 58354 | Diamond Tree | 1088 |
| 24 | 6911 | Pumpkin Carriage | 1031 |
| 25 | 5587 | Gold Mine | 1000 |
| 26 | 6781 | Watermelon Love | 1000 |
| 27 | 8606 | Dinosaur | 1000 |
| 28 | 8972 | Glowing Jellyfish | 1000 |
| 29 | 15910 | Super LIVE Star | 1000 |
| 30 | 59589 | Music Burst | 999 |
| 31 | 64130 | Money Magnet | 549 |
| 32 | 11521 | Manifesting | 500 |
| 33 | 12669 | Make it Rain | 500 |
| 34 | 13167 | Star Map Polaris | 500 |
| 35 | 14906 | Bouquet | 500 |
| 36 | 16573 | Prince | 500 |
| 37 | 16637 | Bunny Crown | 500 |
| 38 | 24797 | Snake Manifesting | 500 |
| 39 | 58353 | Diamond Microphone | 500 |
| 40 | 1404000 | Trick or Treat | 500 |
| 41 | 15156 | Sakura Corgi | 499 |
| 42 | 16345 | Taraxacum Corgi | 400 |
| 43 | 12662 | Boiling Cauldron | 399 |
| 44 | 15803 | Pharaoh Mask | 399 |
| 45 | 12430 | LIVE Pro Honor | 350 |
| 46 | 17309 | Air Dancer | 300 |
| 47 | 7215 | Trick or Treat | 299 |
| 48 | 15158 | Legend Crown | 299 |
| 49 | 15424 | LIVE Ranking Crown | 299 |
| 50 | 15648 | Journal | 299 |
| 51 | 1426556 | Cooked | 299 |
| 52 | 15909 | Rose Bear | 214 |
| 53 | 12333 | Gold Medal | 200 |
| 54 | 13737 | I Love TikTok LIVE | 200 |
| 55 | 5937 | Hanging Lights | 199 |
| 56 | 7204 | Panther Paws | 199 |
| 57 | 8004 | Gamer Cat | 199 |
| 58 | 11897 | Meerkat | 199 |
| 59 | 12625 | Potato in Paris | 199 |
| 60 | 13166 | Night Star | 199 |
| 61 | 13438 | Wooly Hat | 199 |
| 62 | 14084 | Blow Bubbles | 199 |
| 63 | 16079 | Bowtiful Crown | 199 |
| 64 | 16572 | Sour Buddy | 199 |
| 65 | 17068 | Melon Juice | 199 |
| 66 | 12686 | Music Note | 169 |
| 67 | 5924 | Hand Heart | 100 |
| 68 | 1426539 | Haunted Houseparty | 100 |
| 69 | 5785 | Cupid’s Bow | 99 |
| 70 | 10802 | Heart Me Flex | 99 |
| 71 | 7037 | October | 88 |
| 72 | 12664 | Boo the Ghost | 88 |
| 73 | 12516 | Witchy Kitty | 30 |
| 74 | 1062858 | Gamer Press Start | 25 |
| 75 | 10612 | Let 'Em Cook | 20 |
| 76 | 5853 | Gold Boxing Gloves
 | 10 |
| 77 | 8692 | Hi Bear | 10 |
| 78 | 11108 | EWC | 10 |
| 79 | 12236 | Dolphin | 10 |
| 80 | 12843 | Pumpkin Pie | 5 |
| 81 | 6652 | Lightning Bolt  | 1 |
| 82 | 6928 | It’s corn | 1 |
| 83 | 7086 | Chili | 1 |
| 84 | 9967 | Heart Puff | 1 |
| 85 | 10482 | LIVE | 1 |
| 86 | 12569 | Pumpkin | 1 |
| 87 | 13879 | GOAT | 1 |
| 88 | 54155 | Press Start | 1 |
| 89 | 32362 | Pink Star Gun | 5000 |
| 90 | 12340 | American Eagle | 19999 |
| 91 | 10701 | Gorilla | 30000 |
| 92 | 1428303 | Dinosaur | 25999 |
| 93 | 1381356 | Keeper of Atlantis | 15000 |

### GB（eu-west-2、en-GB）

#### JP になく GB にある: 167 種類

![JP になく GB にある](images/GB-added.png)

| # | giftId | 名前 | コイン |
| ---: | ---: | --- | ---: |
| 1 | 8456 | Zeus | 34000 |
| 2 | 17824 | Guardian Rhino | 30999 |
| 3 | 8391 | Sam the Whale | 30000 |
| 4 | 8602 | Gorilla | 30000 |
| 5 | 8868 | Superhero fight | 30000 |
| 6 | 9894 | Vulcan | 25999 |
| 7 | 59800 | T-rex | 25999 |
| 8 | 47646 | Black Tiger | 22000 |
| 9 | 5478 | Castle fantasy | 20000 |
| 10 | 9843 | Yacht | 20000 |
| 11 | 223802 | Mount Olympus | 19999 |
| 12 | 14440 | White Tiger | 15999 |
| 13 | 8739 | Leopard | 15000 |
| 14 | 8970 | Pyramids | 15000 |
| 15 | 18189 | Time for Family | 15000 |
| 16 | 47644 | Black Wolf | 15000 |
| 17 | 7620 | Spaceship | 13999 |
| 18 | 10177 | 3rd Anniversary | 12000 |
| 19 | 10787 | Tiny Diny Show | 12000 |
| 20 | 15751 | Superstar | 12000 |
| 21 | 16194 | Falcon | 10999 |
| 22 | 7071 | Festival flags | 10000 |
| 23 | 8417 | Octopus | 10000 |
| 24 | 16616 | Space Jet | 9000 |
| 25 | 16206 | Go Big Alpha Drifter | 7700 |
| 26 | 47645 | Black Swan | 7000 |
| 27 | 14410 | Elephant Nature Reserve | 6000 |
| 28 | 8778 | Wolf | 5500 |
| 29 | 11669 | Desert Wolf | 5500 |
| 30 | 232366 | Ice Cream Machine | 5288 |
| 31 | 6922 | Ellie the Elephant | 5000 |
| 32 | 8988 | DJ Alien | 5000 |
| 33 | 10175 | 1st Anniversary | 5000 |
| 34 | 10344 | Victory Wing | 5000 |
| 35 | 14768 | Diamond Gun | 5000 |
| 36 | 167005 | Seaside Romance | 5000 |
| 37 | 14769 | Hero Space Ship | 4999 |
| 38 | 17823 | Benny the Calf | 4999 |
| 39 | 9235 | Dynamic Music | 4888 |
| 40 | 9194 | Neon Caravan | 4088 |
| 41 | 6506 | Island of Love | 4000 |
| 42 | 9149 | Giant | 3999 |
| 43 | 8086 | Car Drifting | 3000 |
| 44 | 8188 | Dancing bears | 3000 |
| 45 | 167002 | Love in Sunset | 2999 |
| 46 | 10325 | Bobo the Clownfish | 2988 |
| 47 | 13643 | Pink Dream | 2988 |
| 48 | 6263 | Magic Stage | 2599 |
| 49 | 16101 | Space Dog | 2500 |
| 50 | 8806 | Dancing Capybaras | 2200 |
| 51 | 16190 | Lemon Love Booth | 2199 |
| 52 | 6417 | Club | 2000 |
| 53 | 14451 | Club | 2000 |
| 54 | 15681 | Vacation LIVE | 2000 |
| 55 | 16192 | Power Couple | 2000 |
| 56 | 16380 | Take My Rose! | 2000 |
| 57 | 8641 | Carousel | 1999 |
| 58 | 11079 | Beach Cabin | 1999 |
| 59 | 14574 | Winning Wednesday | 1600 |
| 60 | 9457 | ASMR Starter Kit | 1599 |
| 61 | 10382 | Shooting Stars | 1580 |
| 62 | 10991 | Potato floating | 1500 |
| 63 | 11109 | EWC Trophy | 1500 |
| 64 | 14210 | XXL Manifestation | 1500 |
| 65 | 14744 | Space Cat | 1500 |
| 66 | 5876 | Arcade Game | 1200 |
| 67 | 8887 | Fountain | 1200 |
| 68 | 8964 | Gaming Chair | 1200 |
| 69 | 17852 | Exclusive Spark | 1099 |
| 70 | 7963 | Diamond Tree | 1088 |
| 71 | 6479 | Drums | 1000 |
| 72 | 6842 | Gerry the Giraffe | 1000 |
| 73 | 8972 | Glowing Jellyfish | 1000 |
| 74 | 9521 | dinosaur | 1000 |
| 75 | 519153 | Watermelon Party | 1000 |
| 76 | 1346458 | Worship Me | 1000 |
| 77 | 8769 | Raining gifts | 999 |
| 78 | 14770 | Flamingo Floaty | 999 |
| 79 | 223804 | Divine Flame | 999 |
| 80 | 17825 | Money Magnet | 549 |
| 81 | 7985 | Lion’s Mane | 500 |
| 82 | 8648 | Window basket | 500 |
| 83 | 9623 | Mic Drop | 500 |
| 84 | 11671 | Manifesting | 500 |
| 85 | 13174 | Star Map Polaris | 500 |
| 86 | 13916 | Diamond Microphone | 500 |
| 87 | 14114 | XXXL Flowers | 500 |
| 88 | 16071 | Flower Show | 500 |
| 89 | 16637 | Bunny Hat | 500 |
| 90 | 17702 | Roses | 500 |
| 91 | 17739 | Halloween Ghost | 500 |
| 92 | 8750 | Gold Microphone | 499 |
| 93 | 14888 | Sakura Corgi | 499 |
| 94 | 15141 | Panda Hug | 499 |
| 95 | 14575 | Winning Wednesday | 450 |
| 96 | 17289 | Terminator Face | 449 |
| 97 | 6219 | Bear with Rose | 400 |
| 98 | 14682 | Lucky Cat | 399 |
| 99 | 15803 | Pharaoh Mask | 399 |
| 100 | 18181 | You Are Loved | 399 |
| 101 | 8392 | Singing frogs | 398 |
| 102 | 17690 | Mystic Drink | 349 |
| 103 | 8260 | Elephant trunk | 299 |
| 104 | 8873 | TikTok Crown | 299 |
| 105 | 15142 | Rising Key | 299 |
| 106 | 15630 | LIVE Ranking Crown | 299 |
| 107 | 17476 | Pawfect | 299 |
| 108 | 15924 | Midsummer Hair | 249 |
| 109 | 14058 | Balloons | 200 |
| 110 | 8600 | Sending positivity | 199 |
| 111 | 9477 | Twinkling Star | 199 |
| 112 | 9589 | Birthday Glasses | 199 |
| 113 | 11881 | Dancing Hands | 199 |
| 114 | 16103 | Sour Buddy | 199 |
| 115 | 17290 | Side by Side | 199 |
| 116 | 17740 | Prism Shine | 199 |
| 117 | 15428 | Potato Transformation | 150 |
| 118 | 18227 | Santa Cocoa | 149 |
| 119 | 6502 | Shell Energy | 100 |
| 120 | 6968 | Hand Heart | 100 |
| 121 | 7264 | Mishka Bear | 100 |
| 122 | 14453 | Rising Star | 99 |
| 123 | 14576 | Winning Wednesday | 99 |
| 124 | 56382 | Birthday Hat | 99 |
| 125 | 57615 | Hot shot | 99 |
| 126 | 9575 | Family | 90 |
| 127 | 9933 | Fist bump | 90 |
| 128 | 8259 | Sign language love | 49 |
| 129 | 17826 | Bagel | 35 |
| 130 | 16737 | You are my Jam | 30 |
| 131 | 17490 | Capybara | 30 |
| 132 | 14115 | S Flowers | 20 |
| 133 | 15509 | Summer Sun | 20 |
| 134 | 5853 | Gold Boxing Gloves | 10 |
| 135 | 10521 | Cherry Blossom Bunny | 10 |
| 136 | 11382 | LIVE Island | 10 |
| 137 | 166996 | I love you | 10 |
| 138 | 1177421 | Whistle | 10 |
| 139 | 9622 | Applause | 9 |
| 140 | 10604 | Tofu | 5 |
| 141 | 14786 | Peach | 5 |
| 142 | 167001 | Wave Firework | 5 |
| 143 | 1035742 | Rocket | 5 |
| 144 | 1177423 | Fireball | 5 |
| 145 | 6649 | Give It All | 1 |
| 146 | 7832 | Blow a kiss | 1 |
| 147 | 7886 | Music Play | 1 |
| 148 | 8723 | Rainbow | 1 |
| 149 | 9087 | Flame heart | 1 |
| 150 | 9383 | Chili | 1 |
| 151 | 10448 | Heart Puff | 1 |
| 152 | 10602 | White Rose | 1 |
| 153 | 10697 | Creator's Cap | 1 |
| 154 | 13282 | Slay | 1 |
| 155 | 14785 | Morning Bloom | 1 |
| 156 | 15644 | Music Mic | 1 |
| 157 | 15724 | White Dove | 1 |
| 158 | 16212 | Cool | 1 |
| 159 | 16381 | Dolce Vita | 1 |
| 160 | 17480 | Coffee | 1 |
| 161 | 55229 | Power of Diamond | 1 |
| 162 | 165819 | Orange Juice | 1 |
| 163 | 1177428 | Soccer | 1 |
| 164 | 165844 | DJ Peak | 15000 |
| 165 | 165840 | DJ Stage | 3999 |
| 166 | 16790 | Dance with me | 1000 |
| 167 | 165836 | Festival Bracelet | 349 |

### SG（ap-southeast-1、en-SG）

#### JP になく SG にある: 53 種類

![JP になく SG にある](images/SG-added.png)

| # | giftId | 名前 | コイン |
| ---: | ---: | --- | ---: |
| 1 | 11571 | Singapore Skyline | 15000 |
| 2 | 1453175 | Interstellar Trek | 14999 |
| 3 | 1402658 | Hall of Legend | 11999 |
| 4 | 18523 | TikTok Red Carpet | 6600 |
| 5 | 5348 | Unicorn Fantasy | 5000 |
| 6 | 12304 | Diamond Gun | 5000 |
| 7 | 17902 | Chopin's Nocturne | 5000 |
| 8 | 866088 | Crowd Cheering | 5000 |
| 9 | 17272 | Love in Sunset | 2999 |
| 10 | 14037 | Pink Dream | 2988 |
| 11 | 1453173 | Starship Tunnel | 2500 |
| 12 | 13466 | Crystal Crown | 2000 |
| 13 | 12464 | Cherry Blossoms | 1500 |
| 14 | 6781 | Watermelon Love | 1000 |
| 15 | 6804 | Waterslide | 1000 |
| 16 | 13574 | Match Drum | 1000 |
| 17 | 15708 | Space | 1000 |
| 18 | 1137733 | A Garden Yonder | 1000 |
| 19 | 58182 | Record Player | 600 |
| 20 | 16637 | Bunny Crown | 500 |
| 21 | 1137735 | The Mrazhemian | 400 |
| 22 | 17904 | You Are Loved | 399 |
| 23 | 17271 | Air Dancer | 300 |
| 24 | 14787 | Spider on web | 299 |
| 25 | 15380 | LIVE Ranking Crown | 299 |
| 26 | 15861 | TikTok Crown | 299 |
| 27 | 17459 | Pawfect | 299 |
| 28 | 18699 | Cat | 222 |
| 29 | 16300 | Rose Bear | 214 |
| 30 | 13686 | Balloons | 200 |
| 31 | 11113 | Dancing Hands | 199 |
| 32 | 12302 | Twinkling Star | 199 |
| 33 | 14039 | Love Rain | 199 |
| 34 | 16811 | Sour Buddy | 199 |
| 35 | 53781 | Night Star | 199 |
| 36 | 18168 | Song of Harvest | 150 |
| 37 | 1402659 | Penlight | 150 |
| 38 | 46675 | Crossette Firework | 129 |
| 39 | 13898 | Bouquet | 100 |
| 40 | 17585 | Match Wand | 100 |
| 41 | 17903 | Compact | 100 |
| 42 | 14453 | Breakthrough Star | 99 |
| 43 | 17729 | Family | 90 |
| 44 | 12969 | Love Letter | 88 |
| 45 | 14038 | Butterfly | 88 |
| 46 | 16812 | Takoyaki | 88 |
| 47 | 18167 | Cendol | 88 |
| 48 | 17460 | You are on a Roll | 30 |
| 49 | 12745 | Little Ghost | 10 |
| 50 | 1137734 | I'm Yours | 10 |
| 51 | 9005 | Rafflesia | 5 |
| 52 | 1402661 | Star Light | 5 |
| 53 | 10585 | Rendang Chicken | 1 |

## 配信 @cassismilk02（JP、room 7699422526320986886）

配信内のギフト欄は 690 種類（[一覧](images/room-cassismilk02.png)）。

#### 配信内だけにある: 1 種類

![配信内だけにある](images/room-cassismilk02-added.png)

| # | giftId | 名前 | コイン |
| ---: | ---: | --- | ---: |
| 1 | 1256804 | かしすみるく | 1 |
