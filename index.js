'use strict';

import * as fs from 'fs';
import TsOmitPidPacketSelector from './omit_pid_packet_selector.js';
import TsPacketParser from 'aribts/lib/packet_parser.js';
import TsPacketConverter from 'aribts/lib/packet_converter.js';
import TsReadableConnector from 'aribts/lib/readable_connector.js';
import TsSectionParser from 'aribts/lib/section_parser.js';
import TsWritableConnector from 'aribts/lib/writable_connector.js';
import TsUtil from 'aribts/lib/util.js';
import createProgressTransformStream from './create_progress_transform_stream.js';
import getFirstTsSection from './get_first_ts_section.js';

const DATA_CAROUSEL_STREAM_TYPE = 0x0D;


if (process.argv.length < 3) {
  console.error('Usage: yarn start /path/to/infile.m2ts [/path/to/outfile.m2ts]');
  process.exit(1);
}

const srcFilePath = process.argv[2];
const outFilePath = process.argv[3] || srcFilePath + '.out.m2ts';

if (!fs.existsSync(srcFilePath)) {
  console.error('File not found: ' + srcFilePath);
  process.exit(1);
}

(async() => {
  console.log('Searching target PIDs from first PMT packet...');

  // stream で PMT を読む場合、データカルーセルのパケットが先にあると完全に排除できないため
  // 予め最初の PMT を探してデータカルーセルの PID を割り出しておく
  const firstDiscoveredPids = (await getFirstTsSection(srcFilePath, 'pmt')).streams
    .filter((stream) => stream.stream_type === DATA_CAROUSEL_STREAM_TYPE)
    .map((stream) => stream.elementary_PID);

  console.log('Starting...');

  const readableStream = fs.createReadStream(srcFilePath);
  const writableStream = fs.createWriteStream(outFilePath);

  const targetPidsSet = new Set(firstDiscoveredPids);
  let prevTargetPidsSetLength = targetPidsSet.length;

  // initialize file read
  const transformStream = createProgressTransformStream(srcFilePath);
  readableStream.pipe(transformStream);

  const tsReadableConnector = new TsReadableConnector();
  transformStream.pipe(tsReadableConnector);

  // initialize file write
  const tsWritableConnector = new TsWritableConnector();
  tsWritableConnector.pipe(writableStream);

  // initialize ts packet processing
  const tsPacketParser = new TsPacketParser();
  tsReadableConnector.pipe(tsPacketParser);

  const tsPacketSelector = new TsOmitPidPacketSelector(Array.from(targetPidsSet));
  tsPacketParser.pipe(tsPacketSelector);

  const tsSectionParser = new TsSectionParser();
  const versions = {};
  tsSectionParser.on('pmt', (tsSection) => {
    // update target PIDs on PMT received
    const subTable = TsUtil.getNestedObject(versions, [tsSection.getTableId(), tsSection.getProgramNumber()]);
    TsUtil.updateSubTable(subTable, tsSection);
    if (!TsUtil.updateSection(subTable, tsSection)) return;

    tsSection.decode().streams
      .filter((stream) => stream.stream_type === DATA_CAROUSEL_STREAM_TYPE)
      .forEach((stream) => targetPidsSet.add(stream.elementary_PID));

    if (prevTargetPidsSetLength === targetPidsSet.length) return;

    tsPacketSelector.updateOmitPids(Array.from(targetPidsSet));
    prevTargetPidsSetLength = targetPidsSet.length;
  });
  tsPacketParser.pipe(tsSectionParser);

  // initialize writing filtered ts packets
  const tsPacketConverter = new TsPacketConverter();
  tsPacketSelector.pipe(tsPacketConverter);
  tsPacketConverter.pipe(tsWritableConnector);

  // wait process done
  await new Promise((resolve) => {
    tsWritableConnector.on('end', () => {
      resolve();
    });
  });

  const targetPidsHexStrs = Array.from(targetPidsSet)
    .map((pidNum) => '0x' + ('0000' + pidNum.toString(16)).slice(-4));
  console.log('Omitted PID(s): ' + targetPidsHexStrs.join(', '))
})();