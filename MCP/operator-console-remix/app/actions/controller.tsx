import { createController } from 'remix/router'

import { assetServer } from '../assets.ts'
import {
  buildPayload,
  catalogPayload,
  generatedWorldResponse,
  minePayload,
  planPayload,
  proofPayload,
  statusPayload,
  targetsPayload,
  worldsPayload,
} from '../operator.server.ts'
import { routes } from '../routes.ts'
import { HomePage } from '../ui/scaffold-home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (
        (await assetServer.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
      )
    },
    async status() {
      return Response.json(await statusPayload())
    },
    async catalog() {
      return Response.json(await catalogPayload())
    },
    targets() {
      return Response.json(targetsPayload())
    },
    worlds() {
      return Response.json(worldsPayload())
    },
    async plan(context) {
      return Response.json(await planPayload(context.request))
    },
    async build(context) {
      return Response.json(await buildPayload(context.request))
    },
    async mine(context) {
      return Response.json(await minePayload(context.request))
    },
    async proof() {
      return Response.json(await proofPayload())
    },
    async generatedWorld(context) {
      return generatedWorldResponse(context.params.world)
    },
    home(context) {
      return context.render(<HomePage />)
    },
  },
})
