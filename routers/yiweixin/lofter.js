var express = require('express');
var app = express.Router();
var models  = require('../../models')
var helpers = require("../../helpers")
var async = require("async")
var requireLogin = helpers.requireLogin
var config = require("../../config")


app.get('/lofter', function(req, res) {

  async.waterfall([function(next) {
    var params = {
    }
    models.Movie.findAndCountAll({
      where: params,
      limit: req.query.perPage || 15,
      offset: helpers.offset(req.query.page || 1, req.query.perPage || 15),
      order: [
        ['createdAt', 'DESC']
      ]
    }).then(function(movies) {
      next(null, movies)
    }).catch(function(err){
      next(err)
    })
  }, movieWithGenres
  , movieWithImages], function(err, movies){
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('yiweixin/lofter/index', { movies: movies, layout: 'lofter' })
    }
  })

})


app.get('/lofter/:id', function(req, res) {
  async.waterfall([function(next){
    models.BilibiliMovie.findById(req.params.id).then(function(bilibiliMovie) {
      next(null, bilibiliMovie)
    }).catch(function(err){
      next(err)
    })
  }, function(bilibiliMovie, next){
    models.BilibiliMedia.findAll({
      where: {
        avid: bilibiliMovie.avid,
        display: true
      }
    }).then(function(medias){
      bilibiliMovie.medias = medias || []
      if(medias.length > 0){
        medias[0].getDownloadUrl().then(function(download_url){
          bilibiliMovie.download_url = download_url
          next(null, bilibiliMovie)
        }).catch(function(err){
          next(null, bilibiliMovie)
        })
      }
    }).catch(function(err){
      next(err)
    })
  } ,function(bilibiliMovie, next){
    bilibiliMovie.getMovie({
      where: {
        display: true
      }
    }).then(function(movie) {
      next(null, bilibiliMovie, movie)
    }).catch(function(err){
      next(err)
    })
  }, function(bilibiliMovie, movie, pass){
    async.each(["countries", "genres", "directors", "casts", "images"], function(func, next) {
      movie["get" + func.capitalize()]().then(function(result){
        movie[func] = result || []
        next(null, movie)
      })
    }, function(err){
      if(err){
        pass(err)
      }else{
        pass(null, bilibiliMovie, movie)
      }
    })
  }, function(bilibiliMovie, movie, next){
    celebrityWithImages(movie.casts, next, bilibiliMovie, movie)
  }, function(casts, bilibiliMovie, movie, next){
    celebrityWithImages(movie.directors, next, bilibiliMovie, movie)
  }], function(err, directors, bilibiliMovie, movie){
    if(err){
      console.log(err)
      res.redirect('/500')
    }else{
      res.render('yiweixin/lofter/show', { movie: movie, bilibiliMovie: bilibiliMovie, medias: bilibiliMovie.medias })
    }
  })
})


function celebrityWithImages(celebrities, pass){
  var bilibiliMovie = arguments[2],
      movie = arguments[3]
  async.each(celebrities, function(celebrity, next) {
    celebrity.getImages().then(function(images){
      celebrity.images = images || []
      celebrity.image = celebrity.images[0]
      if(images.length > 0){
        celebrity.image = celebrity.images[0]
      }
      next(null, celebrity)
    })
  }, function(err){
    if(err){
      pass(err)
    }else{
      pass(null, celebrities, bilibiliMovie, movie)
    }
  })
}

function movieWithGenres(movies, pass){
  async.each(movies.rows, function(movie, next){
    movie.getGenres().then(function(genres){
      movie.genres = genres || []
      next(null, movie)
    }).catch(function(err){
      next(err)
    })
  }, function(err){
    if(err){
      pass(err)
    }else{
      pass(null, movies)
    }
  })
}

function movieWithImages(movies, pass){
  async.each(movies.rows, function(movie, next){
    movie.getImages().then(function(images) {
      movie.images = images || []
      if(images.length > 0){
        movie.cover = images[0]
      }
      next(null, movie)
    })
  }, function(err){
    if(err){
      pass(err)
    }else{
      pass(null, movies)
    }
  })
}


module.exports = app;