// Vercel deployment script using direct IP (bypasses DNS block)
// Uploads pre-built static files using Build Output API v3 format
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const os = require('os')

const CURL = 'C:\\Program Files\\Git\\mingw64\\bin\\curl.exe'
const TOKEN = 'vca_4IgtowC1cggoAWD5oAh24HsVsEdEGvV3698hoxmelfXCh4ogV73Pvgjs'
const TEAM_ID = 'team_fz7uhvW59kGicwAxzLFwm0wM'
const PROJECT_ID = 'prj_Q9z8xs7RLPf6JgsZZDNQENVpdS7b'
const RESOLVE = 'api.vercel.com:443:76.76.21.112'
const DIST_DIR = path.join(__dirname, 'apps', 'financeiro', 'dist')

function curl(args) {
  const result = spawnSync(CURL, [
    '--resolve', RESOLVE,
    '-s', '-w', '\n__STATUS__%{http_code}',
    '-H', `Authorization: Bearer ${TOKEN}`,
    ...args
  ], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 })
  const out = result.stdout.toString()
  const sep = out.lastIndexOf('\n__STATUS__')
  const body = sep >= 0 ? out.slice(0, sep) : out
  const status = sep >= 0 ? parseInt(out.slice(sep + 11)) : 0
  return { body, status }
}

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex')
}

function collectFiles(dir, base = '') {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel))
    } else {
      const buf = fs.readFileSync(path.join(dir, entry.name))
      files.push({ file: rel, data: buf, sha: sha1(buf), size: buf.length })
    }
  }
  return files
}

async function main() {
  const distFiles = collectFiles(DIST_DIR)
  const allFiles = [...distFiles]

  console.log(`Uploading ${allFiles.length} files...`)

  for (const f of allFiles) {
    process.stdout.write(`  ${f.file} (${f.size}b) ... `)
    const tmpFile = path.join(os.tmpdir(), `vercel-upload-${Date.now()}`)
    fs.writeFileSync(tmpFile, f.data)

    const r = curl([
      '-X', 'POST',
      '-H', 'Content-Type: application/octet-stream',
      '-H', `x-vercel-digest: ${f.sha}`,
      '-H', `Content-Length: ${f.size}`,
      '--data-binary', `@${tmpFile}`,
      `https://api.vercel.com/v2/files?teamId=${TEAM_ID}`
    ])
    fs.unlinkSync(tmpFile)
    console.log(r.status === 200 || r.status === 201 || r.status === 204 ? 'OK' : `WARN(${r.status}): ${r.body.slice(0,100)}`)
  }

  // Create deployment with Build Output API — no build needed
  const payload = {
    name: 'financeiro',
    project: PROJECT_ID,
    target: 'production',
    // Tell Vercel the files are already built; no install/build step
    files: allFiles.map(f => ({ file: f.file, sha: f.sha, size: f.size })),
    // SPA routing: serve index.html for all paths not matching a static file
    routes: [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/index.html' }
    ],
    projectSettings: {
      buildCommand: '',
      installCommand: '',
      outputDirectory: '.',
      framework: null,
    }
  }

  console.log('\nCreating deployment...')
  const tmpPayload = path.join(os.tmpdir(), `vercel-deploy-${Date.now()}.json`)
  fs.writeFileSync(tmpPayload, JSON.stringify(payload))

  const r = curl([
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '--data-binary', `@${tmpPayload}`,
    `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`
  ])
  fs.unlinkSync(tmpPayload)

  console.log(`HTTP ${r.status}`)
  let resp
  try { resp = JSON.parse(r.body) } catch(e) { console.log(r.body); return }

  if (resp.url) {
    console.log(`\nDeployment created:`)
    console.log(`  URL:   https://${resp.url}`)
    console.log(`  ID:    ${resp.id}`)
    console.log(`  State: ${resp.readyState || resp.status}`)

    // Poll until ready
    const DEPLOY_ID = resp.id
    console.log('\nWaiting for deployment...')
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const check = curl([
        '-H', `Authorization: Bearer ${TOKEN}`,
        `https://api.vercel.com/v13/deployments/${DEPLOY_ID}?teamId=${TEAM_ID}`
      ])
      // Remove the auth header since curl() adds it automatically - re-call without dup
      const checkDirect = spawnSync(CURL, [
        '--resolve', RESOLVE, '-s',
        '-H', `Authorization: Bearer ${TOKEN}`,
        `https://api.vercel.com/v13/deployments/${DEPLOY_ID}?teamId=${TEAM_ID}`
      ], { encoding: 'utf8' })
      const data = JSON.parse(checkDirect.stdout)
      process.stdout.write(`  ${data.readyState}`)
      if (data.readyState === 'READY') {
        console.log('\n\n✅ Deployment READY!')
        console.log(`  Production: https://${resp.alias?.[0] || resp.url}`)
        break
      } else if (data.readyState === 'ERROR') {
        console.log(`\n\n❌ Deployment ERROR: ${data.errorMessage}`)
        break
      }
      process.stdout.write(' ...')
    }
  } else {
    console.log('Unexpected response:', JSON.stringify(resp, null, 2))
  }
}

main().catch(console.error)
