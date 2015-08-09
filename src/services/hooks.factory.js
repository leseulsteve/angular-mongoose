'use strict';

angular.module('angular-mongoose').factory('Hooks',
  function ($q) {

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
  });
