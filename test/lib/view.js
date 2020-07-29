const t = require('tap')
const mr = require('npm-registry-mock')
const requireInject = require('require-inject')

const REG = 'http://localhost:1331'

let logs
let server
const consoleLog = console.log
const cleanLogs = (done) => {
  logs = ''
  const fn = (...args) => {
    logs += '\n'
    args.map(el => logs += el)
  }
  console.log = fn
  console.error = fn
  done()
}

t.beforeEach(cleanLogs)
t.test('setup', (t) => {
  var mocks = {
    'get': {
      '/mypackage': [200, {
        'name' : 'mypackage',
        'dist-tags': {
          '1.0.1': {}
        },
        'time': {
          'unpublished': new Date()
        }
      }],
      '/my-other-package': [200, {
        'name': 'my-other-package',
        'versions': { '1.0.1': {} }
      }]
    }
  }
  mr({ port: 1331, mocks }, (err, s) => {
    server = s
  })
  t.done()
})

t.test('should log package info', (t) => {
  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      flatOptions: {
        defaultTag: '1.0.1',
        registry: REG, 
        global: false
      }
    }
  })
  view(['mkdirp@0.3.5'], () => {
    t.matchSnapshot(logs)
    t.end()
  })
})

t.test('should log info of package in current working dir', (t) => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'underscore',
      version: '1.3.1'
    }, null, 2)
  })

  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      prefix: testDir,
      flatOptions: {
        defaultTag: '1.3.1',
        global: false
      }
    }
  })
  view(['.@1.3.1'], () => {
    t.matchSnapshot(logs)
    t.end()
  })
})

t.test('should log info by field name', (t) => {
  const testDir = t.testdir({
    'package.json': JSON.stringify({
      name: 'underscore',
      version: '1.3.1'
    }, null, 2)
  })

  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      prefix: testDir,
      flatOptions: {
        defaultTag: '1.3.1',
        global: false
      }
    }
  })
  view(['underscore@1.3.1', 'readme'], () => {
    t.ok(logs.length, 'readme is displayed on console')
    t.end()
  })
})

t.test('throw error if global mode', (t) => {
  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      flatOptions: {
        global: true
      }
    }
  })
  view([], (err) => {
    t.equals(err.message, 'Cannot use view command in global mode.')
    t.end()
  })
})

t.test('throw error if invalid package.json', (t) => {
  const testDir = t.testdir({
    'package.json': '{}'
  })

  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      prefix: testDir,
      flatOptions: {
        global: false
      }
    }
  })
  view([], (err) => {
    t.equals(err.message, 'Invalid package.json')
    t.end()
  })
})

t.test('throws when unpublished', (t) => {
  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      flatOptions: {
        defaultTag: '1.0.1',
        registry: REG, 
        global: false
      }
    }
  })
  view(['mypackage'], (err) => {
    t.equals(err.code, 'E404')
    t.end()
  })
})

t.test('should be silent', (t) => {
  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      flatOptions: {
        defaultTag: '1.0.1',
        registry: REG, 
        global: false
      }
    }
  })
  view(['my-other-package'], true, (err) => {
    t.notOk(logs.length, 'no logs')
    t.end()
  })
})

t.test('displays warning when version does not exist', (t) => {
  const view = requireInject('../../lib/view.js', {
    '../../lib/npm.js': {
      flatOptions: {
        defaultTag: '1.0.1',
        registry: REG, 
        global: false
      }
    }
  })

  const msg = '\nNo matching versions.\n' +
  'To see a list of versions, run:\n' +
  `> npm view mkdirp versions`

  view(['mkdirp@0.3.6'], () => {
    t.equals(logs, msg, 'displays warning')
    t.end()
  })
})

t.test('cleanup', function (t) {
  server.close()
  t.done()
})