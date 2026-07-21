// One-off dev seed script for the Template list — not run automatically,
// not part of any migration. Run with: npx tsx api/lib/seed-templates.ts
import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '.prisma/client'
import config from '../keystone'

const templates = [
  { name: 'Classic Gold', type: 'wedding', motif: 'wax-seal', accentHex: '#C9A24B' },
  { name: 'Powder Blue', type: 'baptism', motif: 'candle', accentHex: '#7FA0B0' },
  { name: 'Coral Pop', type: 'birthday', motif: 'balloons', accentHex: '#F2996F' },
] as const

async function main() {
  const context = getContext(config, PrismaModule).sudo()

  for (const template of templates) {
    const existing = await context.query.Template.findMany({
      where: { name: { equals: template.name } },
    })
    if (existing.length > 0) {
      console.log(`skip (already exists): ${template.name}`)
      continue
    }
    const created = await context.query.Template.createOne({
      data: template,
      query: 'id name type motif accentHex',
    })
    console.log('created:', created)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
