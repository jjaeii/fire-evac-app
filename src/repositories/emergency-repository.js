// L2 자료층 - EmergencyRepository
window.App = window.App || {};
window.App.Repositories = window.App.Repositories || {};

window.App.Repositories.EmergencyRepository = (function () {
  var Storage = window.App.Adapters.LocalStorageAdapter;
  var KEY = 'emergency';

  function defaultEmergency() {
    var EMERGENCY_STATUS = window.App.Constants.EMERGENCY_STATUS;
    var FIRE_STAGES = window.App.Constants.FIRE_STAGES;
    return {
      id: 'emergency_current',
      status: EMERGENCY_STATUS.NORMAL,
      fireStage: FIRE_STAGES.NONE,
      affectedWorkZoneId: null,
      message: '',
      isActive: false,
      createdByAdminId: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      updatedAt: new Date().toISOString()
    };
  }

  function get() {
    return Storage.read(KEY, defaultEmergency());
  }

  function save(emergency) {
    return Storage.write(KEY, emergency);
  }

  return { get: get, save: save, defaultEmergency: defaultEmergency };
})();
