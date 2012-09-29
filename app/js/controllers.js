'use strict';

function RootCtrl($scope, logFactory, modelSrvc, $http) {
  var log = logFactory('RootCtrl'),
      model = $scope.model = modelSrvc.model,
      connected = $scope.connected = modelSrvc.connected;
  $scope.modelSrvc = modelSrvc;

  $scope.notifyLanternDevs = true;
  $scope.maybeNotify = function() {
    if ($scope.notifyLanternDevs) {
      log.warn('Notify Lantern developers not yet implemented');
    }
  };

  // sub-controllers can override this
  $scope.errorHandler = function() {
    //log.debug('Got error:', arguments);
    $scope.error = true;
  }

  $scope.refresh = function() {
    location.reload(true);
  };

  $scope.reset = function() {
    $scope.error = false;
    $http.post('/api/resetSettings')
      .success(function(data, status, headers, config) {
        log.debug('Reset settings');
      })
      .error($scope.errorHandler);
  };

  $scope.quit = function() {
    $scope.error = false;
    $http.post('/api/quit')
      .success(function(data, status, headers, config) {
        log.debug('Quit');
      })
      .error($scope.errorHandler);
  };
}

function SanityCtrl($scope, modelSrvc) {
  $scope.show = false;
  $scope.modelSane = modelSrvc.sane;
  $scope.$watch('modelSane()', function(sane) {
    $scope.show = !sane;
  });
}

function CorruptSettingsCtrl($scope, modelSrvc, SETTINGS_STATE) {
  $scope.show = false;
  $scope.$watch('model.settings.state', function(val) {
    $scope.show = val == SETTINGS_STATE.corrupt;
  });
}

function UnlockSettingsCtrl($scope, $http, logFactory, SETTINGS_STATE) {
  var log = logFactory('UnlockSettingsCtrl');
  $scope.show = false;
  $scope.$watch('model.settings.state', function(val) {
    $scope.show = val == SETTINGS_STATE.locked;
  });

  $scope.submit = function(password) {
    $http.post('/api/unlockSettings?password='+encodeURIComponent(password))
      .success(function(data, status, headers, config) {
        log.debug('password valid');
        // XXX need to reset any form state?
      })
      .error(function(data, status, headers, config) {
        $scope.unlockForm.password.$error = {invalid: true};
        $scope.unlockForm.password.$pristine = true;
      });
  };
}

function DevCtrl($scope, debug, logFactory, cometdSrvc, modelSrvc) {
  var log = logFactory('DevCtrl'),
      model = $scope.model = modelSrvc.model,
      lastModel = $scope.lastModel = angular.copy(model);
  $scope.show = debug;

  $scope.$watch('model', function() {
    syncObject('', model, lastModel);
  }, true);

  function syncObject(parent, src, dst) {
    for (var name in src) {
      var path = (parent ? parent + '.' : '') + name;
      if (src[name] === dst[name]) {
        // do nothing we are in sync
      } else if (typeof src[name] == 'object') {
        // we are an object, so we need to recurse
        syncObject(path, src[name], dst[name] || {});
      } else {
        dst[name] = angular.copy(src[name]);
        cometdSrvc.publish('/sync', {path:path, value:src[name]});
      }
    }
  }
}
