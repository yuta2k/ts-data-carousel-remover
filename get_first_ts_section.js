'use strict';

import * as fs from 'fs';
import TsPacketParser from 'aribts/lib/packet_parser.js';
import TsReadableConnector from 'aribts/lib/readable_connector.js';
import TsSectionParser from 'aribts/lib/section_parser.js';
import TsUtil from 'aribts/lib/util.js';

/**
 * get first ts section of specified PID
 * @param {string} filePath path of m2ts
 * @param {'pat' | 'cat' | 'pmt'} pidName PID name
 * @returns {Promise<aribts.TsSection>}
 */
const getFirstTsSection = async (filePath, pidName) => {
  const readableStream = fs.createReadStream(filePath);

  const tsReadableConnector = new TsReadableConnector();
  const tsPacketParser = new TsPacketParser();
  const tsSectionParser = new TsSectionParser();

  readableStream.pipe(tsReadableConnector);

  const versions = {};
  return await new Promise((resolve, reject) => {
    tsSectionParser.on(pidName, (tsSection) => {
      const subTable = TsUtil.getNestedObject(versions, [tsSection.getTableId(), tsSection.getProgramNumber()]);
      TsUtil.updateSubTable(subTable, tsSection);
      if (!TsUtil.updateSection(subTable, tsSection)) return;

      tsSectionParser.unpipe();
      tsReadableConnector.unpipe();
      tsPacketParser.unpipe();
      readableStream.close();

      resolve(tsSection.decode());
    });

    tsReadableConnector.on('finish', () => {
      reject(new Error(`PID: ${pidName} is not found`));
    });

    tsReadableConnector.pipe(tsPacketParser);
    tsPacketParser.pipe(tsSectionParser);
  });
}

export default getFirstTsSection;
