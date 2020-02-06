/*\
title: $:/plugins/ipfs/ipfs-library.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsLibrary

\*/

import CID  from "cids";
import { getIpfs, providers } from "ipfs-provider";

(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/**
 * https://github.com/purposeindustries/window-or-global
 * The MIT License (MIT) Copyright (c) Purpose Industries
 * version: 1.0.1
 */
const root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;

const cidAnalyser = "https://cid.ipfs.io/#";

const name = "ipfs-library";

var IpfsLibrary = function() {};

IpfsLibrary.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

IpfsLibrary.prototype.decodeCid = function(pathname) {
  // Check
  if (pathname == undefined || pathname == null || pathname.trim() === "" || pathname.trim() === "/") {
    return {
      protocol: null,
      cid: null
    };
  }
  // Parse
  const members = pathname.trim().split("/");
  var protocol = null;
  var cid = null;
  for (var i = 0; i < members.length; i++) {
    // Ignore
    if (members[i].trim() === "") {
      continue;
    }
    // First non empty member
    if (protocol == null) {
      protocol = members[i];
      continue;
    }
    // Second non empty member
    if (cid == null) {
      cid = members[i];
      break;
    }
    // Nothing to process
    break;
  }
  // Check
  if (protocol == null || cid == null) {
    return {
      protocol: null,
      cid: null
    };
  }
  // Check protocol
  if (protocol !== "ipfs" && protocol !== "ipns") {
    return {
      protocol: null,
      cid: null
    };
  }
  // Check
  if (this.isCid(cid) == false) {
    return {
      protocol: protocol,
      cid: null
    };
  }
  // All good
  return {
    protocol: protocol,
    cid: cid
  }
}

IpfsLibrary.prototype.isCid = function(cid) {
  try {
    const newCid = new CID(cid);
    return CID.isCID(newCid);
  } catch (error) {
    return false;
  }
}

IpfsLibrary.prototype.cidV1ToCidV0 = function(cidv1) {
  var cidv0 = new CID(cidv1);
  if (cidv0.codec !== "dag-pb") {
    throw new Error("This 'cid' is not 'dag-pb' encoded: " + cidAnalyser + cidv0);
  }
  if (cidv0.version === 1) {
    cidv0 = cidv0.toV0().toString();
    // Log
    this.getLogger().info(
      "Converted: "
      + "\n 'cidv1' (Base32): "
      + cidAnalyser
      + cidv1
      + "\n to 'cidv0' (Base58): "
      + cidAnalyser
      + cidv0
    );
  } else {
    // Log
    this.getLogger().info(
      "'cidv0' (Base58): "
      + cidAnalyser
      + cidv0
    );
  }
  return cidv0;
}

IpfsLibrary.prototype.cidV0ToCidV1 = function(cidv0) {
  var cidv1 = new CID(cidv0);
  if (cidv1.codec !== "dag-pb") {
    throw new Error("This 'cid' is not 'dag-pb' encoded: " + cidAnalyser + cidv1);
  }
  if (cidv1.version === 0) {
    cidv1 = cidv1.toV1().toString();
    this.getLogger().info(
      "Converted: "
      + "\n 'cidv0' (Base58): "
      + cidAnalyser
      + cidv0
      + "\n to 'cidv1' (Base32): "
      + cidAnalyser
      + cidv1
    );
  } else {
    // Log
    this.getLogger().info(
      "'cidv1' (Base32): "
      + cidAnalyser
      + cidv1
    );
  }
  return cidv1;
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function(apiUrl) {
  // IPFS Companion first
  try {
    const { ipfs, provider } = await this.getWindowIpfs();
    if (ipfs !== null) {
      return {
        ipfs: ipfs,
        provider: provider
      };
    }
  } catch (error) {
    // IPFS Companion failed
  }
  // Check
  if (apiUrl == undefined || apiUrl == null || apiUrl.toString().trim() === "") {
    throw new Error("Undefined IPFS API URL...");
  }
  // Load IpfsHttpClient
  if ($tw !== undefined && $tw !== null && $tw.ipfs !== undefined && $tw.ipfs !== null) {
    await $tw.ipfs.getLoader().loadIpfsHttpLibrary();
  }
  try {
    const { ipfs, provider } = await this.getHttpIpfs(apiUrl);
    if (ipfs !== null) {
      return {
        ipfs: ipfs,
        provider: provider
      };
    }
  } catch (error) {
    // IPFS HTTP client failed
  }
  throw new Error("Unreachable IPFS Companion and IPFS API URL...");
}

// window.enable
IpfsLibrary.prototype.getWindowIpfs = async function() {
  // Getting
  try {
    const { windowIpfs } = providers;
    this.getLogger().info("Processing connection to IPFS Companion...");
    const { ipfs, provider } = await getIpfs({
      providers: [
        windowIpfs()
      ]
    });
    return {
      ipfs: ipfs,
      provider: provider
    };
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unreachable IPFS Companion...");
  }
}

// ipfs-http-client
IpfsLibrary.prototype.getHttpIpfs = async function(apiUrl) {
  // Check
  if (apiUrl == undefined || apiUrl == null || apiUrl.toString().trim() === "") {
    throw new Error("Undefined IPFS API URL...");
  }
  // Load IpfsHttpClient
  if ($tw !== undefined && $tw !== null && $tw.ipfs !== undefined && $tw.ipfs !== null) {
    await $tw.ipfs.getLoader().loadIpfsHttpLibrary();
  }
  // Getting
  try {
    const { httpClient } = providers;
    this.getLogger().info("Processing connection to IPFS API URL: " + apiUrl);
    const { ipfs, provider } = await getIpfs({
      providers: [
        httpClient({
          apiAddress: apiUrl.toString()
        })
      ]
    });
    return {
      ipfs: ipfs,
      provider: provider + ", " + apiUrl.toString()
    };
  } catch (error) {
    this.getLogger().error(error);
    throw new Error("Unreachable IPFS API URL...");
  }
}

IpfsLibrary.prototype.add = async function(client, content) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (content == undefined || content == null) {
    throw new Error("Undefined content...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["add"]});
  }
  // Process
  if (client !== undefined && client.add !== undefined) {
    // Process
    var buffer = Buffer.from(content);
    this.getLogger().info("Processing IPFS add...");
    // 1 - https://github.com/ipfs/go-ipfs/issues/5683
    // default chunker: "size-262144"
    // chunker: "rabin-262144-524288-1048576"
    // 2 - TODO: small content generates a wrong cid when cidVersion: 1 is set:
    // Not a 'dag-pb' but a 'raw' multicodec instead
    // We generate a V0 and convert it to a V1
    const result = await client.add(buffer, {
      cidVersion: 0,
      hashAlg: "sha2-256",
      chunker: "rabin-262144-524288-1048576",
      pin: false
    });
    if (result !== undefined && result !== null && Array.isArray(result) && result.length > 0) {
      // Check
      const cidv1 = this.cidV0ToCidV1(result[0].hash);
      return {
        hash: cidv1,
        size: result[0].size
      };
    }
    return {
      hash: null,
      size: null
    };
  }
  throw new Error("Undefined IPFS command add...");
}

IpfsLibrary.prototype.get = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["get"]});
  }
  // Process
  if (client !== undefined && client.get !== undefined) {
    this.getLogger().info("Processing IPFS get...");
    const result = await client.get(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS get...");
}

IpfsLibrary.prototype.cat = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["cat"]});
  }
  // Process
  if (client !== undefined && client.cat !== undefined) {
    this.getLogger().info("Processing IPFS cat...");
    const result = await client.cat(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS cat...");
}

IpfsLibrary.prototype.pin = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["pin"]});
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
    this.getLogger().info("Processing IPFS pin add...");
    const result = await client.pin.add(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS pin add...");
}

IpfsLibrary.prototype.unpin = async function(client, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["pin"]});
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
    this.getLogger().info("Processing IPFS pin rm...");
    const result = await client.pin.rm(cid.trim());
    return result;
  }
  throw new Error("Undefined IPFS pin rm");
}

IpfsLibrary.prototype.publish = async function(client, name, cid) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  if (cid == undefined || cid == null || cid.trim() === "") {
    throw new Error("Undefined IPFS identifier...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["name"]});
  }
  if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
    this.getLogger().info("Processing IPNS name publish...");
    const result = await client.name.publish(cid.trim(), { key: name.trim() });
    return result;
  }
  throw new Error("Undefined IPNS name publish...");
}

IpfsLibrary.prototype.resolve = async function(client, id) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (id == undefined || id == null || id.trim() === "") {
    throw new Error("Undefined IPNS key...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["name"]});
  }
  if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
    this.getLogger().info("Processing IPNS name resolve...");
    const resolved = await client.name.resolve(id.trim(), {
      recursive: true
    });
    return resolved;
  }
  throw new Error("Undefined IPNS name resolve...");
}

IpfsLibrary.prototype.getKeys = async function(client) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
    this.getLogger().info("Processing IPNS key list...");
    const result = await client.key.list();
    return result;
  }
  throw new Error("Undefined IPNS key list...");
}

// Only rsa is supported yet...
// https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/KEY.md#keygen
// https://github.com/libp2p/js-libp2p-crypto/issues/145
IpfsLibrary.prototype.genKey = async function(client, name) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.gen !== undefined) {
    this.getLogger().info("Processing IPNS key gen...");
    const key = await client.key.gen(name.trim(), {
      type: "rsa",
      size: 2048
    });
    if (key !== undefined && key.id !== undefined && key.id !== null) {
      return key.id;
    }
    return null;
  }
  throw new Error("Undefined IPNS key gen...");
}

IpfsLibrary.prototype.rmKey = async function(client, name) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (name == undefined || name == null || name.trim() === "") {
    throw new Error("Undefined IPNS name...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.rm !== undefined) {
    this.getLogger().info("Processing IPNS key rm...");
    const key = await client.key.rm(name.trim());
    if (key !== undefined && key.id !== undefined && key.id !== null) {
      return key.id;
    }
    return null;
  }
  throw new Error("Undefined IPNS key rm...");
}

IpfsLibrary.prototype.renameKey = async function(client, oldName, newName) {
  if (client == undefined || client == null) {
    throw new Error("Undefined IPFS provider...");
  }
  if (oldName == undefined || oldName == null || oldName.trim() === "") {
    throw new Error("Undefined IPNS old name...");
  }
  if (newName == undefined || newName == null || newName.trim() === "") {
    throw new Error("Undefined IPNS nem name...");
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({commands: ["key"]});
  }
  if (client !== undefined && client.key !== undefined && client.key.rename !== undefined) {
    this.getLogger().info("Processing IPNS key rename...");
    const key = await client.key.rename(oldName.trim(), newName.trim());
    if (key !== undefined) {
      var id = null;
      if (key.id !== undefined && key.id !== null) {
        id = key.id;
      }
      var was = null;
      if (key.was !== undefined && key.was !== null) {
        was = key.was;
      }
      var now = null;
      if (key.now !== undefined && key.now !== null) {
        now = key.now;
      }
      var overwrite = null;
      if (key.overwrite !== undefined && key.overwrite !== null) {
        overwrite = key.overwrite;
      }
      return {
        id: id,
        was: was,
        now: now,
        overwrite: overwrite
      };
    }
    return {
      id: null,
      was: null,
      now: null,
      overwrite: null
    };
  }
  throw new Error("Undefined IPNS key rename...");
}

exports.IpfsLibrary = IpfsLibrary;

})();
