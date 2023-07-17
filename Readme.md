# ts-data-carousel-remover

録画済みの m2ts(ts) ファイルからデータ放送のパケットを取り除く

## セットアップ方法

git clone 後 `npm install` を実行

## 使用方法
```
npm run start /path/to/infile.m2ts [/path/to/outfile.m2ts]
```
出力ファイル名を省略すると `入力ファイル名.out.m2ts` の名前で出力されます

## 動作環境

* Node.js
* npm

node 18.16.1 + npm 9.5.1 で動作確認済
