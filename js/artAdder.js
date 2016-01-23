(function() {

  'use strict';

  /******************************************************************************/

  function getExt (filename) {
    return filename.match(/\.(.+)$/)[1].toLowerCase()
  }

  // returns a random image of said dimensions
  function getImgSrc(imgList, width, height) {
    var howMany = imgList.map(function (e) { return e.i }).filter(onlyUnique)
    var rand = ( Math.floor(howMany.length * Math.random()) + 1 ) + ''
    return imgList.reduce(function (acc, curr, i) {
      return curr.size === width + 'x' + height && curr.i === rand  ? curr.image : acc
    }, {})
  }

  function onlyUnique(value, index, self) { 
      return self.indexOf(value) === index;
  }

  var currentExhibition;


  function getParentUrl() {
    var isInIframe = (parent !== window),
        parentUrl = window.location.href;

    if (isInIframe) {
        parentUrl = document.referrer;
    }
    return parentUrl;
  }

  var artAdder = {
    replacedCount : '',
    processAdNode : function (elem) {

       var goodBye = false
      if (elem.offsetWidth < 2) goodBye = true 
      if (elem.offsetHeight < 2) goodBye = true 
      if (elem.tagName !== 'IFRAME' 
          && elem.tagName !== 'IMG'
          && elem.tagName !== 'OBJECT'
          && elem.tagName !== 'A'
          && elem.tagName !== 'INS'
          ) goodBye = true 

      if ($(elem).data('replaced')) goodBye = true 
      $(elem).data('replaced', true)
      if (goodBye) return


      var that = this,exhibition

      artAdder.getExhibitionObj()
      .then(function (ex) {
        exhibition = ex
        return artAdder.getPieceI()
      })
      .then(function (pieceI) {
        var origW = elem.offsetWidth
        var origH = elem.offsetHeight
        var piece = exhibition.works[pieceI]

        var $wrap = $('<div>').css({
          width: origW,
          height: origH,
          position : 'relative'
        })
        var art  = document.createElement('a')
        art.href = piece.link || exhibition.link || 'http://add-art.org' 
        art.title = piece.title || exhibition.title + ' | replaced by Add-Art'
        art.style.width = origW + 'px'
        art.style.height = origH + 'px'
        art.style.display = 'block'
        art.style.position = 'absolute'
        art.style.background = "url(" + piece.image + ")"
        art.style.backgroundSize = "cover"
        art.style.backgroundPosition = "left " + ['top', 'bottom', 'center'][( Math.floor(Math.random() * 3) )]
        art.style.backgroundRepeat = "no-repeat"

        $wrap.append(art)
        $(elem.parentElement).append($wrap)
        $(elem).remove()
      })



    /*

        var $wrap = $('<div>').css({
          width: origW,
          height: origH,
          position : 'relative',
          perspective : '1000px'
        })
        var $inner = $('<div>').css({
          width: '100%',
          height : '100%',
          position : 'absolute',
          transformStyle : 'preserve-3d',
          transform : 'translateZ(-'+(Math.ceil(origH/2))+'px)',
          transition : 'transform 0.5s'
        })

        var art  = document.createElement('a')
        art.href = exhibition.info.link 
        art.title = 'Replaced by Add-Art'
        art.style.width = ( origW - 4 ) + 'px'
        art.style.height = ( origH - 4 ) + 'px'
        art.style.display = 'block'
        art.style.position = 'absolute'
        art.style.background = "url(" + getImgSrc(exhibition.entries, bestSize[0], bestSize[1])  + ")"
        art.style.backgroundSize = "cover"
        art.style.backgroundRepeat = "no-repeat"
        art.style.webkitTransform = "rotateX(-90deg) translateZ("+Math.ceil(origH/2)+"px)"

        elem.style.webkitTransform = 'rotateY(0deg) translateZ('+(Math.ceil(origH/2))+'px)'
        elem.style.width = origW + 'px'
        elem.style.height = origH + 'px'
        elem.style.display = 'block'
        elem.style.position = 'absolute'

        var clone = $(elem).clone()
        $inner.append(art).append(clone)
        $wrap.append($inner)
        $(elem.parentElement).append($wrap)

        // rotate it
        setTimeout(function () {
          $inner.css('transform', "translateZ(-"+(Math.ceil(origH/2))+"px) rotateX(90deg)")
            setTimeout(function () {
              $(elem).remove()
              clone.remove()
            }, 500)
        }, 50)

      })
      */
      return true
    },
    getPieceI : function (){
      var topUrl = getParentUrl(),savedUrl,savedPieceI
      var d = Q.defer()
      artAdder.localGet('url')
      .then(function (url){
        savedUrl = url && url.url
        return artAdder.localGet('pieceI')
      })
      .then(function (pieceI) {
        savedPieceI = pieceI && pieceI.pieceI
        return artAdder.getExhibitionObj()
      })
      .then(function (ex){
        var pieceI = savedPieceI || 0
        if (!savedUrl) artAdder.localSet('url', topUrl)
        if (savedUrl === topUrl) return d.resolve(pieceI)

        // there's no pieceI - choose 0 
        if (!savedPieceI && savedPieceI !== 0) {
          artAdder.localSet('pieceI', pieceI)
          return d.resolve(pieceI)
        }

       // a new url
       pieceI++
       if (pieceI > ex.works.length - 1) {
         pieceI = 0
       }
       artAdder.localSet('url', topUrl)
       artAdder.localSet('pieceI', pieceI)
       return d.resolve(pieceI)
      }).done()
      return d.promise
    },
    // download exhibition and store it
    exhibition : function (name) {
      return artAdder.setExhibition(name)
    },
    setExhibition : function (exhibition) {
      currentExhibition = Q(exhibition)
      artAdder.localSet('exhibitionUpdated', Date.now())
      return artAdder.localSet('exhibition', exhibition)
    },
    getExhibition : function () {
      if (currentExhibition) return currentExhibition
      var d = Q.defer()
      artAdder.localGet('exhibition')
      .then(function (exhibition) {
        currentExhibition = Q(exhibition.exhibition)
        d.resolve(exhibition.exhibition)
      })
      return d.promise
    },
    getExhibitionObj : function (){
      var exhibitions
      return artAdder.localGet('defaultShowData')
      .then(function (data){
        exhibitions = data.defaultShowData
        return artAdder.getExhibition()
      })
      .then(function (title){
        return R.find(R.propEq('title', title), exhibitions)
      })
    },
    chooseMostRecentExhibition : function () {
      artAdder.localGet('defaultShowData')
      .then(function (feeds) {
        var latest = feeds.defaultShowData[0].title
        artAdder.exhibition(latest)
      })
    },
    // abstract storage for different browsers
    localSet : function (key, thing) {
      var d = Q.defer()
      if (typeof chrome !== 'undefined') {
        var save = {}
        save[key] = thing
        chrome.storage.local.set(save, d.resolve)
      }
      return d.promise
    },
    localGet : function (key) {
      var d = Q.defer()
      if (typeof chrome !== 'undefined') {
        chrome.storage.local.get(key, d.resolve)
      }
      return d.promise
    },

    /*  from original add-art */
    loadImgArray : function() {
      this.ImgArray = new Array();
      // taken from: https://en.wikipedia.org/wiki/Web_banner
      // 19 images sizes total

      // Rectangles
      this.ImgArray.push( [ 336, 280 ] ); // Large Rectangle
      this.ImgArray.push( [ 300, 250 ] ); // Medium Rectangle
      this.ImgArray.push( [ 180, 150 ] ); // Rectangle
      this.ImgArray.push( [ 300, 100 ] ); // 3:1 Rectangle
      this.ImgArray.push( [ 240, 400 ] ); // Vertical Rectangle

      // Squares
      this.ImgArray.push( [ 250, 250 ] ); // Square Pop-up

      // Banners
      this.ImgArray.push( [ 720, 300, ] ); // Pop-Under
      this.ImgArray.push( [ 728, 90, ] ); // Leaderboard
      this.ImgArray.push( [ 468, 60, ] ); // Full Banner
      this.ImgArray.push( [ 234, 60, ] ); // Half Banner
      this.ImgArray.push( [ 120, 240 ] ); // Vertical Banner

      //Buttons
      this.ImgArray.push( [ 120, 90 ] ); // Button 1
      this.ImgArray.push( [ 120, 60 ] ); // Button 2
      this.ImgArray.push( [ 88, 31 ] ); // Micro Bar
      this.ImgArray.push( [ 88, 15 ] ); // Micro Button
      this.ImgArray.push( [ 125, 125 ] ); // Square Button

      //Skyscrapers
      this.ImgArray.push( [ 120, 600 ] ); // Standard Skyscraper
      this.ImgArray.push( [ 160, 600 ] ); // Wide Skyscraper
      this.ImgArray.push( [ 300, 600 ] ); // Half-Page

    },
    askLink : function(width, height) {
      // Find this.ImgArray with minimal waste (or need - in this case it will be shown in full while mouse over it) of space
      var optimalbanners = null;
      var minDiff = Number.POSITIVE_INFINITY;
      for ( var i = 0; i < this.ImgArray.length; i++) {
          var diff = Math.abs(width / height - this.ImgArray[i][0] / this.ImgArray[i][1]);
          if (Math.abs(diff) < Math.abs(minDiff)) {
              minDiff = diff;
              optimalbanners = [ i ];
          } else if (diff == minDiff) {
              optimalbanners.push(i);
          }
      }

      var optimalBanner = [];
      minDiff = Number.POSITIVE_INFINITY;
      for (i = 0; i < optimalbanners.length; i++) {
          var diff = Math.abs(width * height - this.ImgArray[optimalbanners[i]][0] * this.ImgArray[optimalbanners[i]][1]);
          if (diff < minDiff) {
              minDiff = diff;
              optimalBanner = [ optimalbanners[i] ];
          } else if (diff == minDiff) {
              optimalBanner.push(optimalbanners[i]);
          }
      }
      return this.ImgArray[optimalBanner[Math.floor(Math.random() * optimalBanner.length)]];
    }

  }

  
  artAdder.loadImgArray() // loadImgArray

  if (typeof vAPI !== 'undefined') vAPI.artAdder = artAdder
  else window.artAdder = artAdder
  
})();


