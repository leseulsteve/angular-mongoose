'use strict';

angular.module('leseulsteve.angular-mongoose', []);
;
'use strict';

angular.module('leseulsteve.angular-mongoose').factory('Hooks',
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

angular.module('leseulsteve.angular-mongoose').factory('RemoteStore',
  ['$http', function ($http) {
    function RemoteStore(apiUrl) {
      this.apiUrl = apiUrl;
    }

    function getCacheId(apiUrl, ressource) {
      var splittedApiUrl = _.map(apiUrl.split('/'), function (urlPart) {
        return _.startsWith(urlPart, ':') ? ressource[urlPart.substring(1)] : urlPart;
      });
      return splittedApiUrl.join('/') + '/' + ressource._id;
    }

    RemoteStore.prototype.find = function (query) {
      var splittedApiUrl = _.map(this.apiUrl.split('/'), function (urlPart) {
        if (_.startsWith(urlPart, ':')) {
          var value = query[urlPart.substring(1)];
          query = _.omit(query, urlPart.substring(1));
          return value;
        } else {
          return urlPart;
        }
      });
      var headers = {
        params: query ? query : undefined
      };
      return $http.get(splittedApiUrl.join('/'), headers).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.findById = function (id) {
      return $http.get(this.apiUrl + '/' + id).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.count = function (query) {
      return this.find(query).then(function (data) {
        return data.length;
      });
    };

    RemoteStore.prototype.create = function (ressourceDef) {
      var splittedApiUrl = _.map(this.apiUrl.split('/'), function (urlPart) {
        return _.startsWith(urlPart, ':') ? ressourceDef[urlPart.substring(1)] : urlPart;
      });
      return $http.post(splittedApiUrl.join('/'), ressourceDef).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.update = function (ressource) {
      if (_.isUndefined(ressource._id)) {
        return this.create(ressource);
      }
      var identifiant = getCacheId(this.apiUrl, ressource);
      return $http.put(identifiant, ressource).then(function (response) {
        return response.data;
      });
    };

    RemoteStore.prototype.remove = function (ressource) {
      var identifiant = getCacheId(this.apiUrl, ressource);
      return $http.delete(identifiant);
    };

    return RemoteStore;

  }]);
;
'use strict';

angular.module('leseulsteve.angular-mongoose').factory('Schema',
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
  }]);
