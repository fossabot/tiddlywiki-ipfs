/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IpfsWrapper

\*/

(function() {

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

const IpfsLibrary = require("./ipfs-library.js").IpfsLibrary;
const IpfsUri = require("./ipfs-uri.js").IpfsUri;

const ipfsKeyword = "ipfs";
const ipnsKeyword = "ipns";

const name = "ipfs-wrapper";

var IpfsWrapper = function() {
  this.ipfsLibrary = new IpfsLibrary();
  this.ipfsUri = new IpfsUri();
}

IpfsWrapper.prototype.decodeCid = function(pathname) {
  return this.ipfsLibrary.decodeCid(pathname);
}

IpfsWrapper.prototype.getLogger = function() {
  return root.log.getLogger(name);
}

IpfsWrapper.prototype.getTiddlerContent = function(tiddler) {

  // Check
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return null;
  }

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return null;
  }

  // Check
  if (info.encoding !== "base64" && type !== "image/svg+xml")  {
    $tw.utils.alert(name, "Unsupported Tiddler Content Type...\nLook at the documentation...");
    return null;
  }

  // Retrieve content
  var text = tiddler.getFieldString("text");
  if (text == undefined || text == null || text.trim() === "") {
    return null;
  }

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/9
      if (info.encoding === "base64") {
        text = atob(text);
      }
      text = $tw.crypto.encrypt(text, $tw.crypto.currentPassword);
      text = $tw.utils.StringToUint8Array(text);
    } else {
      // process base64
      if (info.encoding === "base64") {
        text = $tw.utils.Base64ToUint8Array(text);
      } else {
        text = $tw.utils.StringToUint8Array(text);
      }
    }
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, "Failed to encrypt content...");
    return null;
  };

  return text;

}

IpfsWrapper.prototype.isJSON = function(content) {
  if (content !== undefined && content !== null && typeof content === 'string'){
    try {
      JSON.parse(content);
      return true;
    } catch(erro){
      // Ignore
    }
  }
  return false;
}

/*
* imported tiddler supersed hosting tiddler
*/
IpfsWrapper.prototype.loadTiddlers = async function(tiddler, uri) {
  // Normalize
  const normalized_uri = await $tw.ipfs.normalizeIpfsUrl(uri);
  // Load
  var importedTiddlers = null;
  const content = await $tw.utils.loadToUtf8(normalized_uri);
  if (this.isJSON(content.data)) {
    importedTiddlers = $tw.wiki.deserializeTiddlers(".json", content.data, $tw.wiki.getCreationFields());
  } else {
    importedTiddlers = $tw.wiki.deserializeTiddlers(".tid", content.data, $tw.wiki.getCreationFields());
  }
  // Iterate
  var current = null;
  var title = tiddler.getFieldString("title");
  $tw.utils.each(importedTiddlers, function(importedTiddler) {
    // Root
    if (current == null) {
      current = tiddler;
    } else {
      current = $tw.wiki.getTiddler(importedTiddler["title"]);
    }
    // Root
    if (current === tiddler) {
      const canonical_uri = importedTiddler["_canonical_uri"];
      if (canonical_uri == undefined || canonical_uri == null) {
        importedTiddler["_canonical_uri"] = uri;
      }
      importedTiddler["_imported_root_uri"] = uri;
    } else {
      // Imported
      importedTiddler["_imported"] = title;
      importedTiddler["_imported_uri"] = uri;
    }
  });
  return importedTiddlers;
}

IpfsWrapper.prototype.exportTiddler = function(tiddler, content) {

  // Check
  if (tiddler == undefined || tiddler == null) {
    $tw.utils.alert(name, "Unknown Tiddler...");
    return null;
  }

  const title = tiddler.getFieldString("title");

  // Type
  var type = tiddler.getFieldString("type");
  // Default
  if (type == undefined || type == null || type.trim() === "") {
    type = "text/vnd.tiddlywiki";
  }

  // Content Type
  const info = $tw.config.contentTypeInfo[type];
  // Check
  if (info == undefined || info == null)  {
    $tw.utils.alert(name, "Unknown Tiddler Content Type: " + type);
    return null;
  }

  // Filter
  var exportFilter = "[[" + tiddler.fields.title + "]]";
  if (content) {
    const titles = this.transcludeContent(title);
    // Process transcluded content
    for (var i = 0; i < titles.length; i++) {
      if (exportFilter.includes(titles[i]) == false) {
        exportFilter = exportFilter + " [[" + titles[i] + "]]"
      }
    }
  }

  var content = null;

  if ($tw.utils.getIpfsExport() === "json") {
    // Export
    const options = {
      downloadType: "text/plain",
      method: "download",
      template: "$:/core/templates/exporters/JsonFile",
      variables: {
        exportFilter: exportFilter
      }
    };
    content = $tw.wiki.renderTiddler(
      "text/plain",
      "$:/core/templates/exporters/JsonFile",
      options
    );

  } else if ($tw.utils.getIpfsExport() === "html") {

    // Export Tiddler as Static River
    const options = {
      downloadType: "text/plain",
      method: "download",
      template: "$:/core/templates/exporters/StaticRiver",
      variables: {
        exportFilter: exportFilter
      }
    };
    content = $tw.wiki.renderTiddler(
      "text/plain",
      "$:/core/templates/exporters/StaticRiver",
      options
    );

  } else {

    // Export Tiddler as tid
    const options = {
      downloadType: "text/plain",
      method: "download",
      template: "$:/core/templates/exporters/TidFile",
      variables: {
        exportFilter: exportFilter
      }
    };
    content = $tw.wiki.renderTiddler(
      "text/plain",
      "$:/core/templates/exporters/TidFile",
      options
    );

  }

  try {
    // Encrypt
    if ($tw.crypto.hasPassword()) {
      content = $tw.crypto.encrypt(content, $tw.crypto.currentPassword);
    }
    content = $tw.utils.StringToUint8Array(content);
  } catch (error) {
    this.getLogger().error(error);
    $tw.utils.alert(name, "Failed to encrypt content...");
    return null;
  };

  return content;

}

IpfsWrapper.prototype.transcludeContent = function(title) {
  var tiddlers = [];
  // Build a transclude widget
  var transclude = $tw.wiki.makeTranscludeWidget(title);
  // Build a fake document element
  const container = $tw.fakeDocument.createElement("div");
  // Transclude
  transclude.render(container, null);
  // Process children
  this.locateTiddlers(transclude, tiddlers);
  // Return
  return tiddlers;
}

IpfsWrapper.prototype.locateTiddlers = function(transclude, tiddlers) {
  // Children lookup
  for (var i = 0; i < transclude.children.length; i++) {
    // Current child
    const child = transclude.children[i];
    if (child.variables !== undefined && child.variables !== null) {
      // Locate Tiddler
      const name = "currentTiddler";
      const current = child.variables[name];
      if (current !== undefined && current !== null && current.value !== undefined && current.value !== null) {
        if (tiddlers.indexOf(current.value) === -1) {
          tiddlers.push(current.value);
        }
      }
    }
    // Process children
    this.locateTiddlers(child, tiddlers);
  }
}

IpfsWrapper.prototype.getIpfsClient = async function(apiUrl) {
  // IPFS client
  const err = new Error("Failed to get an IPFS provider...");
  try {
    var policy = { ipfs: null, provider: null };
    const ipfsProvider = $tw.utils.getIpfsProvider();
     if (ipfsProvider === "window") {
      policy = await this.ipfsLibrary.getWindowIpfs();
    } else if (ipfsProvider === "http") {
      policy = await this.ipfsLibrary.getHttpIpfs(apiUrl);
    } else  {
      policy  = await this.ipfsLibrary.getDefaultIpfs(apiUrl);
    }
    // Return if undefined
    if (policy.ipfs == null || policy.provider == null)  {
      throw err;
    }
    // Done
    return policy;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.getIpnsIdentifiers = async function(ipfs, ipnsKey, ipnsName) {

  // Cleanup
  if (ipnsKey == undefined || ipnsKey == null) {
    ipnsKey = null;
  }
  if (ipnsName == undefined || ipnsName == null) {
    ipnsName = null;
  }

  // Check
  if (ipnsKey == null && ipnsName == null) {
    throw new Error("Undefined IPNS key and IPNS name...");
  }

  // Load IPNS keys
  const keys = await this.getIpnsKeys(ipfs);

  // Fetch IPNS name and IPNS key
  if (ipnsName !== null && ipnsKey !== null) {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].id === ipnsKey && keys[index].name === ipnsName) {
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS key and IPNS name...");
    }
  } else if (ipnsName !== null) {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].name === ipnsName) {
          ipnsKey = keys[index].id;
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS name...");
    }
  } else {
    var found = false;
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].id === ipnsKey) {
          ipnsName = keys[index].name;
          found = true;
          break;
        }
      }
    }
    if (found === false) {
      throw new Error("Unknown IPNS key...");
    }
  }

  // Log
  const url = await this.ipfsUri.normalizeUrl(
    "/"
    + ipnsKeyword
    + "/"
    + ipnsKey
  );
  this.getLogger().info(
    "Successfully Fetched IPNS name: "
    + ipnsName
    + "\n "
    + url.href
  );

  return {
    ipnsKey: ipnsKey,
    ipnsName: ipnsName
  }

}

IpfsWrapper.prototype.generateIpnsKey = async function(ipfs, ipnsName) {
  const err = new Error(
    "Failed to generate IPNS key with IPNS name: "
    + ipnsName
  );
  try {
    const key = await this.ipfsLibrary.genKey(ipfs, ipnsName);
    if (key == undefined || key == null)  {
      throw err;
    }
    const url = await this.ipfsUri.normalizeUrl("/" + ipnsKeyword + "/" + key);
    this.getLogger().info(
      "Successfully generated IPNS key with IPNS name: "
      + ipnsName
      + "\n "
      + url.href
    );
    return key;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.removeIpnsKey = async function(ipfs, ipnsKey, ipnsName) {
  const pathname = "/"
    + ipnsKeyword
    + "/"
    + ipnsKey;
  var err = new Error(
    "Failed to remove IPNS name: "
    + ipnsName
    + "\n "
    + pathname
  );
  try {
    const url = await this.ipfsUri.normalizeUrl(pathname);
    err = new Error(
      "Failed to remove IPNS name: "
      + ipnsName
      + "\n "
      + url.href
    );
    const hash = await this.ipfsLibrary.rmKey(ipfs, ipnsName);
    if (hash == undefined || hash == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully removed IPNS name: "
      + ipnsName
      + "\n "
      + url.href
    );
    return hash;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.renameIpnsName = async function(ipfs, oldName, newName) {
  const err = new Error(
    "Failed to rename IPNS name: "
    + oldName
    + " with "
    + newName
  );
  try {
    const { id: key, was, now } = await this.ipfsLibrary.renameKey(ipfs, oldName, newName);
    if (now == undefined || now == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully renamed IPNS name: "
      + was
      + " with "
      + now
    );
    return {
      key: key,
      name: now
    };
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.getIpnsKeys = async function(ipfs) {
  const err = new Error("Failed to fetch IPNS keys...");
  try {
    const keys = await this.ipfsLibrary.getKeys(ipfs);
    if (keys == undefined || keys == null)  {
      throw err;
    }
    this.getLogger().info("Successfully fetched IPNS keys...");
    return keys;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.fetchFromIpfs = async function(ipfs, cid) {
  // Fetch
  const pathname = "/"
    + ipfsKeyword
    + "/"
    + cid;
  var err = new Error(
    "Failed to fetch:"
    + "\n "
    + pathname
  );
  try {
    const url = await this.ipfsUri.normalizeUrl(pathname);
    err = new Error(
      "Failed to fetch:"
      + "\n "
      + url.href
    );
    const fetched = await this.ipfsLibrary.cat(ipfs, pathname);
    if (fetched == undefined || fetched == null)  {
      throw err;
    }
    this.getLogger().info(
      "Successfully fetched:"
      + "\n "
      + url.href
    );
    return fetched;
  } catch (error) {
    this.getLogger().error(error);
  }
  throw err;
}

IpfsWrapper.prototype.addToIpfs = async function(ipfs, content) {
  // Add
  const err = new Error("Failed to add content...");
  try {
    const { hash, size } = await this.ipfsLibrary.add(ipfs, content);
    if (hash == null) {
      throw err;
    }
    const pathname = "/"
      + ipfsKeyword
      + "/"
      + hash;
    const url = await this.ipfsUri.normalizeUrl(pathname);
    this.getLogger().info(
      "Successfully added "
      + size
      + " bytes:"
      + "\n "
      + url.href
    );
    return {
      added: hash,
      size: size
    };
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.resolveIpnsKey = async function(ipfs, ipnsKey) {
  const pathname = "/"
    + ipnsKeyword
    + "/"
    + ipnsKey;
  var err = new Error(
    "Failed to resolve IPNS key:"
    + "\n "
    + pathname
  );
  try {
    const url = await this.ipfsUri.normalizeUrl(pathname);
    err = new Error(
      "Failed to resolve IPNS key:"
      + "\n "
      + url.href
    );
    const resolved = await this.ipfsLibrary.resolve(ipfs, pathname);
    if (resolved == undefined || resolved == null) {
      throw err;
    }
    // Resolve cid
    const { cid } = await this.ipfsLibrary.decodeCid(resolved);
    if (cid == undefined || cid == null) {
      throw err;
    }
    const parsed = await this.ipfsUri.normalizeUrl(
      "/"
      + ipfsKeyword
      + "/"
      + resolved
    );
    this.getLogger().info(
      "Successfully resolved IPNS key:"
      + "\n "
      + url.href
      + "\n "
      + parsed.href
    );
    return cid;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.publishToIpns = async function(ipfs, ipnsKey, ipnsName, cid) {
  // Publish
  const key = "/"
    + ipnsKeyword
    + "/"
    + ipnsKey;
  const pathname = "/"
    + ipfsKeyword
    + "/"
    + cid;
  var err = new Error(
    "Failed to publish IPNS name: "
    + ipnsName
    + "\n "
    + key
    + "\n "
    + pathname
  );
  try {
    const keyParsed = await this.ipfsUri.normalizeUrl(key);
    const parsed = await this.ipfsUri.normalizeUrl(pathname);
    // Publish
    err = new Error(
      "Failed to publish IPNS name: "
      + ipnsName
      + "\n "
      + keyParsed.href
      + "\n "
      + parsed.href
    );
    const published = await this.ipfsLibrary.publish(ipfs, ipnsName, pathname);
    if (published == undefined || published == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully published IPNS name: "
      + ipnsName
      + "\n "
      + keyParsed.href
      + "\n "
      + parsed.href
    );
    return published;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.pinToIpfs = async function(ipfs, cid) {
  // Pin
  const pathname = "/"
    + ipfsKeyword
    + "/"
    + cid;
  var err = new Error(
    "Failed to pin:"
    + "\n "
    + pathname
  );
  try {
    const url = await this.ipfsUri.normalizeUrl(pathname);
    err = new Error(
      "Failed to pin:"
      + "\n "
      + url.href
    );
    const pinned = await this.ipfsLibrary.pin(ipfs, pathname);
    if (pinned == undefined || pinned == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully pinned:"
      + "\n "
      + url.href
    );
    return pinned;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

IpfsWrapper.prototype.unpinFromIpfs = async function(ipfs, cid) {
  // Unpin
  const pathname = "/"
    + ipfsKeyword
    + "/"
    + cid;
  var err = new Error(
    "Failed to unpin:"
    + "\n "
    + pathname
  );
  try {
    const parsed = await this.ipfsUri.normalizeUrl(pathname);
    err = new Error(
      "Failed to unpin:"
      + "\n "
      + parsed.href
    );
    const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname);
    if (unpinned == undefined || unpinned == null) {
      throw err;
    }
    this.getLogger().info(
      "Successfully unpinned:"
      + "\n "
      + parsed.href
    );
    return unpinned;
  } catch (error) {
    this.getLogger().error(error);
  };
  throw err;
}

exports.IpfsWrapper = IpfsWrapper;

})();
