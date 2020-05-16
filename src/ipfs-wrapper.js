/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Wrapper

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /**
   * https://github.com/purposeindustries/window-or-global
   * The MIT License (MIT) Copyright (c) Purpose Industries
   * version: 1.0.1
   */
  const root =
    (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global) ||
    this

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  const name = 'ipfs-wrapper'

  var IpfsWrapper = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
    this.ipfsLibrary = ipfsBundle.ipfsLibrary
    this.ipfsUrl = ipfsBundle.ipfsUrl
  }

  IpfsWrapper.prototype.getLogger = function () {
    return root.log.getLogger(name)
  }

  IpfsWrapper.prototype.getWindowIpfsClient = async function () {
    // IPFS Companion
    try {
      const policy = await this.ipfsLibrary.getWindowIpfs()
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve IPFS Companion...')
  }

  IpfsWrapper.prototype.getHttpIpfsClient = async function (url) {
    // HTTP Client
    try {
      const policy = await this.ipfsLibrary.getHttpIpfs(url)
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve an IPFS HTTP provider...')
  }

  IpfsWrapper.prototype.getIpfsClient = async function (url) {
    // IPFS client
    try {
      var policy = null
      const ipfsProvider = $tw.utils.getIpfsProvider()
      if (ipfsProvider === 'window') {
        policy = await this.ipfsLibrary.getWindowIpfs()
      } else if (ipfsProvider === 'http') {
        policy = await this.ipfsLibrary.getHttpIpfs(url)
      } else {
        policy = await this.ipfsLibrary.getDefaultIpfs(url)
      }
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve an IPFS provider...')
  }

  IpfsWrapper.prototype.getIpnsIdentifiers = async function (
    ipfs,
    identifier,
    ipnsName
  ) {
    if (
      identifier === undefined ||
      identifier == null ||
      identifier.trim() === ''
    ) {
      identifier = null
    } else {
      identifier = identifier.trim()
    }
    if (ipnsName === undefined || ipnsName == null || ipnsName.trim() === '') {
      ipnsName = null
    } else {
      ipnsName = ipnsName.trim()
    }
    if (identifier == null && ipnsName == null) {
      throw new Error('Undefined IPNS identifiers...')
    }
    var found = false
    var ipnsKey = null
    var keys = null
    var normalizedUrl = null
    try {
      // Only the server who generates the key has the knowledge
      keys = await this.getIpnsKeys(ipfs)
    } catch (error) {
      this.getLogger().error(error)
    }
    // Do our best
    if (ipnsName !== null && identifier !== null) {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          if (keys[index].id === identifier && keys[index].name === ipnsName) {
            ipnsKey = identifier
            found = true
            break
          }
        }
      }
    } else if (ipnsName !== null) {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          if (keys[index].name === ipnsName) {
            ipnsKey = keys[index].id
            found = true
            break
          }
        }
      }
    } else {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          if (
            keys[index].id === identifier ||
            keys[index].name === identifier
          ) {
            ipnsKey = keys[index].id
            ipnsName = keys[index].name
            found = true
            break
          }
        }
      }
    }
    if (found === false) {
      // Unable to resolve the keys, check if identifier is a an IPFS cid
      if (this.ipfsBundle.isCid(identifier) === false) {
        throw new Error('Unknown IPNS identifier...')
      }
      ipnsKey = identifier
    }
    // Lets build an url, the resolver will do the final check, we cannot do more here
    normalizedUrl = this.ipfsUrl.normalizeUrl('/' + ipnsKeyword + '/' + ipnsKey)
    if (found) {
      this.getLogger().info(
        'Successfully Fetched IPNS identifiers: ' +
          ipnsName +
          '\n ' +
          normalizedUrl
      )
    } else {
      this.getLogger().info(
        'Unable to Fetch IPNS identifiers, default to\n ' + normalizedUrl
      )
    }
    return {
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl
    }
  }

  IpfsWrapper.prototype.generateIpnsKey = async function (ipfs, ipnsName) {
    try {
      const key = await this.ipfsLibrary.genKey(ipfs, ipnsName)
      const url = this.ipfsUrl.normalizeUrl('/' + ipnsKeyword + '/' + key)
      this.getLogger().info(
        'Successfully generated IPNS key with IPNS name: ' +
          ipnsName +
          '\n ' +
          url
      )
      return key
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to generate and IPNS key...')
  }

  IpfsWrapper.prototype.removeIpnsKey = async function (ipfs, ipnsName) {
    try {
      const hash = await this.ipfsLibrary.rmKey(ipfs, ipnsName)
      this.getLogger().info('Successfully removed IPNS name: ' + ipnsName)
      return hash
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to remove an IPNS Key...')
  }

  IpfsWrapper.prototype.renameIpnsName = async function (
    ipfs,
    oldIpnsName,
    newIpnsName
  ) {
    try {
      const { id: key, was, now } = await this.ipfsLibrary.renameKey(
        ipfs,
        oldIpnsName,
        newIpnsName
      )
      this.getLogger().info(
        'Successfully renamed IPNS name: ' + was + ' with ' + now
      )
      return {
        ipnsKey: key,
        ipnsName: now
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to rename an IPNS name...')
  }

  IpfsWrapper.prototype.getIpnsKeys = async function (ipfs) {
    try {
      const keys = await this.ipfsLibrary.getKeys(ipfs)
      this.getLogger().info('Successfully fetched IPNS keys...')
      return keys
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to fetch IPNS keys...')
  }

  IpfsWrapper.prototype.fetchFromIpfs = async function (ipfs, cid) {
    // Check
    if (cid === undefined || cid == null || cid.trim() === '') {
      throw new Error('Undefined IPNS identifier...')
    } else {
      cid = cid.trim()
    }
    const pathname = '/' + ipfsKeyword + '/' + cid
    try {
      const fetched = await this.ipfsLibrary.cat(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info('Successfully fetched:' + '\n ' + url)
      return fetched
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to fetch from IPFS...')
  }

  IpfsWrapper.prototype.addToIpfs = async function (ipfs, content) {
    try {
      const { hash, size } = await this.ipfsLibrary.add(ipfs, content)
      const pathname = '/' + ipfsKeyword + '/' + hash
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(
        'Successfully added ' + size + ' bytes:' + '\n ' + url
      )
      return {
        added: hash,
        size: size
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to add content to IPFS...')
  }

  IpfsWrapper.prototype.resolveIpnsKey = async function (ipfs, ipnsKey) {
    // Check
    if (ipnsKey === undefined || ipnsKey == null || ipnsKey.trim() === '') {
      throw new Error('Undefined IPNS key...')
    } else {
      ipnsKey.trim()
    }
    const pathname = '/' + ipnsKeyword + '/' + ipnsKey
    try {
      const url = this.ipfsUrl.normalizeUrl(pathname)
      const resolved = await this.ipfsLibrary.resolve(ipfs, pathname)
      const { cid } = this.ipfsBundle.decodeCid(resolved)
      if (cid !== null) {
        const parsed = this.ipfsUrl.normalizeUrl(resolved)
        this.getLogger().info(
          'Successfully resolved IPNS key:' + '\n ' + url + ' \n ' + parsed
        )
        return cid
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to resolve an IPNS key...')
  }

  IpfsWrapper.prototype.publishIpnsName = async function (
    cid,
    ipfs,
    ipnsKey,
    ipnsName
  ) {
    // Check
    if (ipnsKey === undefined || ipnsKey == null || ipnsKey.trim() === '') {
      throw new Error('Undefined IPNS key...')
    } else {
      ipnsKey = ipnsKey.trim()
    }
    if (ipnsName === undefined || ipnsName == null || ipnsName.trim() === '') {
      throw new Error('Undefined IPNS name...')
    } else {
      ipnsName = ipnsName.trim()
    }
    if (cid === undefined || cid == null || cid.trim() === '') {
      throw new Error('Undefined IPNS identifier...')
    } else {
      cid = cid.trim()
    }
    // Path
    const key = '/' + ipnsKeyword + '/' + ipnsKey
    const pathname = '/' + ipfsKeyword + '/' + cid
    try {
      // Publish
      const result = await this.ipfsLibrary.publish(ipfs, ipnsName, pathname)
      const keyParsed = this.ipfsUrl.normalizeUrl(key)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(
        'Successfully published IPNS name: ' +
          ipnsName +
          '\n ' +
          keyParsed +
          '\n ' +
          url
      )
      return result
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to publish an IPNS name...')
  }

  IpfsWrapper.prototype.pinToIpfs = async function (ipfs, cid) {
    // Check
    if (cid === undefined || cid == null || cid.trim() === '') {
      throw new Error('Undefined IPNS identifier...')
    } else {
      cid = cid.trim()
    }
    const pathname = '/' + ipfsKeyword + '/' + cid
    try {
      const pinned = await this.ipfsLibrary.pin(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info('Successfully pinned:' + '\n ' + url)
      return pinned
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to pin to IPFS...')
  }

  IpfsWrapper.prototype.unpinFromIpfs = async function (ipfs, cid) {
    // Check
    if (cid === undefined || cid == null || cid.trim() === '') {
      throw new Error('Undefined IPNS identifier...')
    } else {
      cid = cid.trim()
    }
    const pathname = '/' + ipfsKeyword + '/' + cid
    try {
      const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info('Successfully unpinned:' + '\n ' + url)
      return unpinned
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to unpin from IPFS...')
  }

  exports.IpfsWrapper = IpfsWrapper
})()
