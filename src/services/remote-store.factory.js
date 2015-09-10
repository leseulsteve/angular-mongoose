'use strict';

angular.module('leseulsteve.angular-mongoose').factory('RemoteStore',
  function ($http) {

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
  });
