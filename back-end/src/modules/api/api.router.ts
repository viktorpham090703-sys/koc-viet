import { Router } from 'express'
import type { ApplicationEnvironment } from '../../types/environment.js'
import { toWebRequest } from '../../http/web-adapter.js'
import { route } from '../core/routes.js'

export function createApiRouter(environment: ApplicationEnvironment) {
  const router = Router()
  router.all('/*path', async (request, response, next) => {
    try {
      const webRequest = toWebRequest(request)
      const webResponse = await route(webRequest, environment, new URL(webRequest.url))
      response.status(webResponse.status)
      webResponse.headers.forEach((value: string, name: string) => response.setHeader(name, value))
      response.send(Buffer.from(await webResponse.arrayBuffer()))
    } catch (error) { next(error) }
  })
  return router
}
