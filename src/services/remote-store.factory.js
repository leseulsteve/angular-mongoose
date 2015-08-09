'use strict';

angular.module('angular-mongoose').factory('RemoteStore',
  function ($http) {

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
  });
