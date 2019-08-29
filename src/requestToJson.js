'use strict'

module.exports = function requestToJson(request) {
  const requestInformations = {
    error: null,
    method: request.method(),
    url: request.url(),
    headers: request.headers(),
    body: request.postData(),
    response: null,
  }

  const response = request.response()
  if (response) {
    requestInformations.response = {
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
    }
  }

  if (request.failure()) {
    requestInformations.error = request.failure().errorText
  }

  return requestInformations
}
