/*\
title: $:/plugins/ipfs/modules/parsers/htmlparser.js
type: application/javascript
tags: $:/ipfs/core
module-type: parser

The HTML parser displays text as raw HTML

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

  /*eslint no-unused-vars: "off"*/
  const name = 'ipfs-htmlparser'

  var HtmlParser = function (type, text, options) {
    var self = this
    var value = 'data:text/html;charset=utf-8,'
    var src
    if (
      $tw.browser &&
      options.tiddler !== undefined &&
      options.tiddler !== null
    ) {
      var canonicalUri = options.tiddler.fields._canonical_uri
      canonicalUri =
        canonicalUri === undefined ||
        canonicalUri == null ||
        canonicalUri.trim() === ''
          ? null
          : canonicalUri.trim()
      if (canonicalUri !== null) {
        var password = options.tiddler.fields._password
        password =
          password === undefined || password == null || password.trim() === ''
            ? null
            : password.trim()
        $tw.ipfs
          .resolveUrl(false, true, canonicalUri)
          .then(data => {
            var { normalizedUrl, resolvedUrl } = data
            var url =
              resolvedUrl !== null
                ? resolvedUrl.toString()
                : normalizedUrl !== null
                ? normalizedUrl.toString()
                : null
            if (url !== null) {
              src = url
              var parsedTiddler = $tw.utils.getChangedTiddler(options.tiddler)
              $tw.rootWidget.refresh(parsedTiddler)
            }
            if (url !== null) {
              $tw.ipfs
                .loadToUtf8(url, password)
                .then(data => {
                  if (data) {
                    src = value + encodeURIComponent(data)
                    var parsedTiddler = $tw.utils.getChangedTiddler(
                      options.tiddler
                    )
                    $tw.rootWidget.refresh(parsedTiddler)
                  }
                })
                .catch(error => {
                  self.getLogger().error(error)
                  $tw.utils.alert(name, error.message)
                })
            }
          })
          .catch(error => {
            self.getLogger().error(error)
          })
      } else if (text) {
        src = value + encodeURIComponent(text)
      }
    }
    this.tree = [
      {
        type: 'element',
        tag: 'iframe',
        attributes: {
          src: { type: 'string', value: src },
          sandbox: { type: 'string', value: '' }
        }
      }
    ]
  }

  HtmlParser.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  exports['text/html'] = HtmlParser
})()
