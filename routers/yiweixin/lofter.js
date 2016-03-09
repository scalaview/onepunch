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
        ['updatedAt', 'DESC']
      ]
    }).then(function(movies) {
      next(null, movies)
    }).catch(function(err){
      next(err)
    })
  }, function(movies, pass){
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
  }, function(movies, pass) {
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
  }], function(err, movies){
    if(err){
      console.log(err)
      res.redicrect('/500')
    }else{
      res.render('yiweixin/lofter/index', { movies: movies, layout: 'lofter' })
    }
  })

})

module.exports = app;