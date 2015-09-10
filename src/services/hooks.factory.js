'use strict';

angular.module('leseulsteve.angular-mongoose').factory('Hooks',
  function ($q) {

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
  });
