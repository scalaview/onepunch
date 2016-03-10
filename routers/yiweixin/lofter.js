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
  }, movieWithGenres(movies, pass)
  , movieWithImages(movies, pass)], function(err, movies){
    if(err){
      console.log(err)
      res.redicrect('/500')
    }else{
      res.render('yiweixin/lofter/index', { movies: movies, layout: 'lofter' })
    }
  })

})


app.get('/lofter/:id', function(req, res) {
  async.waterfall([function(next){
    models.Movie.findById(req.params.id).then(function(movie) {
      next(null, movie)
    }).catch(function(err){
      next(err)
    })
  }, function(movie, pass){
    async.each(["countries", "genres", "directors", "casts", "bilibiliMovies", "images"], function(func, next) {
      movie["get" + func.capitalize()]().then(function(result){
        movie[func] = result || []
        next(null, movie)
      })
    }, function(err){
      if(err){
        pass(err)
      }else{
        pass(null, movie)
      }
    })
  }, function(movie, next){
    celebrityWithImages(movie.casts, next)
  }, function(){

  }], function(err, movie){
    if(err){
      console.log(err)
      res.redicrect('/500')
    }else{
      res.render('yiweixin/lofter/show', { movie: movie })
    }
  })
})


function celebrityWithImages(celebrities, pass){
  async.each(celebrities, function(celebrity, next) {
    celebrity.getImages().then(function(images){
      celebrity.images = images || []
      next(null, celebrity)
    })
  }, function(err){
    if(err){
      pass(err)
    }else{
      pass(null, celebrities)
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