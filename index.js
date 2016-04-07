var { NativeModules, NativeAppEventEmitter, DeviceEventEmitter, Platform } = require('react-native');

var rnBranch = NativeModules.RNBranch;
var _ = require('lodash');

// According to the React Native docs from 0.21, NativeAppEventEmitter is used for native iOS modules to emit events. DeviceEventEmitter is used for native Android modules.
// Both are technically supported on Android -- but I chose to follow the suggested route by the documentation to minimize the risk of this code breaking with a future release
// in case NativeAppEventEmitter ever got deprecated on Android
const nativeEventEmitter = Platform.OS === 'ios' ? NativeAppEventEmitter : DeviceEventEmitter;

class Branch {
  _lastParams = {};
  _sessionListeners = [];

  constructor() {
    //We listen to the initialization event AND retrieve the result to account for both scenarios in which the results may already be available or be posted at a later point in time
    nativeEventEmitter.addListener('RNBranch.initSessionFinished', this._onReceivedInitSessionResult);

    this._getInitSessionResult((result) => {
      if(!result) { //Not available yet => will come through with the initSessionFinished event
        return;
      }

      this._onReceivedInitSessionResult(result);
    });
    this._patientInitSessionObservers = [];
  };

  _onReceivedInitSessionResult = (result) => {
    this._initSessionResult = result;

    this._patientInitSessionObservers.forEach((cb) => {
      cb(result);
    });
    if (this.isNewResult(result)) this._sessionListeners.forEach(cb => cb(result.params))
    this._patientInitSessionObservers = [];
    this._lastParams = result.params
  };

  isNewResult = ({params}) => {
    return (this._lastParams['~id'] !== params['~id'] || this._lastParams['+click_timestamp'] !== params['+click_timestamp'])
  }

  listen = (callback) => {
    this._sessionListeners.push(callback)
  };

  _getInitSessionResult = (callback) => {
    rnBranch.getInitSessionResult(callback);
  };

  getInitSessionResultPatiently = (callback) => {
    if(this._initSessionResult) {
      return callback(this._initSessionResult);
    }

    this._patientInitSessionObservers.push(callback);
  };

  setDebug = () => {
    rnBranch.setDebug();
  };

  getLatestReferringParams = (callback) => {
    rnBranch.getLatestReferringParams(callback);
  };

  getFirstReferringParams = (callback) => {
    rnBranch.getFirstReferringParams(callback);
  };

  setIdentity = (identity) => {
    rnBranch.setIdentity(identity);
  };

  logout = () => {
    rnBranch.logout();
  };

  userCompletedAction = (event, state = {}) => {
    rnBranch.userCompletedAction(event, state);
  };

  showShareSheet = (shareOptions = {}, branchUniversalObject = {}, linkProperties = {}, callback) => {
    callback = callback || (() => {});
    _.defaults(shareOptions, {messageHeader: "Check this out!", messageBody: "Check this cool thing out: "});
    _.defaults(branchUniversalObject, {canonicalIdentifier: "RNBranchSharedObjectId", contentTitle: "Cool Content!", contentDescription: "Cool Content Description", contentImageUrl: ""});
    _.defaults(linkProperties, {feature: 'share', channel: 'RNApp'});

    rnBranch.showShareSheet(shareOptions, branchUniversalObject, linkProperties, ({channel, completed, error}) => callback({channel, completed, error}));
  };

  getShortUrl = () => {
    return rnBranch.getShortUrl();
  };
}

module.exports = new Branch();
