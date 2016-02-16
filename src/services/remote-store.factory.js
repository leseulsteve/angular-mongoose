'use strict';

angular.module('leseulsteve.angular-mongoose').factory('RemoteStore',
  function ($http) {
function RemoteStore(apiUrl) {
      this.apiUrl = apiUrl;
    }

    function getCacheId(apiUrl, ressource) {
      var splittedApiUrl = _.map(apiUrl.split('/'), function(urlPart) {
        return _.startsWith(urlPart, ':') ? ressource[urlPart.substring(1)] : urlPart;
      });
      return splittedApiUrl.join('/') + '/' + ressource._id;
    }

    RemoteStore.prototype.find = function(query) {
      var splittedApiUrl = _.map(this.apiUrl.split('/'), function(urlPart) {
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
      return $http.get(splittedApiUrl.join('/'), headers).then(function(response) {
        return response.data;
      });
    };

    RemoteStore.prototype.findById = function(id) {
      return $http.get(this.apiUrl + '/' + id).then(function(response) {
        return response.data;
      });
    };

    RemoteStore.prototype.create = function(ressourceDef) {
      var splittedApiUrl = _.map(this.apiUrl.split('/'), function(urlPart) {
        return _.startsWith(urlPart, ':') ? ressourceDef[urlPart.substring(1)] : urlPart;
      });
      return $http.post(splittedApiUrl.join('/'), ressourceDef).then(function(response) {
        return response.data;
      });
    };

    RemoteStore.prototype.update = function(ressource) {
      var identifiant = getCacheId(this.apiUrl, ressource);
      return $http.put(identifiant, ressource).then(function(response) {
        return response.data;
      });
    };

    RemoteStore.prototype.remove = function(ressource) {
      var identifiant = getCacheId(this.apiUrl, ressource);
      return $http.delete(identifiant);
    };

    return RemoteStore;

  });
