'use strict';

angular.module('leseulsteve.angular-mongoose').factory('Schema',
  function ($q, $http, Hooks, RemoteStore) {

    var Schema = function (apiUrl) {

      var hooks = new Hooks(),
        remoteStore = new RemoteStore(apiUrl);

      function Ressource(ressourceDef) {
        this.getApiUrl = function () {
          return apiUrl;
        };
        _.assign(this, ressourceDef);
      }

      Ressource.create = function (ressourceDef) {
        var ressource = new Ressource(ressourceDef);
        return hooks.process('pre', 'create', ressource).then(function (ressource) {
          return remoteStore.create(ressource).then(function (response) {
            return hooks.process('post', 'find', new Ressource(response)).then(function (ressource) {
              return hooks.process('post', 'create', ressource);
            });
          });
        });
      };

      Ressource.find = function (query) {
        return remoteStore.find(query).then(function (rawRessources) {
          return $q.all(_.map(rawRessources, function (rawRessource) {
            return hooks.process('post', 'find', new Ressource(rawRessource));
          }));
        });
      };

      Ressource.findOne = function (query) {
        return Ressource.find(query).then(function (results) {
          if (results.length >  0) {
            return results[0];
          } else {
            return null;
          }
        });
      };

      Ressource.findById = function (id) {
        return remoteStore.findById(id).then(function (ressource) {
          return hooks.process('post', 'find', new Ressource(ressource));
        });
      };

      Ressource.count = function (query) {
        return remoteStore.count(query);
      };

      Ressource.pre = function (action, fn) {
        hooks.register('pre', action, fn);
      };

      Ressource.post = function (action, fn) {
        hooks.register('post', action, fn);
      };

      Ressource.prototype.save = function () {
        if (_.isUndefined(this._id)) {
          return hooks.process('pre', 'create', this).then(function (ressource) {
            return remoteStore.create(ressource).then(function (response) {
              return hooks.process('post', 'find', new Ressource(response)).then(function (ressource) {
                return hooks.process('post', 'create', ressource);
              });
            });
          });
        } else {
          return hooks.process('pre', 'save', this).then(function (ressource) {
            return remoteStore.update(ressource).then(function (ressource) {
              return hooks.process('post', 'save', new Ressource(ressource)).then(function (ressource) {
                return hooks.process('post', 'find', ressource);
              });
            });
          });
        }
      };

      Ressource.prototype.remove = function () {
        return hooks.process('pre', 'remove', this).then(function (ressource) {
          return remoteStore.remove(ressource).then(function () {
            return hooks.process('post', 'remove', ressource);
          });
        });
      };

      return Ressource;
    };

    return Schema;
  });
