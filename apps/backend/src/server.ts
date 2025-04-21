import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.text('OK')
})

const port = Number(process.env.PORT) || 8080
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})