'use strict';

angular.module('angular-mongoose', []);
;
'use strict';

angular.module('angular-mongoose').factory('Hooks',
  ['$q', function ($q) {

    function Hooks() {

      this.hooks = {
        pre: {},
        post: {}
      };

      this.allowedOperations = {
        pre: ['caching', 'create', 'save', 'remove'],
        post: ['find', 'create', 'save', 'remove']
      };

      var that = this;

      _.forEach(this.allowedOperations.pre, function (operationName) {
        that.hooks.pre[operationName] = [];
      });

      _.forEach(this.allowedOperations.post, function (operationName) {
        that.hooks.post[operationName] = [];
      });
    }

    Hooks.prototype.register = function (moment, operationName, callback) {
      if (_.isUndefined(this.hooks[moment][operationName])) {
        throw new Error('Operation "' + operationName + '" n\'est pas prise en charge par la fonction "' + moment + '"');
      }
      this.hooks[moment][operationName].push(callback);
    };

    Hooks.prototype.process = function (moment, operationName, object) {
      var promises = [];

      _.forEach(this.hooks[moment][operationName], function (operation) {

        var deffered = $q.defer();

        promises.push(deffered.promise);

        var resolve = function () {
          deffered.resolve(object);
        };

        operation.apply(object, [resolve]);
      });

      return $q.all(promises).then(function () {
        return object;
      });
    };

    return Hooks;
  }]);
;
'use strict';

angular.module('angular-mongoose').factory('RemoteStore',
  ['$http', function ($http) {

    function RemoteStore(apiUrl) {
      this.apiUrl = apiUrl;
    }

    RemoteStore.prototype.find = function (query) {
      var headers = {
        params: query ? query : undefined
      };
      return $http.get(this.apiUrl, headers).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.findById = function (id) {
      return $http.get(this.apiUrl + '/' + id).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.create = function (ressourceDef) {
      return $http.post(this.apiUrl, ressourceDef).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.update = function (ressource) {
      return $http.put(this.apiUrl + '/' + ressource._id, ressource).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.remove = function (ressource) {
      return $http.delete(this.apiUrl + '/' + ressource._id);
    };

    return RemoteStore;
  }]);
;
'use strict';

angular.module('angular-mongoose').factory('Schema',
  ['$q', '$http', 'Hooks', 'RemoteStore', function ($q, $http, Hooks, RemoteStore) {

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
          var ressources = [],
            promises = [];
          _.forEach(rawRessources, function (rawRessource) {
            promises.push(hooks.process('post', 'find', new Ressource(rawRessource)).then(function (ressource) {
              ressources.push(ressource);
            }));

          });
          return $q.all(promises).then(function () {
            return ressources;
          });
        });
      };

      Ressource.findById = function (id) {
        return remoteStore.findOne(id).then(function (ressource) {
          return hooks.process('post', 'find', new Ressource(ressource));
        });
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
          return remoteStore.destroy(ressource).then(function () {
            return hooks.process('post', 'remove', ressource);
          });
        });
      };

      return Ressource;
    };

    return Schema;
  }]);
