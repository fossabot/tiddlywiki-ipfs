/*\
title: $:/core/modules/ipfs-wiki.js
type: application/javascript
tags: $:/ipfs/core
module-type: wikimethod

wikimethod

\*/

/**
 * TiddlyWiki created by Jeremy Ruston, (jeremy [at] jermolene [dot] com)
 *
 * Copyright (c) 2004-2007, Jeremy Ruston
 * Copyright (c) 2007-2018, UnaMesa Association
 * Copyright (c) 2019-2020, Blue Light
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*
   * Parse a block of text of a specified MIME type
   *  type: content type of text to be parsed
   *  text: text
   *  options: see below
   * Options include:
   *  parseAsInline: if true, the text of the tiddler will be parsed as an inline run
   *  _canonical_uri: optional string of the canonical URI of this content
   */
  exports.parseText = function (type, text, options) {
    text = text || ''
    options = options || {}
    // Select a parser
    var Parser = $tw.Wiki.parsers[type]
    if (!Parser && $tw.utils.getFileExtensionInfo(type)) {
      Parser = $tw.Wiki.parsers[$tw.utils.getFileExtensionInfo(type).type]
    }
    if (!Parser) {
      Parser = $tw.Wiki.parsers[options.defaultType || 'text/vnd.tiddlywiki']
    }
    if (!Parser) {
      return null
    }
    // Return the parser instance
    return new Parser(type, text, {
      parseAsInline: options.parseAsInline,
      wiki: this,
      tiddler: options.tiddler
    })
  }

  /*
   * Parse a tiddler according to its MIME type
   */
  exports.parseTiddler = function (title, options) {
    options = $tw.utils.extend({}, options)
    var cacheType = options.parseAsInline ? 'inlineParseTree' : 'blockParseTree'
    var tiddler = this.getTiddler(title)
    var self = this
    return tiddler
      ? this.getCacheForTiddler(title, cacheType, function () {
          options.tiddler = tiddler
          return self.parseText(
            tiddler.fields.type,
            tiddler.fields.text,
            options
          )
        })
      : null
  }
})()
