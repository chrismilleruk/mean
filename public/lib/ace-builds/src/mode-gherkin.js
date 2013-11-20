/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/mode/gherkin', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text', 'ace/tokenizer', 'ace/mode/gherkin_highlight_rules', 'ace/mode/folding/gherkin', 'ace/range'], function(require, exports, module) {


var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var GherkinHighlightRules = require("./gherkin_highlight_rules").GherkinHighlightRules;
var GherkinFoldMode = require("./folding/gherkin").FoldMode;
var Range = require("../range").Range;

var Mode = function() {
    this.HighlightRules = GherkinHighlightRules;
    this.foldingRules = new GherkinFoldMode(GherkinHighlightRules.foldingKeywords);
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = "#";

    this.getNextLineIndent = function(state, line, tab) {
        var indent = this.$getIndent(line);

        var tokenizedLine = this.getTokenizer().getLineTokens(line, state);
        var tokens = tokenizedLine.tokens;

        if (tokens.length && tokens[tokens.length-1].type == "comment") {
            return indent;
        }

        if (state == "start") {
            var match = line.match(/^.*[\{\(\[\:]\s*$/);
            if (match) {
                indent += tab;
            }
        }

        return indent;
    };

    var outdents = {
        "pass": 1,
        "return": 1,
        "raise": 1,
        "break": 1,
        "continue": 1
    };
    
    this.checkOutdent = function(state, line, input) {
        if (input !== "\r\n" && input !== "\r" && input !== "\n")
            return false;

        var tokens = this.getTokenizer().getLineTokens(line.trim(), state).tokens;
        
        if (!tokens)
            return false;
        do {
            var last = tokens.pop();
        } while (last && (last.type == "comment" || (last.type == "text" && last.value.match(/^\s+$/))));
        
        if (!last)
            return false;
        
        return (last.type == "keyword" && outdents[last.value]);
    };

    this.autoOutdent = function(state, doc, row) {
        
        row += 1;
        var indent = this.$getIndent(doc.getLine(row));
        var tab = doc.getTabString();
        if (indent.slice(-tab.length) == tab)
            doc.remove(new Range(row, indent.length-tab.length, row, indent.length));
    };

}).call(Mode.prototype);

exports.Mode = Mode;
});

define('ace/mode/gherkin_highlight_rules', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/text_highlight_rules'], function(require, exports, module) {


var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;


var featureKeywords = exports.featureKeywords = "Ability|Business Need|Feature";

var simpleContainerKeywords = exports.simpleContainerKeywords = "Scenario|Background";
var stepKeywords = exports.stepKeywords = "But|And|Then|When|Given|\\*";

var templateContainerKeywords = exports.templateContainerKeywords = "Scenario Template|Scenario Outline";
var templateExampleKeywords = exports.templateExampleKeywords = "Scenarios|Examples";


var GherkinHighlightRules = function() {

    var rules = {
        common: {
            "comment": {
                token : "comment.inline",
                regex : "#.*$"
            },
            "string": {
                token : "string.inline.doublequotes",
                regex : '"[^"]*?"'
            },
            "placeholder": {
                token : "variable.parameter.support.placeholder",
                regex : '"?<[^>]*?>"?'
            }
        },
        "multiline": {
            "comment": {
                key: "comment-multiline",
                trigger: {
                    token : "comment.multiline.start",
                    regex : "(?:\\/\\*)",
                    next  : "comment-multiline",
                    // onMatch: function(value) {
                    //     console.log("comment.multiline.start", arguments);
                    //     return this.token;
                    // }
                },
                rules: [
                    {
                        token : "comment.multiline.end",             // multi line """ string end
                        regex : '(?:[^\\*]*?)\\*\\/',
                        next : "pop"
                    }, 
                    {
                        token : "comment.multiline",
                        regex : '.+'
                    }
                ]
            },
            "string": {
                key: "qqstring",
                trigger: {
                    token : "string.multiline.start",           // multi line """ string start
                    regex : '^\\s*"{3}.*$',
                    next : "qqstring"
                },
                rules: [{
                    token : "string.multiline.end",             // multi line """ string end
                    regex : '(?:[^\\\\]|\\\\.)*?"{3}',
                    next : "pop"
                }, {
                    token : "string.multiline",
                    regex : '.+'
                }]
            }
        }
    };

    this.$rules = {
        "start" : [
            rules.common.placeholder,
            rules.common.string,
            rules.common.comment,
            rules.multiline.comment.trigger,
            rules.multiline.string.trigger,
            {
                token : "support.type.tag",
                regex : "@[^@\\s]+" 
            },
            {
                token : "keyword.feature",
                regex : "^\\s*(?:"+featureKeywords+"):",
                // onMatch: function(value) {
                //     console.log("feature: ", arguments);
                //     return this.token;
                // }
            },
            {
                token : "keyword.stepContainer",
                regex : "^\\s*(?:"+simpleContainerKeywords+"):",
                // onMatch: function(value) {
                //     console.log("keyword.stepContainer", arguments);
                //     return this.token;
                // }
            },
            {
                token : "keyword.stepContainer.template",
                regex : "^\\s*(?:"+templateContainerKeywords+"):",
                // onMatch: function(value) {
                //     console.log("keyword.stepContainer.template", arguments);
                //     return this.token;
                // }
            },
            {
                token : "keyword.step",
                regex : "^\\s*(?:"+stepKeywords+")"
            },
            {
                token : "keyword.exampleContainer.template",
                regex : "^\\s*(?:"+templateExampleKeywords+"):",
            }
        ],
        "container": [
        // Don't do this. Fix with a linter.
            rules.common.placeholder,
            rules.common.string,
            rules.common.comment,
            rules.multiline.comment.trigger,
            rules.multiline.string.trigger,
            {
                token : "keyword.step",
                regex : "^\\s*(?:"+stepKeywords+")"
            },
            {
                token : "keyword.exampleContainer.template",
                regex : "^\\s*(?:"+templateExampleKeywords+"):",
            },
        ]
    };
    
    this.$rules[rules.multiline.string.key] = rules.multiline.string.rules;
    this.$rules[rules.multiline.comment.key] = rules.multiline.comment.rules;

    this.normalizeRules();

/*        "comment-multiline" : [
            {
                token : "comment.multiline.end",             // multi line """ string end
                regex : '(?:[^\\*]*?)\\*\\/',
                next : "pop"
            }, 
            {
                token : "comment.multiline",
                regex : '.+'
            }
        ],
        "qqstring" : [ {
                token : "string.multiline.end",             // multi line """ string end
                regex : '(?:[^\\\\]|\\\\.)*?"{3}',
                next : "pop"
            }, {
                token : "string.multiline",
                regex : '.+'
            }
        ]
    };
*/



/* Working rules */
/*    this.$rules = {
        "start" : [
            {
                token : "comment.inline",
                regex : "#.*$"
            }, 
            {
                token : "comment.multiline.start",
                regex : "(?:\\/\\*)",
                next  : "comment-multiline"
            }, 
            {
                token : "support.type.tag",
                regex : "@[^@\\s]+" 
            },
            {
                token : "keyword.feature",
                regex : "^\\s*(?:"+featureKeywords+"):",
            },
            {
                token : "keyword.stepContainer",
                regex : "^\\s*(?:"+templateContainerKeywords+"|"+simpleContainerKeywords+"):",
            },
            {
                token : "keyword.exampleContainer",
                regex : "^\\s*(?:"+templateExampleKeywords+"):",
            },
            {
                token : "keyword.step",
                regex : "^\\s*(?:"+stepKeywords+")"
            },
            {
                token : "string.multiline.start",           // multi line """ string start
                regex : '^\\s*"{3}.*$',
                next : "qqstring"
            },
        ],
        "comment-multiline" : [
            {
                token : "comment.multiline.end",             // multi line """ string end
                regex : '(?:[^\\*]*?)\\*\\/',
                next : "pop"
            }, 
            {
                token : "comment.multiline",
                regex : '.+'
            }
        ],
        "qqstring" : [ {
                token : "string.multiline.end",             // multi line """ string end
                regex : '(?:[^\\\\]|\\\\.)*?"{3}',
                next : "pop"
            }, {
                token : "string.multiline",
                regex : '.+'
            }
        ]
    };*/
};

oop.inherits(GherkinHighlightRules, TextHighlightRules);

GherkinHighlightRules.foldingKeywords = [featureKeywords, [templateContainerKeywords, simpleContainerKeywords], templateExampleKeywords];

exports.GherkinHighlightRules = GherkinHighlightRules;
});

define('ace/mode/folding/gherkin', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/range', 'ace/mode/folding/fold_mode'], function(require, exports, module) {


var oop = require("../../lib/oop");
var Range = require("../../range").Range
var BaseFoldMode = require("./fold_mode").FoldMode;

var getArrayReduceFn = function(joinWith) {
    var reduceFn = function(acc, val, ind, arr) { 
        if (typeof val.reduce === "function") {
            return val.reduce(reduceFn, acc);
        }
        return [acc, val].filter(function(v){return v;}).join(joinWith);
    };
    return reduceFn;
};

var FoldMode = exports.FoldMode = function(markers) {
    this.foldMarkers = markers;

    var allMarkers = this.foldMarkers.reduce(getArrayReduceFn("|"), "");
    this.foldingStartMarker = new RegExp("(" + allMarkers + ")(?:\\s*)(?:.*)?$");

    //console.log("FoldMode", markers, this.foldingStartMarker);    
};
oop.inherits(FoldMode, BaseFoldMode);

(function() {

    this.getFoldWidgetRange = function(session, foldStyle, row) {
        var line = session.getLine(row);
        var match = line.match(this.foldingStartMarker);
        //console.log("getFoldWidgetRange", foldStyle, line, match);
        if (match) {
            return this.implicitBlock(session, match[1], row, row.length);
            // if (match[1])
            //     return this.implicitBlock(session, match[1], row, match.index);
            // if (match[2])
            //     return this.indentationBlock(session, row, match.index + match[2].length);
            // return this.indentationBlock(session, row);
        }
    }

    this.getStopMarkers = function(startMarker) {
        // The fold markers are arranged hierarchically.
        // For any given keyword we want to fold to an equivalent or higher level keyword.
        // e.g. Scenario folds to Scenario, Scenario Outline or Feature
        // e.g. Feature folds to Feature
        var found = false;
        var flatten = getArrayReduceFn("|");

        var stopMarkers = this.foldMarkers.filter(function(val) {
                if (found) {
                    return false;
                }
                
                items = flatten("", val).split("|");

                if (items.indexOf(startMarker) > -1) {
                    found = true;
                }
                return true;
            });
        
        //console.log("stopMarkers", startMarker, flatten("", stopMarkers));

        return stopMarkers;
    };

    this.implicitBlock = function(session, startMarker, row, column) {
        var flatten = getArrayReduceFn("|");
        var stopMarkers = flatten("", this.getStopMarkers(startMarker));

        //console.log('implicitBlock', startMarker, row, column, stopMarkers);

        var reWhitespace = /^\s*(@.*)?$/;
        var reStopMarker = new RegExp("^\\s*("+ stopMarkers +")");
        var line = session.getLine(row);
        
        var startColumn = column || line.length;
        var maxRow = session.getLength();
        var startRow = row;
        var endRow = row;

        while (++row < maxRow) {
            var line = session.getLine(row);
            var stop = line.search(reStopMarker);
            var ws = line.search(reWhitespace);

            if (stop > -1)
            {
                // stop marker was found so exit the while loop.
                break;
            }

            if (ws == -1)
            {
                // not a stop marker and not whitespace
                // therefore this line contains content.
                endRow = row;

                //console.log('content found', startMarker, row, line.length, line, ws);
            }
        }

        if (endRow > startRow) {
            var endColumn = session.getLine(endRow).length;
            return new Range(startRow, startColumn, endRow, endColumn);
        }
    };

}).call(FoldMode.prototype);

});
