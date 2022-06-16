'use strict';

import TsBase from 'aribts/lib/base.js';

export default class TsOmitPidPacketSelector extends TsBase {
  constructor(omitPids) {
    super();

    if (!Array.isArray(omitPids)) {
      throw new Error("omitPids must be an array");
    }

    this.updateOmitPids(omitPids);
  }

  updateOmitPids(omitPids) {
    this._omitPids = omitPids.slice();
  }

  _process(tsPacket, callback) {
    const pid = tsPacket.getPid();
    if (!this._omitPids.includes(pid)) {
        this.push(tsPacket);
    }

    callback();
  }
}
