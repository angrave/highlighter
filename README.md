highlighter
===========

"highlighter" is a small, no-dependency, self-contained "just drop-in and use" javascript library that can find and highlight text.

This library visits the web page DOM. For each matching text node it creates new text nodes with the matched and unmatched text fragments.

The simplest find incantation - useful for replacing Android's webview less-than-useful find(Async)All and findNext methods - 
```
highlighter.highlight(documentbody," easy "); /*Highlights every instance of easy (case insensitive)*/
highlighter.findFirst();

highlighter.findNext(1)); /* -1 for previous */
highlighter.cancel(); /*Finished - return web page to its original form*/
```

The simplest highlight incantation is to highlight a case-insensitive string or provide a regular expression. Regular expressions are always matched multiple times per text node (equivalent to the global modifier).
```javascript
highlighter.highlight(document.body,'NASA');
highlighter.highlight(document.body,/d+/');
```

Will highlight all matches of NASA in upper or lower case and all digits respectively.
Matching text is wrapped in a yellow background and dark text span tag -

span style='color:black; background-color:yellow'

Unmatched text in the same text node is wrapped in an empty span tag.

Use matchHtml and nomatchHtml options to provide your own html to wrap matched and neighboring non-matched text. For example,

```
highlighter.highlight( document.body, 'The'
   , {'caseSensitive':true, 'matchHtml':'<b>', 'nomatchHtml':'<em>'}
);

highlighter.highlight( document.body, /\s/
   , { 'matchHtml':'<span class="myhighlight">'}
);
```

Use highlighter.cancel() to return the web page to its original form-

```
highlighter.cancel();
```
To learn more see the source code and the examples. It has been tested on Chrome 30,Safari 6,Firefox 24. 
It has been designed to be compatible with all standard browsers but has not yet been tested on IE platforms.

How does it work?
=================
+ Recursively search the DOM for all text nodes. 
+ The contents of each matching text node is broken up and placed into new text nodes that are inserted after the matching node. 
+ Each piece of matching and non-matching text is then wrapped inside a new span element (or whatever you specified).
+ The original text node is temporary changed to show an empty string but it's not actually removed from the DOM.
+ A list of modified text nodes and new temporary nodes are stored in a stack so that we can later undo these DOM manipulations.
+ The list of changes are also returned to the caller.
 
Why?
====
Because many versions of Android's WebView component do not properly implement find.

