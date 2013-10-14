
/* highlighter. The most recent version can be found at 
https://github.com/angrave/highlighter
Retain the following copyright and license information when you include this library.

The MIT License (MIT)

Copyright (c) 2013 Lawrence Angrave

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
highlighter = (function() {
   
var api = {}

api.version= function() {return 1;}

api.about= function() {return "highlighter (version "+api.version() + " ) by L Angrave. See https://github.com/angrave/highlighter for the open source license and the latest version";}
 
api.highlight = function(elements, search, options) {
  if(arguments.length<2) {
    api.cancel();
    return undefined;      
  }
  
  if(typeof options === "undefined") options= {};
  
  if( ! isArray(elements) )
     elements = [elements];

  if( ! options.keepPrevious )
    api.cancel();

  var matchHtml = options.matchHtml;
  if(!matchHtml) 
     matchHtml="<span style='color:black; background-color:yellow;'>";

  var noMatchHtml = options.noMatchHtml;
  if(!noMatchHtml) 
     noMatchHtml="<span>";
  
  
  var caseInsensitive = !options.caseSensitive;
  var isregex = (search instanceof RegExp);

  /* Regular expression-like strings are interpretted as regular expressions unless options.isregex is explicitly false */
  if(! isregex && options.isregex != false && search[0]==='/') {
    var regex= tryToRegExp(search);
    if(regex) {
      search = regex;
      isregex = true;
    }
  }
  /* Options tell us to force the string as a regular expression? */
  if(! isregex && options.isregex) {
    var regex= tryToRegExp(search);
    search = regex ? regex : new RegExp(search, (caseInsensitive?"i":"") + (options.multiline?"m":"") )
    isregex = true;
  }
  
  
  result = {'entries':[],'id': ++uniqueId, 'findOrdinal' :0,'elements': elements,
    createEntry : function(node,text,siblings) {
      var e = {"node":node,"original":text, "siblings":siblings};
      this.entries.push(e)
      return e;
    }
  }
  undoStack.push(result);
  
  var callback = isregex ?
     createRegexHighlighter(result, search, matchHtml,noMatchHtml, caseInsensitive, options)
  :  createStringMatchHighlighter(result, search, matchHtml,noMatchHtml, caseInsensitive, options);
    
  for(var i=0;i<elements.length;i++)
    api.visitTextNodes(elements[i], callback);
    
  var matched = (result.matched = []);
  for(var i =0, ilen = result.entries.length; i < ilen; i++) {
    var siblings = result.entries[i].siblings;
    for(var j =1, jlen = siblings.length; j < jlen; j+=2)
      matched.push(siblings[j]);
   }
  
  return result;
}

api.findFirst = function() {
  var lastResult = api.getLastHighlight();
  if(!lastResult) return 0;
  lastResult.findOrdinal = 0;
  api.findNext(0);
}

api.findNext = function(forward) {
  if (typeof forward === "undefined") 
    forward = 1;
    
  var lastResult = api.getLastHighlight();
  if(!lastResult) return 0;
  var findCount = lastResult.matched.length;
  if(findCount < 1) return 0;
  
  /* Double modulo maps even large negative values to [0 .. findCount-1] */
  lastResult.findOrdinal = (((lastResult.findOrdinal+ forward) % findCount) +  findCount) % findCount;    
  
  var e = lastResult.matched[lastResult.findOrdinal];
  api.scrollToElement(e);
  return lastResult.findOrdinal;
}    

/* Undo highlights */
api.cancel = function(id) {
  if(id === undefined) {
    /* undo everything*/
    api.cancel(0);
  }
  if(typeof id !== 'number' )
    return;
   /* Pop highlights off the stack one at a time until we've removed the desired id*/
  while(undoStack.length && undoStack[undoStack.length-1].id>= id) {
     var entries = undoStack.pop().entries;
     for(var i=0; i < entries.length;i++) {
        var e = entries[i];
        e.node.nodeValue = e.original;
        removeNodes(e.siblings);
     }
   }
}
/* Todo support scrollable divs i.e.
style.overflow == "scroll" || element.style.overflowX == "scroll" || element.style.overflowY == "scroll") */
api.scrollToElement = function(e) {
    var posn= getElementPosition(e);
    window.scrollTo(posn.x,posn.y);
    
}

api.getLastHighlight = function() {
  if(!undoStack.length) return null;  
  return undoStack[undoStack.length - 1];
}

/*A local modification-safe recursive DOM textnode visitor: A copy of the child node list is created before traversing them.*/
api.visitTextNodes = function(node, callback) {
    if (node.nodeType == 3) /*TextNodes are always leaves*/
      callback(node);
    else {      
      var children = node.childNodes;
      var originalList=[];
      for(var i=0, len= children.length; i < len; i++) 
        originalList.unshift(children[i]);
        
      var n;
      while((n=originalList.pop()) !== undefined)
         api.visitTextNodes(n,callback);
    }
};
      
/* Internal implementation details */
var undoStack=[];
var uniqueId = 0;

var tryToRegExp = function(s) { 
  var matched= s.match(/^\/(.*)\/([igm]{0,3})[\/]{0,1}$/);
  if(!matched || matched.length != 3) return null;
  try {
    return new RegExp( matched[1], matched[2]);
  }catch(ignored) {
    return null;
  }
}
var scratchdiv = document.createElement('div');
var isArray = function(param) {
  /*Some old browsers don't support Array.isArray*/
  return Object.prototype.toString.call( param ) === '[object Array]';
}
var htmlToElement = function(html) {
      scratchdiv.innerHTML = html;
      var n = scratchdiv.firstChild ;
      return n;
}

var insertAfter = function(ref, newNode) {
   ref.parentNode.insertBefore(newNode, ref.nextSibling);
   return newNode;
}

var removeNodes = function(nodes) {
     for(var j=0;j<nodes.length;j++) {
        var n=nodes[j];
        n.parentNode.removeChild(n);
    }
}
var getElementPosition = function (e){
    var offsetY = e.offsetTop, offsetX = e.offsetLeft;
    while( e = e.offsetParent ) {
    	offsetY += e.offsetTop;
    	offsetX += e.offsetLeft;
  	}
    return {'x':offsetX, 'y':offsetY};
}


var createStringMatchHighlighter = function(entries,search,matchHtml,noMatchHtml,caseInsensitive,options) {
  if(caseInsensitive)
     search = search.toLowerCase();
  var keyLength =  search.length;

  return function(node) {
      var text = node.nodeValue;
      var valueLC = caseInsensitive ? text.toLowerCase() : text;
      
      var posn = valueLC.indexOf( search );
      if(posn == -1) return;
      
      var entry= entries.createEntry(node,text,[])
      node.nodeValue='';

      var cursor = node;
      var lastPosn = 0;
      /* All odd entries are noMatched text. All even entries are the matching. */
      for(;;) {
         var noMatchTag=htmlToElement(noMatchHtml);
         var noMatchedText = text.slice(lastPosn, posn == -1? text.length: posn);
         var noMatchedTN = document.createTextNode( noMatchedText );
         noMatchTag.appendChild(noMatchedTN);
         
         entry.siblings.push(noMatchTag);
         cursor = insertAfter( cursor, noMatchTag );
         
         if(posn==-1) return;
         
         var highlightTag = htmlToElement(matchHtml);
         var matchedTN = document.createTextNode( text.slice(posn, posn + keyLength) );
         highlightTag.appendChild( matchedTN );
         
         entry.siblings.push(highlightTag);
         cursor = insertAfter( cursor, highlightTag );                 
         
         lastPosn = posn + keyLength;
         posn = valueLC.indexOf(search, lastPosn);
      }
  } 
}
var createRegexHighlighter = function(entries,regex,matchHtml,noMatchHtml,caseInsensitive,options) {
      /*Drop global flag because we process matches one at a time*/
      if(regex.global)
         regex = new RegExp(regex.source, (regex.ignoreCase  ? "i" : "") + (regex.multiline?"m":""));
   
  return function(node) {
    var text = node.nodeValue;
    if( ! regex.test(text) ) return;
    
    var entry= entries.createEntry(node,text,[])
    node.nodeValue='';
    
    var cursor = node;
    /* All odd entries are noMatched text nodes. All even entries are the matching style tag (the text node is the first child). */
    for(;;) {
       var posn=text.search(regex);
       
       var noMatchTag=htmlToElement(noMatchHtml);
       var noMatchedText = text.slice(0, posn == -1? text.length: posn);
       
       noMatchTag.appendChild(document.createTextNode( noMatchedText ));
       
       entry.siblings.push(noMatchTag);
       cursor = insertAfter( cursor, noMatchTag );

       if(posn==-1 || ! text.length) return;
       
       var highlightTag = htmlToElement(matchHtml);
       
       var replaceFirst = text.replace(regex,"");
       var matchedLen = text.length - replaceFirst.length;
       if(matchedLen==0) {
         /* Weird special case that will never expect to happen. But if it does -
         Consume one character into the prior noMatched node, and create a zero-length matched node.*/
          noMatchedTN.nodeValue += text.slice(0,1);
          text=text.substring(1);
          if(!text.length) return;
        }
       
       var matchText = text.slice(posn, posn+matchedLen);
       highlightTag.appendChild( document.createTextNode( matchText ) );
       
       text=text.substring(posn+matchedLen);       
       entry.siblings.push(highlightTag);
       cursor = insertAfter( cursor, highlightTag );                 
    }  
  }
}
   
return api;   
} )();