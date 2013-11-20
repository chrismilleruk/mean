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
    this.foldingRules = new GherkinFoldMode("\\:");
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

var GherkinHighlightRules = function() {
/*
    var keywords = (
        "and|as|assert|break|class|continue|def|del|elif|else|except|exec|" +
        "finally|for|from|global|if|import|in|is|lambda|not|or|pass|print|" +
        "raise|return|try|while|with|yield"
    );

    var builtinConstants = (
        "True|False|None|NotImplemented|Ellipsis|__debug__"
    );

    var builtinFunctions = (
        "abs|divmod|input|open|staticmethod|all|enumerate|int|ord|str|any|" +
        "eval|isinstance|pow|sum|basestring|execfile|issubclass|print|super|" +
        "binfile|iter|property|tuple|bool|filter|len|range|type|bytearray|" +
        "float|list|raw_input|unichr|callable|format|locals|reduce|unicode|" +
        "chr|frozenset|long|reload|vars|classmethod|getattr|map|repr|xrange|" +
        "cmp|globals|max|reversed|zip|compile|hasattr|memoryview|round|" +
        "__import__|complex|hash|min|set|apply|delattr|help|next|setattr|" +
        "buffer|dict|hex|object|slice|coerce|dir|id|oct|sorted|intern"
    );
    var keywordMapper = this.createKeywordMapper({
        "invalid.deprecated": "debugger",
        "support.function": builtinFunctions,
        "constant.language": builtinConstants,
        "keyword": keywords
    }, "identifier");

    var strPre = "(?:r|u|ur|R|U|UR|Ur|uR)?";

    var decimalInteger = "(?:(?:[1-9]\\d*)|(?:0))";
    var octInteger = "(?:0[oO]?[0-7]+)";
    var hexInteger = "(?:0[xX][\\dA-Fa-f]+)";
    var binInteger = "(?:0[bB][01]+)";
    var integer = "(?:" + decimalInteger + "|" + octInteger + "|" + hexInteger + "|" + binInteger + ")";

    var exponent = "(?:[eE][+-]?\\d+)";
    var fraction = "(?:\\.\\d+)";
    var intPart = "(?:\\d+)";
    var pointFloat = "(?:(?:" + intPart + "?" + fraction + ")|(?:" + intPart + "\\.))";
    var exponentFloat = "(?:(?:" + pointFloat + "|" +  intPart + ")" + exponent + ")";
    var floatNumber = "(?:" + exponentFloat + "|" + pointFloat + ")";

    var stringEscape =  "\\\\(x[0-9A-Fa-f]{2}|[0-7]{3}|[\\\\abfnrtv'\"]|U[0-9A-Fa-f]{8}|u[0-9A-Fa-f]{4})";

    this.$rules = {
        "start" : [ {
            token : "comment",
            regex : "#.*$"
        }, {
            token : "string",           // multi line """ string start
            regex : strPre + '"{3}',
            next : "qqstring3"
        }, {
            token : "string",           // " string
            regex : strPre + '"(?=.)',
            next : "qqstring"
        }, {
            token : "string",           // multi line ''' string start
            regex : strPre + "'{3}",
            next : "qstring3"
        }, {
            token : "string",           // ' string
            regex : strPre + "'(?=.)",
            next : "qstring"
        }, {
            token : "constant.numeric", // imaginary
            regex : "(?:" + floatNumber + "|\\d+)[jJ]\\b"
        }, {
            token : "constant.numeric", // float
            regex : floatNumber
        }, {
            token : "constant.numeric", // long integer
            regex : integer + "[lL]\\b"
        }, {
            token : "constant.numeric", // integer
            regex : integer + "\\b"
        }, {
            token : keywordMapper,
            regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
        }, {
            token : "keyword.operator",
            regex : "\\+|\\-|\\*|\\*\\*|\\/|\\/\\/|%|<<|>>|&|\\||\\^|~|<|>|<=|=>|==|!=|<>|="
        }, {
            token : "paren.lparen",
            regex : "[\\[\\(\\{]"
        }, {
            token : "paren.rparen",
            regex : "[\\]\\)\\}]"
        }, {
            token : "text",
            regex : "\\s+"
        } ],
        "qqstring3" : [ {
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string", // multi line """ string end
            regex : '"{3}',
            next : "start"
        }, {
            defaultToken : "string"
        } ],
        "qstring3" : [ {
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string",  // multi line ''' string end
            regex : "'{3}",
            next : "start"
        }, {
            defaultToken : "string"
        } ],
        "qqstring" : [{
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string",
            regex : "\\\\$",
            next  : "qqstring"
        }, {
            token : "string",
            regex : '"|$',
            next  : "start"
        }, {
            defaultToken: "string"
        }],
        "qstring" : [{
            token : "constant.language.escape",
            regex : stringEscape
        }, {
            token : "string",
            regex : "\\\\$",
            next  : "qstring"
        }, {
            token : "string",
            regex : "'|$",
            next  : "start"
        }, {
            defaultToken: "string"
        }]
    };*/

    var featureKeywords = exports.featureKeywords = "Ability|Business Need|Feature";
    
    var simpleContainerKeywords = exports.simpleContainerKeywords = "Scenario|Background";
    var stepKeywords = exports.stepKeywords = "But|And|Then|When|Given|\\*";

    var templateContainerKeywords = exports.templateContainerKeywords = "Scenario Template|Scenario Outline";
    var templateExampleKeywords = exports.templateExampleKeywords = "Scenarios|Examples";

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
                    onMatch: function(value) {
                        console.log("comment.multiline.start", arguments);
                        return this.token;
                    }
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
                onMatch: function(value) {
                    console.log("feature: ", arguments);
                    return this.token;
                }
            },
            {
                token : "keyword.stepContainer",
                regex : "^\\s*(?:"+simpleContainerKeywords+"):",
                onMatch: function(value) {
                    console.log("keyword.stepContainer", arguments);
                    return this.token;
                }
            },
            {
                token : "keyword.stepContainer.template",
                regex : "^\\s*(?:"+templateContainerKeywords+"):",
                onMatch: function(value) {
                    console.log("keyword.stepContainer.template", arguments);
                    return this.token;
                }
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

exports.GherkinHighlightRules = GherkinHighlightRules;
});

define('ace/mode/folding/gherkin', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/mode/folding/fold_mode'], function(require, exports, module) {


var oop = require("../../lib/oop");
var BaseFoldMode = require("./fold_mode").FoldMode;

var FoldMode = exports.FoldMode = function(markers) {
    this.foldingStartMarker = new RegExp("([\\[{])(?:\\s*)$|(" + markers + ")(?:\\s*)(?:#.*)?$");
};
oop.inherits(FoldMode, BaseFoldMode);

(function() {

    this.getFoldWidgetRange = function(session, foldStyle, row) {
        var line = session.getLine(row);
        var match = line.match(this.foldingStartMarker);
        if (match) {
            if (match[1])
                return this.openingBracketBlock(session, match[1], row, match.index);
            if (match[2])
                return this.indentationBlock(session, row, match.index + match[2].length);
            return this.indentationBlock(session, row);
        }
    }

}).call(FoldMode.prototype);

});
