'use strict';


const utils = require('../../lib/utils');

/**
 * For 'index'
 * @param event
 * @param context
 * @returns {Promise<*>}
 */
exports.handler = async (event, context)=> {
  try {
    // info: health-check
    if (event.hasOwnProperty('healthCheck') && event.healthCheck === true) {
      return true;
    }

    // info: 동일 path에 모듈이 없으면 에러가 난다.
    let module = require('./' + event.httpMethod.toLowerCase());
    await module(event);
  } catch (e) {
    console.error(`Final Catch in ${__filename}:`, e);
    await utils.errorMessageSender(event, context, e);
  }
  return {
    statusCode: 200
  };
};
