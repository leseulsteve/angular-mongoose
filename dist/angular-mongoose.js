'use strict';

angular.module('angular-mongoose', []);
;
'use strict';

angular.module('angular-mongoose').factory('Hooks',
  ['$q', function ($q) {

    function Hooks() {
      this.hooks = [];
    }

    Hooks.prototype.register = function (action, fn) {
      if (typeof fn === 'function') {
        this.hooks[action] = fn;
      } else {
        throw new Error('No a function');
      }
    };

    Hooks.prototype.process = function (action, object) {
      var deffered = $q.defer(),
        fn = this.hooks[action];

      var resolve = function () {
        deffered.resolve(object);
      };

      if (fn) {
        fn.apply(object, [resolve]);
      } else {
        resolve();
      }
      return deffered.promise;

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

    RemoteStore.prototype.find = function () {
      return $http.get(this.apiUrl).then(function (response) {
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
        return hooks.process('pre-create', ressource).then(function (ressource) {
          return remoteStore.create(ressource).then(function (response) {
            return hooks.process('post-create', new Ressource(response.data));
          });
        });
      };

      Ressource.find = function () {
        return remoteStore.find().then(function (rawRessources) {
          var ressources = [];
          _.forEach(rawRessources, function (rawRessource) {
            ressources.push(new Ressource(rawRessource));
          });
          return ressources;
        });
      };

      Ressource.findById = function (id) {
        return remoteStore.findById(id).then(function (ressource) {
          return new Ressource(ressource);
        });
      };

      Ressource.pre = function (action, fn) {
        hooks.register('pre-' + action, fn);
      };

      Ressource.post = function (action, fn) {
        hooks.register('post-' + action, fn);
      };

      Ressource.prototype.save = function () {
        return hooks.process('pre-update', this).then(function (ressource) {
          return remoteStore.update(ressource).then(function (ressource) {
            new Ressource(ressource);
          }).catch(function (reason) {
            if (reason.code === 401) {
              return hooks.process('pre-create', ressource).then(function (ressource) {
                return remoteStore.create(ressource).then(function (response) {
                  return hooks.process('post-create', new Ressource(response.data));
                });
              });
            }
          });
        });
      };

      Ressource.prototype.remove = function () {
        return hooks.process('pre-delete', this).then(function (ressource) {
          return remoteStore.remove(ressource).then(function (ressource) {
            return hooks.process('post-delete', ressource);
          });
        });
      };

      return Ressource;
    };

    return Schema;
  }]);
